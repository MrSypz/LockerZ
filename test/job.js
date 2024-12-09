import { execSync } from 'child_process';
import fs from 'fs';

// Platform-specific extension
const ext = process.platform === 'win32' ? '.exe' : '';

// Get Rust target triple
try {
    const rustInfo = execSync('rustc -vV', { encoding: 'utf8' });
    const targetTriple = /host: (\S+)/.exec(rustInfo)?.[1];

    if (!targetTriple) {
        console.error('Failed to determine platform target triple');
        process.exit(1);
    }

    // Rename the binary file
    const oldPath = `app${ext}`;
    const newPath = `../frontend/src-tauri/binaries/app-${targetTriple}${ext}`;

    if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`Renamed ${oldPath} to ${newPath}`);
    } else {
        console.error(`File not found: ${oldPath}`);
    }
} catch (error) {
    console.error('An error occurred:', error.message);
    process.exit(1);
}
