// 主程序（electron/）與畫面（src/）共用的資料型別 —— IPC 兩端都以這裡為準。
// 依功能分檔，使用時一律從 shared/types 匯入（例如 `import type { Member } from '@shared/types'`）。
export * from './dashboard';
export * from './members';
export * from './finance';
export * from './documents';
export * from './events';
export * from './settings';
