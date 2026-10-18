import { useRef, type ComponentType } from 'react';

// 讓表單對話框「每次開啟都是全新的」：開啟（或換了編輯對象）時重新掛載整個元件，
// 元件裡的 Form.useForm() 因此每次都拿到新的表單實例，只會套用這次的 initialValues。
//
// 為什麼不共用一個表單實例再 resetFields()：antd Modal 的內容在 Portal 裡，有時會比 Modal
// 晚一步掛載；resetFields() 若剛好在新表單接上之前執行，會重設成「上一次開啟」的初始值，
// 新表單接上後舊值反而蓋過新值——在較慢的電腦上會出現修改表單是空的、或帶著上次輸入的內容。
//
// openKey：關閉時為假值；每次開啟為真值，換編輯對象時換成新的值（例如 state / record 物件）。
// 關閉時 key 不變，所以關閉動畫照常播放。
export function remountOnOpen<P extends object>(
  Component: ComponentType<P>,
  openKey: (props: P) => unknown
): ComponentType<P> {
  const Remounting = (props: P) => {
    const key = openKey(props);
    const opening = useRef(0);
    const lastKey = useRef<unknown>(null);
    // 在 render 中比對（不是 effect），新表單在開啟的同一次 render 就換好
    if (key && key !== lastKey.current) {
      opening.current += 1;
    }
    lastKey.current = key;
    return <Component key={opening.current} {...props} />;
  };
  Remounting.displayName = `remountOnOpen(${Component.displayName ?? Component.name})`;
  return Remounting;
}
