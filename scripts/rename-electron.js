const fs = require('fs');
const path = require('path');

const distElectronPath = path.join(__dirname, '..', 'dist-electron');

// Renomear main.js para main.cjs
const mainJsPath = path.join(distElectronPath, 'main.js');
const mainCjsPath = path.join(distElectronPath, 'main.cjs');

if (fs.existsSync(mainJsPath)) {
  fs.renameSync(mainJsPath, mainCjsPath);
  console.log('Renamed main.js to main.cjs');
}

// Renomear preload.js para preload.cjs
const preloadJsPath = path.join(distElectronPath, 'preload.js');
const preloadCjsPath = path.join(distElectronPath, 'preload.cjs');

if (fs.existsSync(preloadJsPath)) {
  fs.renameSync(preloadJsPath, preloadCjsPath);
  console.log('Renamed preload.js to preload.cjs');
}