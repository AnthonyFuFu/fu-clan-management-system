// 由 src/assets/icon.svg 產生 electron-builder 需要的圖示：
//   icon.png（1024×1024，Linux）、icon.ico（Windows）、icon.icns（macOS）
// 用 Electron 內建的 Chromium 繪製 SVG，所以不需要額外安裝影像工具；ICO / ICNS 直接組成檔案，任何系統都能執行。
// 執行：npm run icons（「傅」字使用系統的宋體 / 襯線字型，產生的圖片會存進 repo，打包時不需要字型）
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'src', 'assets');
const SIZE = 1024;

async function renderSvg() {
  const svg = fs.readFileSync(path.join(ASSETS, 'icon.svg'), 'utf8');
  const win = new BrowserWindow({
    show: false,
    width: SIZE,
    height: SIZE,
    useContentSize: true,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    webPreferences: { offscreen: true },
  });
  // 背景透明、不出現捲軸，SVG 剛好填滿視窗
  const html = `<!doctype html><html><head><style>
    html, body { margin: 0; overflow: hidden; background: transparent; }
    svg { display: block; width: ${SIZE}px; height: ${SIZE}px; }
  </style></head><body>${svg}</body></html>`;
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await document_fonts_ready(win);
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE });
  win.destroy();
  // Retina 螢幕上擷取到的是 2 倍大小，統一縮回 1024
  return image.resize({ width: SIZE, height: SIZE, quality: 'best' });
}

function document_fonts_ready(win) {
  return win.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
}

const png = (image, size) => image.resize({ width: size, height: size, quality: 'best' }).toPNG();

// ICO：檔頭 + 每個尺寸一筆目錄 + PNG 資料（Windows Vista 起支援 PNG 格式的 ICO）
function buildIco(image) {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const images = sizes.map((s) => png(image, s));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(sizes.length, 4);
  let offset = 6 + 16 * sizes.length;
  const entries = sizes.map((s, i) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(s === 256 ? 0 : s, 0); // 0 代表 256
    entry.writeUInt8(s === 256 ? 0 : s, 1);
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(images[i].length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += images[i].length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images]);
}

// ICNS：'icns' + 總長度，接著每筆「類型 + 長度 + PNG 資料」
function buildIcns(image) {
  const types = [
    ['icp4', 16], ['icp5', 32], ['icp6', 64], ['ic07', 128],
    ['ic08', 256], ['ic09', 512], ['ic10', 1024], ['ic11', 32], ['ic12', 64], ['ic13', 256], ['ic14', 512],
  ];
  const chunks = types.map(([type, size]) => {
    const data = png(image, size);
    const head = Buffer.alloc(8);
    head.write(type, 0, 'ascii');
    head.writeUInt32BE(data.length + 8, 4);
    return Buffer.concat([head, data]);
  });
  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(8);
  head.write('icns', 0, 'ascii');
  head.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([head, body]);
}

app.whenReady().then(async () => {
  try {
    const image = await renderSvg();
    fs.writeFileSync(path.join(ASSETS, 'icon.png'), image.toPNG());
    fs.writeFileSync(path.join(ASSETS, 'icon.ico'), buildIco(image));
    fs.writeFileSync(path.join(ASSETS, 'icon.icns'), buildIcns(image));
    console.log('已產生 src/assets/icon.png、icon.ico、icon.icns');
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
