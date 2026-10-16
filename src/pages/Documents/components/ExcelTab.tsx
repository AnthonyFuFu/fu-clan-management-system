import React, { useEffect, useState } from 'react';
import { Button, Card, Col, Row, Select, Typography } from 'antd';
import { DownloadOutlined, FileExcelOutlined, ImportOutlined } from '@ant-design/icons';
import type { MemberImportPreview } from '@shared/types';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { savedFileMessage as savedMessage } from '@/utils/format';
import ImportPreviewModal from './ImportPreviewModal';

const { Paragraph, Text } = Typography;

const YearSelect = ({ years, value, onChange }: { years: number[]; value: number; onChange: (y: number) => void }) => (
  <Select value={value} onChange={onChange} options={years.map((y) => ({ value: y, label: `${y} 年度` }))} style={{ width: 120 }} />
);

const ExcelTab = () => {
  const api = window.electronAPI!;
  const runAction = useAsyncAction();
  const thisYear = new Date().getFullYear();
  const [years, setYears] = useState<number[]>([thisYear]);
  const [duesYear, setDuesYear] = useState(thisYear);
  const [txYear, setTxYear] = useState(thisYear);
  const [preview, setPreview] = useState<MemberImportPreview | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    api.getFinanceYears().then(setYears);
  }, [api]);

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
    const ok = await runAction(() => api.confirmMemberImport(preview.token), (count) => `已匯入 ${count} 位宗親`, '匯入失敗');
    setImporting(false);
    if (ok) setPreview(null);
  };

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="匯出在世宗親會費繳納名單" className="documents-card">
            <Paragraph type="secondary">
              每位在世宗親一列，標示已繳、未繳、免繳，或未列入該年度應繳名單；另附人數與金額統計。
            </Paragraph>
            <div className="documents-card-actions">
              <YearSelect years={years} value={duesYear} onChange={setDuesYear} />
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                onClick={() => runAction(() => api.exportDuesStatus(duesYear), savedMessage, '匯出失敗')}
              >
                匯出 Excel
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="匯出收入與支出清單" className="documents-card">
            <Paragraph type="secondary">
              該年度每一筆收入與支出（依日期排序），另附年度彙總：會費收入、各類別收支、年度結餘與累計結餘。
            </Paragraph>
            <div className="documents-card-actions">
              <YearSelect years={years} value={txYear} onChange={setTxYear} />
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                onClick={() => runAction(() => api.exportTransactions(txYear), savedMessage, '匯出失敗')}
              >
                匯出 Excel
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="匯入宗親名單" className="documents-card">
            <Paragraph type="secondary">
              第一次建立名單時使用：
              <br />
              1. 下載範本，依「填寫說明」工作表填寫
              <br />
              2. 選擇填好的檔案，先預覽檢查
              <br />
              3. 沒有錯誤後確認匯入
            </Paragraph>
            <div className="documents-card-actions">
              <Button
                icon={<DownloadOutlined />}
                onClick={() => runAction(() => api.downloadMemberImportTemplate(), savedMessage, '下載失敗')}
              >
                下載範本
              </Button>
              <Button type="primary" icon={<ImportOutlined />} onClick={pickImportFile}>
                選擇 Excel 檔案
              </Button>
            </div>
            <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
              系統裡已有「同名且同世代」的人會自動略過，重複匯入也不會產生重複資料。
            </Text>
          </Card>
        </Col>
      </Row>

      <ImportPreviewModal
        preview={preview}
        importing={importing}
        onClose={() => setPreview(null)}
        onConfirm={confirmImport}
        onPickAgain={pickImportFile}
      />
    </>
  );
};

export default ExcelTab;
