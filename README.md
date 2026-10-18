# 傅氏宗親會管理系統 (fu-clan-management-system)

[![CI](https://github.com/AnthonyFuFu/fu-clan-management-system/actions/workflows/ci.yml/badge.svg)](https://github.com/AnthonyFuFu/fu-clan-management-system/actions/workflows/ci.yml)

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
├── index.html                 # Vite 入口 HTML
├── main.ts                    # Electron 主程序進入點（開發與正式版共用）
├── shared/                    # 主程序與畫面共用（兩邊都 import 這裡，不要各寫一份）
│   ├── types.ts               # 資料型別（宗親、世系圖、財務…）
│   ├── ipc.ts                 # window.electronAPI 介面；方法名稱就是 IPC channel 名稱
│   ├── events.ts              # 活動提醒規則（提醒天數內、今天已結束不提醒）
│   ├── settings.ts            # 系統設定的選項與預設值（文字大小、提醒天數）
│   ├── finance.ts             # 財務規則常數（預設會費、收支類別）
│   └── labels.ts              # 畫面與 Excel 共用的顯示文字（性別…）
├── electron/                  # 主程序（Node.js 環境）
│   ├── ipc.ts                 # 註冊所有 IPC handler
│   ├── services/              # 需要檔案系統或系統對話框的功能
│   │   ├── dialogs.ts         # 開啟 / 儲存檔案對話框
│   │   ├── documents.ts       # 文件上傳、下載、開啟、刪除
│   │   ├── excelTransfer.ts   # Excel 匯出、匯入流程（選檔 → 預覽 → 確認）
│   │   └── excel/             # 產生與解析 Excel（不碰對話框，可單獨測試）
│   ├── preload.ts             # contextBridge 暴露 window.electronAPI（沙箱環境，只能 import type）
│   └── db/                    # SQLite 資料庫
│       ├── index.ts           # initDatabase 與對外匯出的查詢函式
│       ├── connection.ts      # 連線、存檔、查詢與交易工具
│       ├── schema.ts          # 資料表結構與版本升級
│       ├── seed.ts            # 新安裝時的範例資料
│       ├── members.ts         # 成員名單、新增 / 修改、搜尋
│       ├── familyTree.ts      # 世系圖
│       ├── events.ts          # 活動與聚會
│       ├── settings.ts        # 系統設定（存在 meta 資料表）
│       ├── documents.ts       # 上傳文件的中繼資料
│       ├── finance.ts         # 會費名單、收支明細、統計
│       └── dashboard.ts       # 首頁儀表板統計
├── src/                       # 畫面（React）
│   ├── App.tsx                # 路由
│   ├── components/            # 跨頁面共用元件（MainLayout、SettingsProvider、EventReminder、MemberSelect、DesktopOnlyNotice）
│   ├── hooks/                 # 共用 hooks（useAsyncAction：操作成功 / 失敗提示）
│   ├── utils/                 # 共用工具（金額、日期格式、錯誤訊息；remountOnOpen：對話框每次開啟都用全新表單）
│   ├── types/                 # 全域型別宣告（window.electronAPI）
│   ├── assets/                # 應用程式圖示：icon.svg 為原始檔，其餘由 npm run icons 產生
│   └── pages/                 # 每個功能頁面一個資料夾
│       ├── Dashboard/
│       ├── Members/           # index.tsx + constants.ts + components/MemberFormModal.tsx
│       ├── Events/            # index.tsx（行事曆）+ components/（EventFormModal、DayPanel、UpcomingPanel）
│       ├── Settings/          # 系統設定（文字大小、提醒天數）
│       ├── Documents/         # index.tsx + components/（FilesTab、ExcelTab、ImportPreviewModal）
│       ├── FamilyTree/        # index.tsx + layout.ts（座標計算）+ theme.ts（配色）+ components/
│       └── Finance/           # index.tsx + constants.ts + components/（Overview、DuesTab、TransactionsTab）
├── tests/                     # 所有測試（Vitest）
│   ├── setup.ts               # 測試環境設定
│   ├── App.test.tsx
│   ├── helpers/               # 測試共用：假的 window.electronAPI、render 工具
│   ├── shared/                # shared/ 規則的測試
│   ├── components/            # 共用元件測試
│   ├── pages/                 # 畫面測試（jsdom）
│   └── electron/              # 資料庫測試（Node 環境，使用暫存資料夾，不影響實際資料）
├── public/                    # 靜態資源（原樣複製到 build/）
├── vite.config.mts            # Vite / Vitest 設定（含 @ 與 @shared 路徑別名）
├── tsconfig.json              # 畫面 (src/、shared/) 的 TypeScript 設定
├── tsconfig.electron.json     # 主程序 (main.ts、electron/、shared/) 的 TypeScript 設定
├── scripts/
│   └── generate-icons.js      # 由 src/assets/icon.svg 產生 icon.png / .ico / .icns（npm run icons）
└── electron-builder.config.js # electron-builder 打包設定（不能命名為 electron-builder.js：Windows 會把它當成 electron-builder 指令執行）
```

### 新增功能頁面的慣例

1. 在 `src/pages/<功能名稱>/` 建立資料夾，進入點為 `index.tsx`；頁面專用的子元件放在該資料夾的 `components/`，常數放 `constants.ts`。
2. 兩個以上頁面都會用到的元件、hook、工具函式，才放到 `src/components/`、`src/hooks/`、`src/utils/`。
   含表單的對話框請用 `export default remountOnOpen(MyModal, (props) => props.open)` 匯出，否則上一次輸入的內容會殘留到下一次開啟。
3. 需要讀寫資料庫時：
   - 在 `shared/types.ts` 加資料型別、在 `shared/ipc.ts` 的 `ElectronAPI` 加方法；
   - 在 `electron/db/` 實作查詢，並從 `electron/db/index.ts` 匯出；
   - 在 `electron/ipc.ts` 註冊 handler（寫入類用 `handleWrite`，會自動存檔）、在 `electron/preload.ts` 補上對應方法。

   漏了任何一邊，TypeScript 編譯時就會報錯。
4. 畫面中引用共用程式時使用路徑別名：`@/` 代表 `src/`，`@shared/` 代表 `shared/`。主程序（electron/）不支援別名，請用相對路徑。

以下資料夾由指令產生，已加入 `.gitignore`，不需手動維護：

| 資料夾 | 產生方式 | 內容 |
|---|---|---|
| `build/` | `npm run build` | 編譯後的前端 |
| `dist-electron/` | `npm run build:electron` | 編譯後的主程序 |
| `dist/` | `npm run electron:build` | 打包好的安裝檔 |

> `npm run electron:dev` 會設定 `VITE_DEV_SERVER_URL`，主程序有讀到就載入 Vite 開發伺服器，否則載入 `build/index.html`。
> 前端使用 `HashRouter`，因為正式版以 `file://` 載入，`BrowserRouter` 會找不到路由。

## 環境需求

- Node.js **22.13 以上的 22.x、24.x 或 26 以上**（建議使用 LTS 24；專案根目錄的 `.nvmrc` 指定 24，使用 nvm 時執行 `nvm use` 即可）
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
| `npm run icons` | 修改 `src/assets/icon.svg` 後，重新產生 Windows / macOS / Linux 用的應用程式圖示 |
| `npm test` | 以 Vitest 執行 `tests/` 底下的測試（watch 模式，存檔自動重跑；按 `q` 離開） |
| `npx vitest run` | 只執行一次測試（適合 CI 或提交前檢查） |
| `npx tsc --noEmit -p tests` | 型別檢查測試檔（Vitest 執行時不做型別檢查） |

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
3. `electron-builder --config electron-builder.config.js` — 依照 [electron-builder.config.js](electron-builder.config.js) 設定打包

打包完成後，安裝檔會輸出到 **`dist/`** 資料夾。

只想確認打包後的程式能否正常執行、不需要產生安裝檔時，可以用 `--dir` 快速打包（macOS 產物在 `dist/mac-arm64/`）：

```bash
npm run build && npm run build:electron
npx electron-builder --config electron-builder.config.js --dir
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

## 持續整合（CI）

設定檔：[.github/workflows/ci.yml](.github/workflows/ci.yml)。push 到 `master`、對 `master` 開 PR 時自動執行，也可以在 GitHub 的 Actions 頁面手動執行。

| 階段 | 執行環境 | 內容 |
|---|---|---|
| 型別檢查與測試 | Ubuntu | `npm ci` → 型別檢查（程式與測試）→ `vitest run` → 編譯前端與主程序 |
| 打包安裝檔 | Windows、macOS、Ubuntu 同時進行 | 測試通過後，以 electron-builder 打包 `.exe`、`.dmg`、`.AppImage` |

- **PR**：只驗證能否通過測試與打包，不保存安裝檔。
- **push 到 `master`**：打包好的安裝檔會上傳為 Artifact，到該次執行的頁面最下方「Artifacts」即可下載，保留 30 天。
- macOS 安裝檔在 CI 上沒有簽章，使用者第一次開啟需在 Finder 對 App 按右鍵 →「打開」（見「打包與安裝」）。

## 資料儲存說明

應用程式資料儲存在 Electron 的使用者資料目錄（而非專案資料夾內），檔名為 `clan.db`：

| 作業系統 | 路徑 |
|---|---|
| Windows | `%APPDATA%\fu-clan-management-system\clan.db` |
| macOS | `~/Library/Application Support/fu-clan-management-system/clan.db` |
| Linux | `~/.config/fu-clan-management-system/clan.db` |

「系統設定」（文字大小、活動提醒天數）也存在 `clan.db` 中，會跟著資料一起備份、搬移。

上傳的文件存在同一個資料夾底下的 `documents/`（檔名是系統產生的亂碼，原始檔名記在資料庫中）。

- **備份或搬移資料時，請把整個資料夾複製走**（`clan.db` 加上 `documents/`），只複製 `clan.db` 會遺失上傳的文件。
- 可用 [DB Browser for SQLite](https://sqlitebrowser.org/) 或 VS Code 的 SQLite 擴充套件開啟查看。
- 每次新增、修改後都會立即存檔。

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
