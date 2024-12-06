const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const NodeCache = require('node-cache');

const app = express();
const port = 3001;
const cache = new NodeCache({stdTTL: 600}); // Cache for 10 minutes

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

app.use(cors());
app.use(express.json());

// Define the path for the config file
const configDir = path.join(process.env.APPDATA || process.env.HOME, 'lockerz', 'config');
const configPath = path.join(configDir, 'config.json');

console.log('Config directory:', configDir);
console.log('Config file path:', configPath);

// Function to read the config file
async function readConfig() {
    console.log('Attempting to read config file...');
    try {
        await fs.access(configPath);
        console.log('Config file exists, reading...');
        const configData = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(configData);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Config file does not exist, returning default config');
            return {
                folderPath: path.join(process.env.USERPROFILE || process.env.HOME, 'Documents', 'LockerZ'),
                rememberCategory: true,
                rememberPage: true,
                currentPage: 10
            };
        }
        console.error('Error reading config file:', error);
        throw error;
    }
}

// Function to write the config file
async function writeConfig(config) {
    console.log('Attempting to write config file...');
    try {
        await fs.mkdir(configDir, {recursive: true});
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        console.log('Config file written successfully');
    } catch (error) {
        console.error('Error writing config file:', error);
        throw error;
    }
}

// Initialize rootFolderPath from config
let config;
let rootFolderPath;

// Set up multer for file uploads
const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({storage: storage});

// Function to get file size in bytes
async function getFileSize(filePath) {
    const stats = await fs.stat(filePath);
    return stats.size;
}

// Function to get directory size and file count
async function getDirStats(dirPath) {
    let totalSize = 0;
    let fileCount = 0;
    const items = await fs.readdir(dirPath, {withFileTypes: true});

    for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        if (item.isFile()) {
            totalSize += await getFileSize(itemPath);
            fileCount++;
        } else if (item.isDirectory()) {
            const {size, count} = await getDirStats(itemPath);
            totalSize += size;
            fileCount += count;
        }
    }

    return {size: totalSize, count: fileCount};
}

// Async function to initialize the server
async function initializeServer() {
    try {
        config = await readConfig();
        rootFolderPath = config.folderPath;
        console.log('Initial root folder path:', rootFolderPath);

        // Ensure the root folder and temp folder exist
        await fs.mkdir(rootFolderPath, {recursive: true});
        await fs.mkdir(path.join(rootFolderPath, 'temp'), {recursive: true});

        // If config doesn't exist, create it
        if (!await fs.access(configPath).then(() => true).catch(() => false)) {
            await writeConfig(config);
        }

        // Serve static files
        app.use('/images', express.static(rootFolderPath));

        // Start the server
        app.listen(port, () => {
            console.log(`Backend server running on http://localhost:${port}`);
            console.log(`Config file location: ${configPath}`);
        });
    } catch (error) {
        console.error('Error initializing server:', error);
        console.error('Root folder path:', rootFolderPath);
        process.exit(1);
    }
}

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
        const categories = await fs.readdir(rootFolderPath, {withFileTypes: true});

        for (const cat of categories) {
            if (cat.isDirectory() && (category === 'all' || cat.name === category) && cat.name !== 'temp') {
                const categoryPath = path.join(rootFolderPath, cat.name);
                const categoryFiles = await fs.readdir(categoryPath);

                for (const file of categoryFiles) {
                    const filePath = path.join(categoryPath, file);
                    const stats = await fs.stat(filePath);
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
        res.status(500).json({error: 'Error reading files'});
    }
});

app.get('/categories', async (req, res) => {
    try {
        const entries = await fs.readdir(rootFolderPath, {withFileTypes: true});
        const categories = await Promise.all(entries
            .filter(entry => entry.isDirectory() && entry.name !== 'temp')
            .map(async (dir) => {
                const dirPath = path.join(rootFolderPath, dir.name);
                const {size, count} = await getDirStats(dirPath);
                return {
                    name: dir.name,
                    fileCount: count,
                    size: size
                };
            }));
        res.json(categories);
    } catch (err) {
        console.error('Error reading categories:', err);
        res.status(500).json({error: 'Error reading categories'});
    }
});

app.get('/stats', async (req, res) => {
    try {
        const {size, count} = await getDirStats(rootFolderPath);
        const entries = await fs.readdir(rootFolderPath, {withFileTypes: true});
        const categoriesCount = entries.filter(entry => entry.isDirectory() && entry.name !== 'temp').length;

        res.json({
            totalImages: count,
            categories: categoriesCount,
            storageUsed: size
        });
    } catch (err) {
        console.error('Error getting stats:', err);
        res.status(500).json({error: 'Error getting stats'});
    }
});

app.get('/get-folder-path', (req, res) => {
    res.json({folderPath: rootFolderPath});
});

app.post('/update-folder-path', async (req, res) => {
    const {folderPath} = req.body;
    console.log('Received request to update folder path to:', folderPath);
    try {
        await fs.access(folderPath);
        rootFolderPath = folderPath;
        config.folderPath = folderPath;
        await writeConfig(config);
        console.log('Folder path updated successfully');
        res.json({success: true});
    } catch (error) {
        console.error('Error updating folder path:', error);
        res.status(400).json({success: false, message: 'Invalid folder path or permission denied'});
    }
});
app.get('/get-settings', async (req, res) => {
    try {
        const config = await readConfig();
        res.json(config);
    } catch (error) {
        console.error('Error reading settings:', error);
        res.status(500).json({error: 'Failed to read settings'});
    }
});

app.post('/update-settings', async (req, res) => {
    try {
        const config = await readConfig();
        const updatedConfig = {...config, ...req.body};
        await writeConfig(updatedConfig);
        res.json({success: true});
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({error: 'Failed to update settings'});
    }
});


app.post('/rename-category', async (req, res) => {
    const {oldName, newName} = req.body;
    const oldPath = path.join(rootFolderPath, oldName);
    const newPath = path.join(rootFolderPath, newName);

    try {
        await fs.rename(oldPath, newPath);
        clearRelevantCaches([oldName, newName]);
        res.json({success: true});
    } catch (error) {
        console.error('Error renaming category:', error);
        res.status(500).json({error: 'Failed to rename category'});
    }
});

app.post('/delete-category', async (req, res) => {
    const {name} = req.body;
    const categoryPath = path.join(rootFolderPath, name);

    try {
        await fs.rm(categoryPath, {recursive: true});
        clearRelevantCaches([name]);
        res.json({success: true});
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({error: 'Failed to delete category'});
    }
});


app.post('/create-category', async (req, res) => {
    const {name} = req.body;
    const categoryPath = path.join(rootFolderPath, name);

    try {
        await fs.mkdir(categoryPath);
        clearRelevantCaches();
        res.json({success: true});
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({error: 'Failed to create category'});
    }
});
app.post('/move-file', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({error: 'No file provided'});
    }

    const category = req.body.category || 'uncategorized';
    const tempPath = req.file.path;
    console.log(tempPath);
    const targetPath = path.join(rootFolderPath, category, req.file.filename);

    try {
        await fs.mkdir(path.join(rootFolderPath, category), {recursive: true});
        await fs.copyFile(tempPath, targetPath);
        await fs.unlink(tempPath);

        const stats = await fs.stat(targetPath);

        clearRelevantCaches([category]);

        res.json({
            success: true,
            file: {
                name: req.file.filename,
                category: category,
                url: `/images/${category}/${req.file.filename}`,
                size: stats.size,
                createdAt: stats.birthtime
            }
        });
    } catch (error) {
        console.error('Error moving file:', error);
        try {
            await fs.unlink(targetPath);
        } catch (cleanupError) {
            console.error('Error during cleanup:', cleanupError);
        }
        res.status(500).json({error: 'Failed to move file', details: error.message});
    }
});

app.post('/delete-file', async (req, res) => {
    const {category, name} = req.body;
    const filePath = path.join(rootFolderPath, category, name);

    try {
        await fs.unlink(filePath);
        clearRelevantCaches([category]);
        console.log(`File deleted: ${filePath}`);
        console.log('Related caches cleared');
        res.json({success: true});
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({error: 'Failed to delete file'});
    }
});

app.post('/move-file-category', async (req, res) => {
    const {oldCategory, newCategory, fileName} = req.body;
    const oldPath = path.join(rootFolderPath, oldCategory, fileName);
    const newPath = path.join(rootFolderPath, newCategory, fileName);

    try {
        await fs.mkdir(path.join(rootFolderPath, newCategory), {recursive: true});
        await fs.rename(oldPath, newPath);
        clearRelevantCaches([oldCategory, newCategory]);
        res.json({success: true});
    } catch (error) {
        console.error('Error moving file:', error);
        res.status(500).json({error: 'Failed to move file'});
    }
});


// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Initialize the server
initializeServer();

