# 傅氏宗親會管理系統 (fu-clan-management-system)

以 [Vite](https://vite.dev/) + [Electron](https://www.electronjs.org/) 打造的桌面應用程式，前端使用 TypeScript + Ant Design，資料儲存於內嵌的 SQLite（[sql.js](https://sql.js.org/)）。

## 技術棧

| 分類 | 工具 |
|---|---|
| 前端框架 | React 19 + TypeScript |
| 建置工具 | Vite（測試：Vitest + Testing Library） |
| UI 元件庫 | Ant Design (antd) |
| 路由 | react-router-dom |
| 狀態管理 | Redux Toolkit + react-redux |
| 工具函式庫 | dayjs、lodash、axios |
| 桌面殼層 | Electron + electron-builder |
| 資料儲存 | SQLite（sql.js，WebAssembly 版，無需原生編譯） |

## 專案結構

```
├── index.html             # Vite 入口 HTML
├── src/                   # React 前端原始碼（.ts / .tsx，由 Vite 編譯）
│   └── assets/            # 應用程式圖示（icon.ico / icon.icns / icon.png，打包時使用）
├── public/                # 靜態資源（原樣複製到 build/）
├── electron/
│   ├── db.ts              # SQLite 資料庫初始化與查詢邏輯
│   └── preload.ts         # Electron preload script（contextBridge 安全橋接）
├── main.ts                # Electron 主程序進入點（開發與正式版共用）
├── vite.config.mts        # Vite / Vitest 設定
├── tsconfig.json          # 前端 (src/) 的 TypeScript 設定
├── tsconfig.electron.json # 主程序 (electron/、main.ts) 的 TypeScript 設定
└── electron-builder.js    # electron-builder 打包設定
```

以下資料夾由指令產生，已加入 `.gitignore`，不需手動維護：

| 資料夾 | 產生方式 | 內容 |
|---|---|---|
| `build/` | `npm run build` | 編譯後的前端 |
| `dist-electron/` | `npm run build:electron` | 編譯後的主程序 |
| `dist/` | `npm run electron:build` | 打包好的安裝檔 |

> `npm run electron:dev` 會設定 `VITE_DEV_SERVER_URL`，主程序有讀到就載入 Vite 開發伺服器，否則載入 `build/index.html`。
> 前端使用 `HashRouter`，因為正式版以 `file://` 載入，`BrowserRouter` 會找不到路由。

## 環境需求

- Node.js **22.13 以上的 22.x、24.x 或 26 以上**（建議使用 LTS 24）
  - Vitest 5、jsdom 29、concurrently 10 的共同需求，Node 20 與 23 無法使用
  - 用 `node -v` 確認版本
- npm 10 以上

## 快速開始

### 1. 安裝套件

```bash
npm install
```

> 安裝時仍會看到 `inflight`、`glob@7`、`rimraf@2` 的 deprecated 警告，這些來自 electron-builder 內部，只在打包時使用，可以忽略。
> `package.json` 的 `overrides` 強制使用 `global-agent` 4，用來排除 electron-builder 依賴中 `sprintf-js` 的安全性警告，請勿移除。

### 2. 啟動開發環境（Electron 視窗 + 熱重載）

```bash
npm run electron:dev
```

會同時啟動 Vite 開發伺服器與 Electron 視窗，並自動開啟開發者工具。

- 修改 `src/` 底下的前端程式：存檔後畫面自動更新。
- 修改 `main.ts` 或 `electron/` 底下的主程序：要按 `Ctrl+C` 停止後重新執行指令才會生效。

### 3. 純網頁開發（不開 Electron 視窗，瀏覽器測試用）

```bash
npm start
```
開啟 [http://127.0.0.1:3000](http://127.0.0.1:3000) 預覽。

> ⚠️ 純瀏覽器模式不會執行 Electron 主程序，因此讀不到 SQLite 資料（`window.electronAPI` 不存在），僅適合純 UI 開發。

## 常用指令

| 指令 | 說明 |
|---|---|
| `npm start` | 啟動 Vite 開發伺服器（純瀏覽器） |
| `npm run electron:dev` | 同時啟動 Vite 開發伺服器 + Electron 視窗，前端支援熱重載 |
| `npm run build` | 型別檢查並編譯前端到 `build/` |
| `npm run preview` | 在瀏覽器預覽 `build/` 的編譯結果（需先 `npm run build`） |
| `npm run build:electron` | 編譯 Electron 主程序 TypeScript 到 `dist-electron/` |
| `npm run electron` | 編譯主程序後以 Electron 開啟已編譯的 `build/`，等同正式版行為（需先 `npm run build`） |
| `npm run electron:build` | 完整打包成可安裝的桌面應用程式（見下方「打包與安裝」） |
| `npm test` | 以 Vitest 執行測試（watch 模式，存檔自動重跑；按 `q` 離開） |
| `npx vitest run` | 只執行一次測試（適合 CI 或提交前檢查） |

### 疑難排解

- **`TypeError: Cannot read properties of undefined (reading 'whenReady')`**\
  環境變數 `ELECTRON_RUN_AS_NODE=1` 讓 Electron 以純 Node 模式執行，某些在 VS Code 擴充功能內開啟的終端機會繼承這個變數。先清除再執行：
  ```bash
  unset ELECTRON_RUN_AS_NODE          # macOS / Linux
  ```
  ```powershell
  Remove-Item Env:ELECTRON_RUN_AS_NODE  # Windows PowerShell
  ```
- **`npm error Exit handler never called!`、`sh: tsc: command not found`、`electron: command not found`**\
  npm 安裝中途中斷，`node_modules` 不完整。刪除後重裝：
  ```bash
  rm -rf node_modules
  npm install
  ```
  仍失敗可先執行 `npm cache clean --force`，或改用 npm 10（`npm i -g npm@10`）。
- **`Error: Port 3000 is already in use`**\
  Vite 固定使用 port 3000（Electron 要連到這個位址），請先關閉佔用的程式。macOS / Linux 可用 `lsof -i :3000` 找出是哪個程式。
- **`npm warn EBADENGINE Unsupported engine`**\
  Node.js 版本不符合「環境需求」，請升級 Node.js。

## 打包與安裝

### 打包成安裝程式

```bash
npm run electron:build
```

這個指令會依序：
1. `npm run build` — 編譯前端到 `build/`
2. `npm run build:electron` — 編譯 Electron 主程序到 `dist-electron/`
3. `electron-builder --config electron-builder.js` — 依照 [electron-builder.js](electron-builder.js) 設定打包

打包完成後，安裝檔會輸出到 **`dist/`** 資料夾。

只想確認打包後的程式能否正常執行、不需要產生安裝檔時，可以用 `--dir` 快速打包（macOS 產物在 `dist/mac-arm64/`）：

```bash
npm run build && npm run build:electron
npx electron-builder --config electron-builder.js --dir
```

### 各平台安裝檔與安裝方式

| 平台 | 產物格式 | 安裝方式 |
|---|---|---|
| Windows | `.exe`（NSIS 安裝程式） | 雙擊執行，跟著安裝精靈選路徑即可，完成後桌面/開始選單會有捷徑 |
| macOS | `.dmg` | 開啟後把 App 拖曳到「應用程式」資料夾 |
| Linux | `.AppImage` | 下載後 `chmod +x <檔名>.AppImage`，直接執行 |

> electron-builder 原生只能可靠地打包「目前所在的作業系統」對應的格式（例如要產生 `.dmg` 需要在 macOS 上執行）。若需跨平台打包，請參考 [electron-builder 官方文件](https://www.electron.build/multi-platform-build)。

> **macOS 簽章**：electron-builder 會自動使用鑰匙圈中找到的 Apple 憑證簽章，但目前沒有設定公證（notarization）。在其他 Mac 上第一次開啟時可能出現「無法驗證開發者」，請在 Finder 中對 App 按右鍵 →「打開」。要正式散布，需設定 Apple Developer ID 與公證，請參考 [electron-builder 簽章文件](https://www.electron.build/code-signing-mac)。
>
> **Windows**：安裝程式沒有程式碼簽章，執行時 SmartScreen 可能顯示警告，點「其他資訊」→「仍要執行」即可。

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

以下記錄專案初始化與後續安裝過的套件，僅供參考，正常開發請直接用上方的 `npm install`。專案原本以 Create React App 建立，之後已遷移至 Vite，`react-scripts` 已移除。

<details>
<summary>展開查看</summary>

```bash
# React + UI 元件庫
npm install react react-dom antd @ant-design/icons

# 路由
npm install react-router-dom

# 狀態管理
npm install redux react-redux @reduxjs/toolkit

# 工具函式庫
npm install dayjs lodash axios

# SQLite（WebAssembly 版，無需原生編譯）
npm install sql.js

# 建置工具與測試（Vite / Vitest）
npm install --save-dev vite @vitejs/plugin-react vitest jsdom@29
npm install --save-dev @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event

# Electron 與打包
npm install --save-dev electron electron-builder concurrently wait-on cross-env

# TypeScript 與型別定義
npm install --save-dev typescript@5 @types/node @types/react @types/react-dom @types/lodash @types/sql.js
```

> `jsdom` 固定在 29 版：30 版需要 Node.js 24.15 以上。
> `typescript` 固定在 5.x：7.x 是以 Go 重寫的新版編譯器，周邊工具尚未完全支援。

</details>
