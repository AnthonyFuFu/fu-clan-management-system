module.exports = {
  extends: null,
  appId: 'com.fuclan.management',
  productName: '傅氏宗親會管理系統',
  files: ['build/**/*', 'dist-electron/**/*', 'package.json', 'node_modules/**/*'],
  directories: {
    buildResources: 'assets',
    output: 'dist',
  },
  win: {
    target: ['nsis'],
    icon: 'src/assets/icon.ico',
  },
  mac: {
    target: ['dmg'],
    icon: 'src/assets/icon.icns',
  },
  linux: {
    target: ['AppImage'],
    icon: 'src/assets/icon.png',
  },
};
