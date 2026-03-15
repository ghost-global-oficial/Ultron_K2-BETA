const fs = require('fs');
const path = require('path');

function renameJsToCjs(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      renameJsToCjs(fullPath);
    } else if (file.endsWith('.js')) {
      const newPath = fullPath.replace('.js', '.cjs');
      fs.renameSync(fullPath, newPath);
      console.log(`Renamed ${fullPath} to ${newPath}`);
    }
  }
}

const distElectronDir = path.join(__dirname, '..', 'dist-electron');
if (fs.existsSync(distElectronDir)) {
  renameJsToCjs(distElectronDir);
  console.log('Electron files renamed to .cjs');
}