module.exports = {
  extends: null,
  appId: "com.fuclan.management",
  productName: "傅氏宗親會管理系統",
  files: [
    "build/**/*",
    "dist-electron/**/*",
    "package.json",
    "node_modules/**/*"
  ],
  extraMetadata: {
    main: "dist-electron/main.js"
  },
  directories: {
    buildResources: "assets",
    output: "dist"
  },
  win: {
    target: ["nsis"],
    icon: "assets/icon.ico"
  },
  mac: {
    target: ["dmg"],
    icon: "assets/icon.icns"
  },
  linux: {
    target: ["AppImage"],
    icon: "assets/icon.png"
  }
};