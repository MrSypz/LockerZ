const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3001;

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
      return { folderPath: path.join(process.env.USERPROFILE || process.env.HOME, 'Documents', 'LockerZ') };
    }
    console.error('Error reading config file:', error);
    throw error;
  }
}

// Function to write the config file
async function writeConfig(config) {
  console.log('Attempting to write config file...');
  try {
    await fs.mkdir(configDir, { recursive: true });
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

// Async function to initialize the server
async function initializeServer() {
  try {
    config = await readConfig();
    rootFolderPath = config.folderPath;
    console.log('Initial root folder path:', rootFolderPath);

    // Ensure the root folder exists
    await fs.mkdir(rootFolderPath, { recursive: true });

    // If config doesn't exist, create it
    if (!await fs.access(configPath).then(() => true).catch(() => false)) {
      await writeConfig(config);
    }

    // Start the server
    app.listen(port, () => {
      console.log(`Backend server running on http://localhost:${port}`);
      console.log(`Config file location: ${configPath}`);
    });
  } catch (error) {
    console.error('Error initializing server:', error);
    process.exit(1);
  }
}
// ,
app.get('/files', async (req, res) => {
  try {
    const files = await fs.readdir(rootFolderPath);
    res.json(files.map(file => ({ name: file })));
  } catch (err) {
    console.error('Error reading files:', err);
    res.status(500).json({ error: 'Error reading files' });
  }
});

app.get('/categories', async (req, res) => {
  try {
    const entries = await fs.readdir(rootFolderPath, { withFileTypes: true });
    const categories = entries
      .filter(entry => entry.isDirectory())
      .map(dir => ({ name: dir.name }));
    res.json(categories);
  } catch (err) {
    console.error('Error reading categories:', err);
    res.status(500).json({ error: 'Error reading categories' });
  }
});

app.get('/get-folder-path', (req, res) => {
  res.json({ folderPath: rootFolderPath });
});

app.post('/update-folder-path', async (req, res) => {
  const { folderPath } = req.body;
  console.log('Received request to update folder path to:', folderPath);
  try {
    await fs.access(folderPath);
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

// Initialize the server
initializeServer();

