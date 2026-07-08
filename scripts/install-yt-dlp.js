import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const targetPath = path.join(process.cwd(), 'yt-dlp');

console.log('--- YouTube Auto Republisher: Installing yt-dlp ---');
console.log(`Target location: ${targetPath}`);

async function install() {
  try {
    // 1. Download binary using curl
    console.log('Downloading yt-dlp from official GitHub releases...');
    execSync(`curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o "${targetPath}"`, { stdio: 'inherit' });
    
    // 2. Grant execution permissions
    console.log('Setting execution permissions (chmod +x)...');
    execSync(`chmod +x "${targetPath}"`, { stdio: 'inherit' });

    // 3. Verify it works
    console.log('Verifying yt-dlp installation...');
    const version = execSync(`"${targetPath}" --version`, { encoding: 'utf8' }).trim();
    console.log(`yt-dlp is successfully installed and verified! Version: ${version}`);
  } catch (error) {
    console.error('CRITICAL: Failed to automatically install yt-dlp binary:', error);
    // Do not crash the build to avoid blocking deployment if network is restricted,
    // as the backend has a graceful runtime fallback mechanism.
  }
}

install();
