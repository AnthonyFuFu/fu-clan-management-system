// IPC 拋回的錯誤長這樣："Error invoking remote method 'x': Error: <message>" —— 只留下真正的原因。
export function errorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}
