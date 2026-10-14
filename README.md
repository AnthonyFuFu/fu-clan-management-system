# 傅氏宗親會管理系統 (fu-clan-management-system)

以 [Create React App](https://github.com/facebook/create-react-app) + [Electron](https://www.electronjs.org/) 打造的桌面應用程式，前端使用 TypeScript + Ant Design，資料儲存於內嵌的 SQLite（[sql.js](https://sql.js.org/)）。

## 技術棧

| 分類 | 工具 |
|---|---|
| 前端框架 | React 19 + TypeScript |
| UI 元件庫 | Ant Design (antd) |
| 路由 | react-router-dom |
| 狀態管理 | Redux Toolkit + react-redux |
| 工具函式庫 | dayjs、lodash、axios |
| 桌面殼層 | Electron + electron-builder |
| 資料儲存 | SQLite（sql.js，WebAssembly 版，無需原生編譯） |

## 專案結構

```
├── src/                  # React 前端原始碼（.ts / .tsx，由 react-scripts 編譯）
├── public/
│   └── electron.ts       # Electron 主程序進入點（開發模式使用）
├── electron/
│   ├── db.ts             # SQLite 資料庫初始化與查詢邏輯
│   └── preload.ts        # Electron preload script（contextBridge 安全橋接）
├── main.ts               # Electron 主程序進入點（打包後使用，見 electron-builder.js）
├── tsconfig.json         # 前端 (src/) 的 TypeScript 設定
├── tsconfig.electron.json# 主程序 (electron/、main.ts、public/electron.ts) 的 TypeScript 設定
├── electron-builder.js   # electron-builder 打包設定
└── dist-electron/        # 主程序編譯輸出（由 tsc 產生，已加入 .gitignore，不需手動維護）
```

> `main.ts` 與 `public/electron.ts` 內容幾乎相同，是有意保留的兩個進入點：
> `public/electron.ts` 給開發模式（`npm run electron:dev`）使用，`main.ts` 給打包後的正式版使用（`electron-builder.js` 會在打包時把 `package.json` 的 `main` 換成編譯後的 `main.js`）。

## 環境需求

- Node.js 18+（建議與 CI/建置環境一致）
- npm

## 快速開始

### 1. 安裝套件

```bash
npm install
```

### 2. 啟動開發環境（Electron 視窗 + 熱重載）

```bash
npm run electron:dev
```

### 3. 純網頁開發（不開 Electron 視窗，瀏覽器測試用）

```bash
npm start
```
開啟 [http://localhost:3000](http://localhost:3000) 預覽。

> ⚠️ 純瀏覽器模式不會執行 Electron 主程序，因此讀不到 SQLite 資料（`window.electronAPI` 不存在），僅適合純 UI 開發。

## 常用指令

| 指令 | 說明 |
|---|---|
| `npm start` | 啟動 React 開發伺服器（純瀏覽器） |
| `npm run electron:dev` | 同時啟動 React 開發伺服器 + Electron 視窗，支援熱重載 |
| `npm run build` | 編譯前端 React 程式到 `build/` |
| `npm run build:electron` | 編譯 Electron 主程序 TypeScript 到 `dist-electron/` |
| `npm run electron` | 編譯主程序後直接以 Electron 開啟（不含前端熱重載） |
| `npm run electron:build` | 完整打包成可安裝的桌面應用程式（見下方「打包與安裝」） |
| `npm test` | 執行測試 |

## 打包與安裝

### 打包成安裝程式

```bash
npm run electron:build
```

這個指令會依序：
1. `npm run build` — 編譯 React 前端到 `build/`
2. `npm run build:electron`（經由 `preelectron:build`）— 編譯 Electron 主程序到 `dist-electron/`
3. `electron-builder --config electron-builder.js` — 依照 [electron-builder.js](electron-builder.js) 設定打包

打包完成後，安裝檔會輸出到 **`dist/`** 資料夾。

### 各平台安裝檔與安裝方式

| 平台 | 產物格式 | 安裝方式 |
|---|---|---|
| Windows | `.exe`（NSIS 安裝程式） | 雙擊執行，跟著安裝精靈選路徑即可，完成後桌面/開始選單會有捷徑 |
| macOS | `.dmg` | 開啟後把 App 拖曳到「應用程式」資料夾 |
| Linux | `.AppImage` | 下載後 `chmod +x <檔名>.AppImage`，直接執行 |

> electron-builder 原生只能可靠地打包「目前所在的作業系統」對應的格式（例如要產生 `.dmg` 需要在 macOS 上執行）。若需跨平台打包，請參考 [electron-builder 官方文件](https://www.electron.build/multi-platform-build)。

### 使用者端安裝需求

打包出的安裝檔已包含完整的 `node_modules` 與 Electron 執行環境，使用者端**不需要**另外安裝 Node.js 或任何開發工具，下載安裝檔後即可直接安裝使用。

## 資料儲存說明

應用程式資料儲存在 Electron 的使用者資料目錄（而非專案資料夾內），檔名為 `clan.db`：

| 作業系統 | 路徑 |
|---|---|
| Windows | `%APPDATA%\fu-clan-management-system\clan.db` |
| macOS | `~/Library/Application Support/fu-clan-management-system/clan.db` |
| Linux | `~/.config/fu-clan-management-system/clan.db` |

- 可用 [DB Browser for SQLite](https://sqlitebrowser.org/) 或 VS Code 的 SQLite 擴充套件開啟查看。
- 關閉應用程式視窗時會自動將異動存檔；若要備份/搬移資料，複製 `clan.db` 這個檔案即可。

## 開發歷程備忘（套件安裝指令）

以下記錄專案初始化時安裝過的套件，僅供參考，正常開發請直接用上方的 `npm install`。

<details>
<summary>展開查看</summary>

```bash
# 建立 React 專案
npx create-react-app fu-clan-management-system

# 安裝路由
npm install react-router-dom

# 安裝狀態管理工具
npm install redux react-redux @reduxjs/toolkit

# 安裝工具函式庫
npm install dayjs lodash axios

# 集成 Electron
npm install --save-dev electron electron-builder concurrently wait-on cross-env electron-is-dev

# SQLite（WebAssembly 版，無需原生編譯）
npm install sql.js

# TypeScript
npm install --save-dev typescript @types/node @types/react @types/react-dom @types/jest @types/lodash @types/sql.js
```

</details>
