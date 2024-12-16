const express = require('express');
const cors = require('cors');
const fsPromises = require('fs').promises;
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const NodeCache = require('node-cache');
const archiver = require('archiver');
const app = express();
const port = 3001;
const cache = new NodeCache({stdTTL: 600}); // Cache for 10 minutes

// Middleware
app.use(cors());
app.use(express.json());

// Config paths
const configDir = path.join(process.env.APPDATA || process.env.HOME, 'lockerz', 'config');
const configPath = path.join(configDir, 'config.json');

const defaultConfig = {
    folderPath: path.join(process.env.USERPROFILE || process.env.HOME, 'Documents', 'LockerZ'),
    rememberCategory: true,
    lang: "en",
    imageQuality: 75,
    imageWidth: 1920,
    imageHeight: 1080
};

class Logger {
    constructor(logDir) {
        this.logDir = logDir;
        this.latestLogFile = path.join(logDir, 'latest.log');
        this.sessionStartTime = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        this.maxLogFiles = 10;

        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, {recursive: true});
        }

        fs.writeFileSync(this.latestLogFile, '');

        this.log('Logging session started');
    }

    log(message, logType = 'info') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${logType.toUpperCase()}] ${timestamp}: ${message}\n`;
        fs.appendFileSync(this.latestLogFile, logMessage);
        console.log(logMessage.trim()); // Also log to console
    }

    info(message) {
        this.log(message, 'info');
    }

    warn(message) {
        this.log(message, 'warn');
    }

    error(message) {
        this.log(message, 'error');
    }

    debug(message) {
        this.log(message, 'debug');
    }

    pre(message) {
        this.log(message, 'pre');
    }

    async archiveLog() {
        const archiveName = `log_${this.sessionStartTime}.zip`;
        const output = fs.createWriteStream(path.join(this.logDir, archiveName));
        const archive = archiver('zip', {
            zlib: {level: 9} // Sets the compression level
        });

        output.on('close', () => {
            this.log(`Log archived: ${archiveName}`);
            fs.writeFileSync(this.latestLogFile, '');
            this.cleanupOldLogs();
        });

        archive.on('error', (err) => {
            this.error(err);
        });

        archive.pipe(output);
        archive.file(this.latestLogFile, {name: `log_${this.sessionStartTime}.log`});
        await archive.finalize();
    }

    cleanupOldLogs() {
        const files = fs.readdirSync(this.logDir)
            .filter(file => file.startsWith('log_') && file.endsWith('.zip'))
            .map(file => ({ name: file, time: fs.statSync(path.join(this.logDir, file)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        if (files.length > this.maxLogFiles) {
            files.slice(this.maxLogFiles).forEach(file => {
                fs.unlinkSync(path.join(this.logDir, file.name));
                console.log(`Deleted old log: ${file.name}`);
            });
        }
    }
}

const logger = new Logger(path.join(process.env.APPDATA, 'lockerz', 'logs'));


let config;
let rootFolderPath;

logger.pre('Config directory:' + configDir);
logger.pre('Config file path:' + configPath);

// Helper functions
function clearRelevantCaches(categories = []) {
    const keys = cache.keys();
    new Set(categories);
    keys.forEach(key => {
        if (key.startsWith('files_') || categories.some(cat => key.includes(cat))) {
            cache.del(key);
        }
    });
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
            return defaultConfig;
        }
        throw error;
    }
}

async function writeConfig(config) {
    await fsPromises.mkdir(configDir, {recursive: true});
    await fsPromises.writeFile(configPath, JSON.stringify(config, null, 2));
}

async function getDirStats(dirPath) {
    const items = await fsPromises.readdir(dirPath, {withFileTypes: true});
    let [totalSize, fileCount] = await items.reduce(async (accPromise, item) => {
        const [accSize, accCount] = await accPromise;
        const itemPath = path.join(dirPath, item.name);
        if (item.isFile()) {
            const stats = await fsPromises.stat(itemPath);
            return [accSize + stats.size, accCount + 1];
        } else if (item.isDirectory()) {
            const {size, count} = await getDirStats(itemPath);
            return [accSize + size, accCount + count];
        }
        return [accSize, accCount];
    }, Promise.resolve([0, 0]));

    return {size: totalSize, count: fileCount};
}

// let exitRequested = false;

process.stdin.on('data', async (data) => {
    const input = data.toString().trim();
    logger.info(`Received input: ${input}`);
    if (input === 'exit') {
        logger.info('Exit signal received. Shutting down...');
        // exitRequested = true;
        logger.info('Process exiting...');
        logger.info('Application is shutting down');
        await logger.archiveLog();
        process.exit(); // Exit the Node.js process
    }
});
process.on('exit', () => {
    console.log('Process exiting...');
});
process.on('SIGINT', async () => {
    console.log('Caught interrupt signal');
    logger.info('Application is shutting down');
    await logger.archiveLog();
    process.exit();
});

logger.info('Sidecar process started');

async function initializeServer() {
    try {
        config = await readConfig();
        rootFolderPath = config.folderPath;
        logger.pre('Initial root folder path:' + rootFolderPath);

        await fsPromises.mkdir(rootFolderPath, {recursive: true});
        await fsPromises.mkdir(path.join(rootFolderPath, 'temp'), {recursive: true});

        if (!await fsPromises.access(configPath).then(() => true).catch(() => false)) {
            await writeConfig(config);
        }

        app.use('/images', express.static(rootFolderPath));

        app.listen(port, () => {
            logger.pre(`Backend server running on http://localhost:${port}`);
            logger.pre(`Config file location: ${configPath}`);
        });
    } catch (error) {
        logger.error('Error initializing server:' + error);
        process.exit(1);
    }
}

// Routes
app.get('/files', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = req.query.limit === 'no-limit' ? null : parseInt(req.query.limit) || 20; // Handle "no-limit"
    const category = req.query.category || 'all';

    const cacheKey = `files_${category}_${page}_${limit || 'no-limit'}`;
    const cachedResult = cache.get(cacheKey);

    if (cachedResult) {
        return res.json(cachedResult);
    }

    try {
        const categories = await fsPromises.readdir(rootFolderPath, { withFileTypes: true });
        const files = await Promise.all(
            categories
                .filter(cat => cat.isDirectory() && (category === 'all' || cat.name === category) && cat.name !== 'temp')
                .map(async (cat) => {
                    const categoryPath = path.join(rootFolderPath, cat.name);
                    const categoryFiles = await fsPromises.readdir(categoryPath);
                    return Promise.all(categoryFiles.map(async (file) => {
                        const filePath = path.join(categoryPath, file);
                        const stats = await fsPromises.stat(filePath);
                        return {
                            name: file,
                            category: cat.name,
                            url: `/images/${cat.name}/${file}`,
                            filepath: filePath,
                            size: stats.size,
                            lastModified: stats.mtime.toISOString()
                        };
                    }));
                })
        );

        const flattenedFiles = files.flat();
        const totalFiles = flattenedFiles.length;
        const totalPages = limit ? Math.ceil(totalFiles / limit) : 1; // 1 page if no limit
        const startIndex = limit ? (page - 1) * limit : 0;
        const endIndex = limit ? page * limit : totalFiles;

        const paginatedFiles = limit ? flattenedFiles.slice(startIndex, endIndex) : flattenedFiles;

        const result = {
            files: paginatedFiles,
            currentPage: limit ? page : 1,
            totalPages: limit ? totalPages : 1,
            totalFiles: totalFiles
        };

        cache.set(cacheKey, result);

        res.json(result);
    } catch (err) {
        logger.error('Error reading files:' + err);
        res.status(500).json({ error: 'Error reading files' });
    }
});

app.get('/categories', async (req, res) => {
    try {
        const entries = await fsPromises.readdir(rootFolderPath, {withFileTypes: true});
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
        logger.error('Error reading categories:' + err);
        res.status(500).json({error: 'Error reading categories'});
    }
});

app.get('/stats', async (req, res) => {
    try {
        const {size, count} = await getDirStats(rootFolderPath);
        const entries = await fsPromises.readdir(rootFolderPath, {withFileTypes: true});
        const categoriesCount = entries.filter(entry => entry.isDirectory() && entry.name !== 'temp').length;

        res.json({
            totalImages: count,
            categories: categoriesCount,
            storageUsed: size
        });
    } catch (err) {
        logger.error('Error getting stats:' + err);
        res.status(500).json({error: 'Error getting stats'});
    }
});

app.get('/get-folder-path', (req, res) => {
    res.json({folderPath: rootFolderPath});
});

app.post('/update-folder-path', async (req, res) => {
    const {folderPath} = req.body;
    logger.info('Received request to update folder path to:', folderPath);
    try {
        await fsPromises.access(folderPath);
        rootFolderPath = folderPath;
        config.folderPath = folderPath;
        await writeConfig(config);
        logger.info('Folder path updated successfully');
        res.json({success: true});
    } catch (error) {
        logger.error('Error updating folder path:' + error);
        res.status(400).json({success: false, message: 'Invalid folder path or permission denied'});
    }
});

app.get('/get-settings', async (req, res) => {
    try {
        const config = await readConfig();
        res.json(config);
    } catch (error) {
        logger.error('Error reading settings:' + error);
        res.status(500).json({error: 'Failed to read settings'});
    }
});

app.post('/update-settings', async (req, res) => {
    try {
        const newSettings = req.body;
        const currentSettings = await readConfig();
        const updatedSettings = { ...currentSettings, ...newSettings };
        await writeConfig(updatedSettings);
        if (req.body.folderPath && req.body.folderPath !== rootFolderPath) {
            rootFolderPath = req.body.folderPath;
            app.use('/images', express.static(rootFolderPath));
            clearRelevantCaches();
            logger.info(`Root folder path updated to: ${rootFolderPath}`);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
});

app.post('/rename-category', async (req, res) => {
    const {oldName, newName} = req.body;
    const oldPath = path.join(rootFolderPath, oldName);
    const newPath = path.join(rootFolderPath, newName);

    try {
        await fsPromises.rename(oldPath, newPath);
        clearRelevantCaches([oldName, newName]);
        res.json({success: true});
    } catch (error) {
        logger.error('Error renaming category:' + error);
        res.status(500).json({error: 'Failed to rename category'});
    }
});

app.post('/delete-category', async (req, res) => {
    const {name} = req.body;
    const categoryPath = path.join(rootFolderPath, name);

    try {
        await fsPromises.rm(categoryPath, {recursive: true});
        clearRelevantCaches([name]);
        res.json({success: true});
    } catch (error) {
        logger.error('Error deleting category:' + error);
        res.status(500).json({error: 'Failed to delete category'});
    }
});

app.post('/create-category', async (req, res) => {
    const {name} = req.body;
    const categoryPath = path.join(rootFolderPath, name);

    try {
        await fsPromises.mkdir(categoryPath);
        clearRelevantCaches();
        res.json({success: true});
    } catch (error) {
        logger.error('Error creating category:' + error);
        res.status(500).json({error: 'Failed to create category'});
    }
});

app.post('/move-file', async (req, res) => {
    const form = new formidable.IncomingForm({
        keepExtensions: true,
        multiples: true,
    });

    try {
        const [fields] = await form.parse(req);
        const originalPath = fields.originalPath?.[0];
        const category = fields.category?.[0] || 'uncategorized';

        if (!originalPath) {
            return res.status(400).json({ error: 'No file path provided' });
        }

        const fileName = path.basename(originalPath);
        const targetDir = path.join(rootFolderPath, category);
        const targetPath = path.join(targetDir, fileName);

        await fsPromises.mkdir(targetDir, { recursive: true });

        let stats;
        try {
            await fsPromises.rename(originalPath, targetPath);
            stats = await fsPromises.stat(targetPath);
            logger.info(`File successfully moved: ${fileName}`);
        } catch (moveError) {
            if (moveError.code === 'EXDEV') {
                await fsPromises.copyFile(originalPath, targetPath);
                stats = await fsPromises.stat(targetPath);
                try {
                    await fsPromises.unlink(originalPath);
                    logger.info(`Original file deleted after copy: ${originalPath}`);
                } catch (unlinkError) {
                    logger.error(`Failed to delete original file: ${originalPath}`, unlinkError);
                }
            } else {
                logger.error(`Error moving file: ${fileName}`, moveError);
            }
        }

        try {
            await clearRelevantCaches([category]);
            logger.info(`Cache cleared for category: ${category}`);
        } catch (cacheError) {
            logger.error(`Failed to clear cache for category: ${category}`, cacheError);
        }

        return res.json({
            success: true,
            file: {
                name: fileName,
                category,
                url: `/images/${category}/${fileName}`,
                size: stats.size,
                lastModified: stats.mtime.toISOString()
            }
        });
    } catch (error) {
        console.error(`File processing error: ${error.message}`);
        return res.status(500).json({
            error: 'Failed to process file',
            details: error.message
        });
    }
});

app.post('/delete-file', async (req, res) => {
    const {category, name} = req.body;
    const filePath = path.join(rootFolderPath, category, name);

    try {
        await fsPromises.unlink(filePath);
        clearRelevantCaches([category]);
        logger.info(`File deleted: ${filePath}`);
        logger.info('Related caches cleared');
        res.json({success: true});
    } catch (error) {
        logger.error('Error deleting file:' + error);
        res.status(500).json({error: 'Failed to delete file'});
    }
});

app.post('/move-file-category', async (req, res) => {
    const {oldCategory, newCategory, fileName} = req.body;
    const oldPath = path.join(rootFolderPath, oldCategory, fileName);
    const newPath = path.join(rootFolderPath, newCategory, fileName);

    try {
        await fsPromises.mkdir(path.join(rootFolderPath, newCategory), {recursive: true});
        await fsPromises.rename(oldPath, newPath);
        clearRelevantCaches([oldCategory, newCategory]);
        res.json({success: true});
    } catch (error) {
        logger.error('Error moving file:' + error);
        res.status(500).json({error: 'Failed to move file'});
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).send('Something broke!');
});

// Initialize the server
initializeServer();

module.exports = app;

logger.info("Server code updated successfully!");
