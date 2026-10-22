import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const zipOutDir = path.resolve(rootDir, 'dist-zip');

async function packageExtension() {
  console.log('📦 Starting ScrollSense Chrome Web Store Packaging...');

  // 1. Verify dist files exist
  const manifestPath = path.join(distDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json not found in dist/. Please run "npm run build" first.');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const version = manifest.version || '1.0.0';
  const zipName = `scrollsense-extension-v${version}.zip`;

  if (!fs.existsSync(zipOutDir)) {
    fs.mkdirSync(zipOutDir, { recursive: true });
  }

  const zipFilePath = path.join(zipOutDir, zipName);
  if (fs.existsSync(zipFilePath)) {
    fs.unlinkSync(zipFilePath);
  }

  // 2. Validate required assets
  const requiredFiles = [
    'manifest.json',
    'background.js',
    'content-instagram.js',
    'content-youtube.js',
    'popup.html',
    'popup.js',
    'popup.css',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png',
  ];

  for (const rel of requiredFiles) {
    const full = path.join(distDir, rel);
    if (!fs.existsSync(full)) {
      throw new Error(`Missing required distribution file: ${rel}`);
    }
  }

  console.log(`✅ Verified all required distribution assets for version v${version}`);

  // 3. Create zip file using cross-platform method
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    const psCmd = `powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipFilePath}' -Force"`;
    execSync(psCmd, { stdio: 'inherit' });
  } else {
    execSync(`cd "${distDir}" && zip -r "${zipFilePath}" .`, { stdio: 'inherit' });
  }

  const stats = fs.statSync(zipFilePath);
  const sizeKb = (stats.size / 1024).toFixed(2);

  console.log(`🎉 Successfully generated Chrome Web Store package!`);
  console.log(`📁 File: ${zipFilePath} (${sizeKb} KB)`);
  console.log(`🚀 Ready for upload at https://chrome.google.com/webstore/devconsole`);
}

packageExtension().catch((err) => {
  console.error('❌ Packaging failed:', err.message);
  process.exit(1);
});
