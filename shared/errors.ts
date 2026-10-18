// 錯誤訊息只留下真正的原因（畫面與主程序共用）。
// IPC 拋回畫面的錯誤長這樣："Error invoking remote method 'x': Error: <message>"。
export function errorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}
