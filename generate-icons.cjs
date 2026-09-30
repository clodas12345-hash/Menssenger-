const fs = require('fs');
const path = require('path');

// Garante que a pasta assets existe
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Copia public/logo.jpg para assets/icon.png (se existir)
const logoPath = path.join(__dirname, 'public', 'logo.jpg');
const targetIconPath = path.join(assetsDir, 'icon.png');

if (fs.existsSync(logoPath)) {
  fs.copyFileSync(logoPath, targetIconPath);
  console.log('Ícone copiado para assets/icon.png com sucesso!');
} else {
  console.warn('public/logo.jpg não encontrado.');
}
