import { useState } from 'react';
import type { MemberImportPreview } from '@shared/types';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useElectronAPI } from '@/hooks/useElectronAPI';
import { savedFileMessage } from '@/utils/format';
import ImportPreviewModal from './ImportPreviewModal';

// Excel 匯入宗親名單的流程（下載範本 → 選檔預覽 → 確認匯入），成員頁與文件頁共用。
// 回傳的 modal 要放進畫面裡，預覽視窗才會出現。
export function useMemberImport(onImported?: () => void) {
  const api = useElectronAPI();
  const runAction = useAsyncAction();
  const [preview, setPreview] = useState<MemberImportPreview | null>(null);
  const [importing, setImporting] = useState(false);

  const downloadTemplate = () => runAction(() => api.downloadMemberImportTemplate(), savedFileMessage, '下載失敗');

  const pickImportFile = () =>
    runAction(
      async () => {
        const result = await api.previewMemberImport();
        // 取消選檔時保留原本的預覽
        if (result) setPreview(result);
      },
      () => null,
      '無法讀取檔案'
    );

  const confirmImport = async () => {
    if (!preview) return;
    setImporting(true);
    const ok = await runAction(
      () => api.confirmMemberImport(preview.token),
      (count) => `已匯入 ${count} 位宗親`,
      '匯入失敗'
    );
    setImporting(false);
    if (ok) {
      setPreview(null);
      onImported?.();
    }
  };

  const modal = (
    <ImportPreviewModal
      preview={preview}
      importing={importing}
      onClose={() => setPreview(null)}
      onConfirm={confirmImport}
      onPickAgain={pickImportFile}
    />
  );

  return { downloadTemplate, pickImportFile, modal };
}
