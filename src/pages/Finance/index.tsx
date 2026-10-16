import React, { useCallback, useEffect, useState } from 'react';
import { Select, Tabs } from 'antd';
import DesktopOnlyNotice from '@/components/DesktopOnlyNotice';
import FinanceOverview from './components/Overview';
import DuesTab from './components/DuesTab';
import TransactionsTab from './components/TransactionsTab';
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
    return <DesktopOnlyNotice title="財務管理" />;
  }

  return (
    <div>
      <div className="page-header">
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
