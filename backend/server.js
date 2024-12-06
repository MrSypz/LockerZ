const express = require('express');
const cors = require('cors');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const busboy = require('busboy');
const NodeCache = require('node-cache');

const app = express();
const port = 3001;
const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

// Middleware
app.use(cors());
app.use(express.json());

// Config paths
const configDir = path.join(process.env.APPDATA || process.env.HOME, 'lockerz', 'config');
const configPath = path.join(configDir, 'config.json');

console.log('Config directory:', configDir);
console.log('Config file path:', configPath);

// Helper functions
function clearRelevantCaches(categories = []) {
    const keys = cache.keys();
    for (const key of keys) {
        if (key.startsWith('files_') || categories.some(cat => key.includes(cat))) {
            cache.del(key);
        }
    }
    cache.del('categories');
    cache.del('stats');
}

async function readConfig() {
    try {
        await fsPromises.access(configPath);
        const configData = await fsPromises.readFile(configPath, 'utf-8');
        return JSON.parse(configData);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {
                folderPath: path.join(process.env.USERPROFILE || process.env.HOME, 'Documents', 'LockerZ'),
                rememberCategory: true,
                rememberPage: true,
                currentPage: 10
            };
        }
        throw error;
    }
}

async function writeConfig(config) {
    try {
        await fsPromises.mkdir(configDir, { recursive: true });
        await fsPromises.writeFile(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
        throw error;
    }
}

async function getFileSize(filePath) {
    const stats = await fsPromises.stat(filePath);
    return stats.size;
}

async function getDirStats(dirPath) {
    let totalSize = 0;
    let fileCount = 0;
    const items = await fsPromises.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        if (item.isFile()) {
            totalSize += await getFileSize(itemPath);
            fileCount++;
        } else if (item.isDirectory()) {
            const { size, count } = await getDirStats(itemPath);
            totalSize += size;
            fileCount += count;
        }
    }

    return { size: totalSize, count: fileCount };
}

// Server initialization
let config;
let rootFolderPath;

async function initializeServer() {
    try {
        config = await readConfig();
        rootFolderPath = config.folderPath;
        console.log('Initial root folder path:', rootFolderPath);

        await fsPromises.mkdir(rootFolderPath, { recursive: true });
        await fsPromises.mkdir(path.join(rootFolderPath, 'temp'), { recursive: true });

        if (!await fsPromises.access(configPath).then(() => true).catch(() => false)) {
            await writeConfig(config);
        }

        app.use('/images', express.static(rootFolderPath));

        app.listen(port, () => {
            console.log(`Backend server running on http://localhost:${port}`);
            console.log(`Config file location: ${configPath}`);
        });
    } catch (error) {
        console.error('Error initializing server:', error);
        process.exit(1);
    }
}

// Routes
app.get('/files', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const category = req.query.category || 'all';

    const cacheKey = `files_${category}_${page}_${limit}`;
    const cachedResult = cache.get(cacheKey);

    if (cachedResult) {
        return res.json(cachedResult);
    }

    try {
        let files = [];
        const categories = await fsPromises.readdir(rootFolderPath, { withFileTypes: true });

        for (const cat of categories) {
            if (cat.isDirectory() && (category === 'all' || cat.name === category) && cat.name !== 'temp') {
                const categoryPath = path.join(rootFolderPath, cat.name);
                const categoryFiles = await fsPromises.readdir(categoryPath);

                for (const file of categoryFiles) {
                    const filePath = path.join(categoryPath, file);
                    const stats = await fsPromises.stat(filePath);
                    files.push({
                        name: file,
                        category: cat.name,
                        url: `/images/${cat.name}/${file}`,
                        size: stats.size,
                        createdAt: stats.birthtime
                    });
                }
            }
        }

        const totalFiles = files.length;
        const totalPages = Math.ceil(totalFiles / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const paginatedFiles = files.slice(startIndex, endIndex);

        const result = {
            files: paginatedFiles,
            currentPage: page,
            totalPages: totalPages,
            totalFiles: totalFiles
        };

        cache.set(cacheKey, result);

        res.json(result);
    } catch (err) {
        console.error('Error reading files:', err);
        res.status(500).json({ error: 'Error reading files' });
    }
});

app.get('/categories', async (req, res) => {
    try {
        const entries = await fsPromises.readdir(rootFolderPath, { withFileTypes: true });
        const categories = await Promise.all(entries
            .filter(entry => entry.isDirectory() && entry.name !== 'temp')
            .map(async (dir) => {
                const dirPath = path.join(rootFolderPath, dir.name);
                const { size, count } = await getDirStats(dirPath);
                return {
                    name: dir.name,
                    fileCount: count,
                    size: size
                };
            }));
        res.json(categories);
    } catch (err) {
        console.error('Error reading categories:', err);
        res.status(500).json({ error: 'Error reading categories' });
    }
});

app.get('/stats', async (req, res) => {
    try {
        const { size, count } = await getDirStats(rootFolderPath);
        const entries = await fsPromises.readdir(rootFolderPath, { withFileTypes: true });
        const categoriesCount = entries.filter(entry => entry.isDirectory() && entry.name !== 'temp').length;

        res.json({
            totalImages: count,
            categories: categoriesCount,
            storageUsed: size
        });
    } catch (err) {
        console.error('Error getting stats:', err);
        res.status(500).json({ error: 'Error getting stats' });
    }
});

app.get('/get-folder-path', (req, res) => {
    res.json({ folderPath: rootFolderPath });
});

app.post('/update-folder-path', async (req, res) => {
    const { folderPath } = req.body;
    console.log('Received request to update folder path to:', folderPath);
    try {
        await fsPromises.access(folderPath);
        rootFolderPath = folderPath;
        config.folderPath = folderPath;
        await writeConfig(config);
        console.log('Folder path updated successfully');
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating folder path:', error);
        res.status(400).json({ success: false, message: 'Invalid folder path or permission denied' });
    }
});

app.get('/get-settings', async (req, res) => {
    try {
        const config = await readConfig();
        res.json(config);
    } catch (error) {
        console.error('Error reading settings:', error);
        res.status(500).json({ error: 'Failed to read settings' });
    }
});

app.post('/update-settings', async (req, res) => {
    try {
        const config = await readConfig();
        const updatedConfig = { ...config, ...req.body };
        await writeConfig(updatedConfig);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

app.post('/rename-category', async (req, res) => {
    const { oldName, newName } = req.body;
    const oldPath = path.join(rootFolderPath, oldName);
    const newPath = path.join(rootFolderPath, newName);

    try {
        await fsPromises.rename(oldPath, newPath);
        clearRelevantCaches([oldName, newName]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error renaming category:', error);
        res.status(500).json({ error: 'Failed to rename category' });
    }
});

app.post('/delete-category', async (req, res) => {
    const { name } = req.body;
    const categoryPath = path.join(rootFolderPath, name);

    try {
        await fsPromises.rm(categoryPath, { recursive: true });
        clearRelevantCaches([name]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

app.post('/create-category', async (req, res) => {
    const { name } = req.body;
    const categoryPath = path.join(rootFolderPath, name);

    try {
        await fsPromises.mkdir(categoryPath);
        clearRelevantCaches();
        res.json({ success: true });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

app.post('/move-file', (req, res) => {
    const bb = busboy({ headers: req.headers });
    let fileToUpload;
    let fileName;
    let category;
    let originalPath;
    let fileReceived = false;

    bb.on('file', (name, file, info) => {
        fileName = info.filename;
        originalPath = info.filepath; // Store the original file path
        const saveTo = path.join(rootFolderPath, 'temp', fileName);
        fileToUpload = { saveTo, file };
        fileReceived = true;

        const writeStream = fs.createWriteStream(saveTo);
        file.pipe(writeStream);

        writeStream.on('finish', () => {
            console.log('File write completed');
        });

        writeStream.on('error', (err) => {
            console.error('Error writing file:', err);
        });
    });

    bb.on('field', (name, val) => {
        if (name === 'category') {
            category = val;
        }
    });

    bb.on('finish', async () => {
        if (!fileReceived) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const targetDir = path.join(rootFolderPath, category || 'uncategorized');
        const targetPath = path.join(targetDir, fileName);

        try {
            await fsPromises.mkdir(targetDir, { recursive: true });
            await fsPromises.rename(fileToUpload.saveTo, targetPath);
            const stats = await fsPromises.stat(targetPath);
            clearRelevantCaches([category]);

            // Store the original path in a separate file
            const metaFilePath = targetPath + '.meta';
            if (originalPath) {
                await fsPromises.writeFile(metaFilePath, originalPath);
            } else {
                console.warn(`Original path not available for file: ${fileName}`);
            }

            res.json({
                success: true,
                file: {
                    name: fileName,
                    category: category || 'uncategorized',
                    url: `/images/${category || 'uncategorized'}/${fileName}`,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    originalPath: originalPath || 'Not available'
                }
            });
        } catch (error) {
            console.error('Error moving file:', error);
            res.status(500).json({ error: 'Failed to move file', details: error.message });
        }
    });

    bb.on('error', (err) => {
        console.error('Busboy error:', err);
        res.status(500).json({ error: 'File upload failed', details: err.message });
    });

    req.pipe(bb);
});


app.post('/delete-file', async (req, res) => {
    const { category, name } = req.body;
    const filePath = path.join(rootFolderPath, category, name);

    try {
        await fsPromises.unlink(filePath);
        clearRelevantCaches([category]);
        console.log(`File deleted: ${filePath}`);
        console.log('Related caches cleared');
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

app.post('/move-file-category', async (req, res) => {
    const { oldCategory, newCategory, fileName } = req.body;
    const oldPath = path.join(rootFolderPath, oldCategory, fileName);
    const newPath = path.join(rootFolderPath, newCategory, fileName);

    try {
        await fsPromises.mkdir(path.join(rootFolderPath, newCategory), { recursive: true });
        await fsPromises.rename(oldPath, newPath);
        clearRelevantCaches([oldCategory, newCategory]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error moving file:', error);
        res.status(500).json({ error: 'Failed to move file' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Initialize the server
initializeServer();

module.exports = app;

console.log("Server code updated successfully!");