import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Select, Tabs } from 'antd';
import FinanceOverview from './finance/FinanceOverview';
import DuesTab from './finance/DuesTab';
import TransactionsTab from './finance/TransactionsTab';
import './Finance.css';

const Finance = () => {
  const [years, setYears] = useState<number[]>([new Date().getFullYear()]);
  const [year, setYear] = useState(new Date().getFullYear());
  // Bumped after every write so all tabs (and the overview totals) reload together.
  const [version, setVersion] = useState(0);
  const handleChanged = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    window.electronAPI?.getFinanceYears().then((list) => {
      // Always offer next year too, so dues can be opened before the year starts.
      const nextYear = new Date().getFullYear() + 1;
      setYears(Array.from(new Set([nextYear, ...list])).sort((a, b) => b - a));
    });
  }, [version]);

  if (!window.electronAPI) {
    return (
      <div>
        <h1>財務管理</h1>
        <Alert type="info" showIcon title="財務資料儲存在桌面版的資料庫中，請以 npm run electron:dev 開啟。" />
      </div>
    );
  }

  return (
    <div>
      <div className="finance-header">
        <h1>財務管理</h1>
        <Select
          value={year}
          onChange={setYear}
          options={years.map((y) => ({ value: y, label: `${y} 年度` }))}
          style={{ width: 140 }}
        />
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
