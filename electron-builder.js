module.exports = {
  extends: null,
  appId: "com.fuclan.management",
  productName: "傅氏宗親會管理系統",
  files: [
    "build/**/*",
    "main.js",
    "electron/**/*",
    "package.json",
    "node_modules/**/*"
  ],
  extraMetadata: {
    main: "main.js"
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