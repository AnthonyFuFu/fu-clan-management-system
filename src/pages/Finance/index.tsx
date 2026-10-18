import { useCallback, useState } from 'react';
import { Button, Dropdown, Select, Space, Tabs } from 'antd';
import { DownOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useElectronAPI } from '@/hooks/useElectronAPI';
import { savedFileMessage } from '@/utils/format';
import FinanceOverview from './components/Overview';
import DuesTab from './components/DuesTab';
import TransactionsTab from './components/TransactionsTab';
import './Finance.css';

const Finance = () => {
  const api = useElectronAPI();
  const runAction = useAsyncAction();
  const [year, setYear] = useState(new Date().getFullYear());
  // 每次寫入後加一，讓所有分頁（含總覽數字）一起重新載入
  const [version, setVersion] = useState(0);
  const handleChanged = useCallback(() => setVersion((v) => v + 1), []);

  const { data: financeYears = [] } = useApiQuery((api) => api.getFinanceYears(), [version]);
  // 一定提供明年度，讓會費可以在年初前先開立
  const years = Array.from(new Set([new Date().getFullYear() + 1, new Date().getFullYear(), ...financeYears])).sort(
    (a, b) => b - a
  );

  return (
    <div>
      <div className="page-header">
        <h1>財務管理</h1>
        <Space wrap>
          <Select
            value={year}
            onChange={setYear}
            options={years.map((y) => ({ value: y, label: `${y} 年度` }))}
            style={{ width: 140 }}
          />
          <Dropdown
            menu={{
              items: [
                {
                  key: 'dues',
                  label: `${year} 年度會費繳納名單`,
                  onClick: () => runAction(() => api.exportDuesStatus(year), savedFileMessage, '匯出失敗'),
                },
                {
                  key: 'transactions',
                  label: `${year} 年度收支明細`,
                  onClick: () => runAction(() => api.exportTransactions(year), savedFileMessage, '匯出失敗'),
                },
              ],
            }}
          >
            <Button icon={<FileExcelOutlined />}>
              匯出 Excel <DownOutlined />
            </Button>
          </Dropdown>
        </Space>
      </div>

      <Tabs
        items={[
          {
            key: 'overview',
            label: '年度總覽',
            children: <FinanceOverview year={year} version={version} />,
          },
          {
            key: 'dues',
            label: '會費收繳',
            children: <DuesTab year={year} version={version} onChanged={handleChanged} />,
          },
          {
            key: 'transactions',
            label: '收支明細',
            children: <TransactionsTab year={year} version={version} onChanged={handleChanged} />,
          },
        ]}
      />
    </div>
  );
};

export default Finance;
