import { useEffect } from 'react';
import type { FormInstance } from 'antd';

// 對話框每次開啟（或換了編輯對象）時，把表單重設為這次的 initialValues。
// 同一個 form 實例會在多次開啟間共用；關閉動畫還沒結束就再次開啟時 Form 不會重新掛載，
// 不重設的話，上一次輸入的內容會留在畫面上（例如修改 A 時看到新增 B 時打的名字）。
// openKey：開啟時為真值、每次開啟對象不同時要換成新值（例如 state / record 物件、open 布林值）。
export function useResetFormOnOpen(form: FormInstance, openKey: unknown): void {
  useEffect(() => {
    if (openKey) {
      form.resetFields();
    }
  }, [form, openKey]);
}
