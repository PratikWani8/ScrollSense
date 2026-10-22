import { build } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(rootDir, 'dist');

async function runBuild() {
  console.log('🚀 Building ScrollSense Chrome Extension MV3...');

  // Ensure clean dist directory
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  // 1. Build Background Service Worker (ES module)
  console.log('📦 Building Background Service Worker...');
  await build({
    root: rootDir,
    configFile: false,
    build: {
      outDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(rootDir, 'src/background/service-worker.ts'),
        formats: ['es'],
        fileName: () => 'background.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  // 2. Build Content Script - Instagram (IIFE standalone)
  console.log('📦 Building Instagram Content Script...');
  await build({
    root: rootDir,
    configFile: false,
    build: {
      outDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(rootDir, 'src/content/instagram/detector.ts'),
        name: 'ScrollSenseInstagramDetector',
        formats: ['iife'],
        fileName: () => 'content-instagram.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  // 3. Build Content Script - YouTube (IIFE standalone)
  console.log('📦 Building YouTube Content Script...');
  await build({
    root: rootDir,
    configFile: false,
    build: {
      outDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(rootDir, 'src/content/youtube/detector.ts'),
        name: 'ScrollSenseYouTubeDetector',
        formats: ['iife'],
        fileName: () => 'content-youtube.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  // 4. Build Popup UI
  console.log('📦 Building Popup UI...');
  await build({
    root: path.resolve(rootDir, 'src/popup'),
    configFile: false,
    base: '',
    build: {
      outDir,
      emptyOutDir: false,
      rollupOptions: {
        input: path.resolve(rootDir, 'src/popup/popup.html'),
        output: {
          entryFileNames: 'popup.js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              return 'popup.css';
            }
            return 'assets/[name].[ext]';
          },
        },
      },
    },
  });

  // 5. Copy manifest.json and icons
  console.log('📄 Copying manifest.json and icons...');
  fs.copyFileSync(
    path.resolve(rootDir, 'manifest.json'),
    path.resolve(outDir, 'manifest.json')
  );

  const iconsSrcDir = path.resolve(rootDir, 'src/icons');
  const iconsDistDir = path.resolve(outDir, 'icons');
  if (!fs.existsSync(iconsDistDir)) {
    fs.mkdirSync(iconsDistDir, { recursive: true });
  }

  const iconFiles = fs.readdirSync(iconsSrcDir);
  for (const file of iconFiles) {
    fs.copyFileSync(
      path.join(iconsSrcDir, file),
      path.join(iconsDistDir, file)
    );
  }

  console.log('✅ Extension build completed successfully in dist/');
}

runBuild().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
