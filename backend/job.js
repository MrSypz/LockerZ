import { execSync } from 'child_process';
import fs from 'fs';

const ext = process.platform === 'win32' ? '.exe' : '';

const rustInfo = execSync('rustc -vV');
const targetTriple = /host: (\S+)/g.exec(rustInfo)[1];
if (!targetTriple) {
    logger.info('Failed to determine platform target triple');
}
fs.renameSync(
    `dist/app${ext}`,
    `../frontend/src-tauri/binaries/zaphire-${targetTriple}${ext}`
);