import { useMemo, useState } from 'react';
import { Button, Popconfirm, Segmented, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import type { FinanceTransaction, FinanceTransactionInput, TransactionType } from '@shared/types';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useElectronAPI } from '@/hooks/useElectronAPI';
import { formatMoney } from '@/utils/format';
import { TRANSACTION_TYPE_LABEL } from '../../constants';
import TransactionModal, { type EditorState } from './TransactionModal';

const { Text } = Typography;

interface TransactionsTabProps {
  year: number;
  version: number;
  onChanged: () => void;
}

type TypeFilter = 'all' | TransactionType;

// 固定的空陣列：載入前用它，useMemo 不會因為每次都是新陣列而重算
const EMPTY_ROWS: FinanceTransaction[] = [];

const TransactionsTab = ({ year, version, onChanged }: TransactionsTabProps) => {
  const runAction = useAsyncAction();
  const api = useElectronAPI();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [editor, setEditor] = useState<EditorState>(null);
  const { data: rows = EMPTY_ROWS, loading } = useApiQuery((a) => a.getTransactions(year), [year, version]);

  const filtered = useMemo(
    () => (typeFilter === 'all' ? rows : rows.filter((row) => row.type === typeFilter)),
    [rows, typeFilter]
  );
  const incomeTotal = rows.filter((r) => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
  const expenseTotal = rows.filter((r) => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);

  const handleDelete = async (id: number) => {
    if (await runAction(() => api.deleteTransaction(id), '已刪除', '刪除失敗')) {
      onChanged();
    }
  };

  const handleSave = async (tx: FinanceTransactionInput) => {
    const savedYear = Number(tx.txDate.slice(0, 4));
    const success = savedYear === year ? '已儲存' : `已儲存至 ${savedYear} 年度`;
    if (await runAction(() => api.saveTransaction(tx), success, '儲存失敗')) {
      setEditor(null);
      onChanged();
    }
  };

  const columns: TableColumnsType<FinanceTransaction> = [
    { title: '日期', dataIndex: 'txDate', width: 120 },
    {
      title: '類型',
      dataIndex: 'type',
      width: 80,
      render: (type: TransactionType) => (
        <Tag color={type === 'income' ? 'green' : 'red'}>{TRANSACTION_TYPE_LABEL[type]}</Tag>
      ),
    },
    { title: '類別', dataIndex: 'category', width: 110 },
    { title: '項目', dataIndex: 'item' },
    {
      title: '金額',
      dataIndex: 'amount',
      width: 140,
      align: 'right',
      render: (amount: number, row) => (
        <span className={`finance-amount finance-amount--${row.type}`}>
          {row.type === 'income' ? '+' : '−'}
          {formatMoney(amount)}
        </span>
      ),
    },
    { title: '備註', dataIndex: 'note', ellipsis: true, render: (note: string | null) => note ?? '' },
    {
      title: '操作',
      key: 'actions',
      width: 130,
      render: (_, row) => (
        <>
          <Button type="link" size="small" onClick={() => setEditor({ record: row })}>
            編輯
          </Button>
          <Popconfirm title={`確定刪除「${row.item}」？`} onConfirm={() => handleDelete(row.id)}>
            <Button type="link" size="small" danger>
              刪除
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div>
      <div className="page-toolbar">
        <Segmented<TypeFilter>
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: 'all', label: '全部' },
            { value: 'income', label: '收入' },
            { value: 'expense', label: '支出' },
          ]}
        />
        <Text type="secondary">宗親會費請在「會費收繳」登記，不需重複記在這裡。</Text>
        <div className="page-toolbar-spacer" />
        <Button icon={<PlusOutlined />} onClick={() => setEditor({ type: 'income' })}>
          新增收入
        </Button>
        <Button type="primary" icon={<MinusOutlined />} onClick={() => setEditor({ type: 'expense' })}>
          新增支出
        </Button>
      </div>

      <Table<FinanceTransaction>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: `${year} 年度尚無收支紀錄` }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={4}>
              <Text strong>合計</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} colSpan={3}>
              <Text>
                收入 <span className="finance-amount finance-amount--income">{formatMoney(incomeTotal)}</span>，支出{' '}
                <span className="finance-amount finance-amount--expense">{formatMoney(expenseTotal)}</span>
              </Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />

      <TransactionModal year={year} state={editor} onClose={() => setEditor(null)} onSubmit={handleSave} />
    </div>
  );
};

export default TransactionsTab;
