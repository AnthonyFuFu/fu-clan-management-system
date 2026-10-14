import React, { useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Segmented,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import {
  DATE_FORMAT,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TRANSACTION_TYPE_LABEL,
  errorMessage,
  formatMoney,
} from './constants';

const { Text } = Typography;

interface TransactionsTabProps {
  year: number;
  version: number;
  onChanged: () => void;
}

type TypeFilter = 'all' | TransactionType;

// What the form is opened with: a type for a new entry, or an existing record to edit.
type EditorState = { type: TransactionType } | { record: FinanceTransaction } | null;

const TransactionsTab = ({ year, version, onChanged }: TransactionsTabProps) => {
  const { message } = App.useApp();
  const api = window.electronAPI!;
  const [rows, setRows] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [editor, setEditor] = useState<EditorState>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getTransactions(year)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [api, year, version]);

  const filtered = useMemo(
    () => (typeFilter === 'all' ? rows : rows.filter((row) => row.type === typeFilter)),
    [rows, typeFilter]
  );
  const incomeTotal = rows.filter((r) => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
  const expenseTotal = rows.filter((r) => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);

  const handleDelete = async (id: number) => {
    try {
      await api.deleteTransaction(id);
      message.success('已刪除');
      onChanged();
    } catch (error) {
      message.error(`刪除失敗：${errorMessage(error)}`);
    }
  };

  const handleSave = async (tx: FinanceTransactionInput) => {
    try {
      await api.saveTransaction(tx);
      const savedYear = Number(tx.txDate.slice(0, 4));
      message.success(savedYear === year ? '已儲存' : `已儲存至 ${savedYear} 年度`);
      setEditor(null);
      onChanged();
    } catch (error) {
      message.error(`儲存失敗：${errorMessage(error)}`);
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
      <div className="finance-toolbar">
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
        <div className="finance-toolbar-spacer" />
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

interface TransactionFormValues {
  type: TransactionType;
  txDate: Dayjs;
  category: string;
  item: string;
  amount: number;
  note?: string;
}

const TransactionModal = ({
  year,
  state,
  onClose,
  onSubmit,
}: {
  year: number;
  state: EditorState;
  onClose: () => void;
  onSubmit: (tx: FinanceTransactionInput) => Promise<void>;
}) => {
  const [form] = Form.useForm<TransactionFormValues>();
  const type = Form.useWatch('type', form);
  const record = state && 'record' in state ? state.record : null;

  // New entries default to today when browsing the current year, otherwise to Jan 1 of the selected year.
  const defaultDate = dayjs().year() === year ? dayjs() : dayjs(`${year}-01-01`);
  const initialValues: Partial<TransactionFormValues> = record
    ? { ...record, txDate: dayjs(record.txDate), note: record.note ?? '' }
    : { type: state && 'type' in state ? state.type : 'expense', txDate: defaultDate };

  const categories = (type ?? initialValues.type) === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Modal
      title={record ? '編輯收支' : `新增${TRANSACTION_TYPE_LABEL[(initialValues.type as TransactionType) ?? 'expense']}`}
      open={state !== null}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={(changed) => {
          // Categories differ per type — clear the selection when switching.
          if ('type' in changed) form.setFieldValue('category', undefined);
        }}
        onFinish={(v) =>
          onSubmit({
            id: record?.id,
            type: v.type,
            txDate: v.txDate.format(DATE_FORMAT),
            category: v.category,
            item: v.item.trim(),
            amount: v.amount,
            note: v.note?.trim() || null,
          })
        }
      >
        <Form.Item name="type" label="類型">
          <Radio.Group
            optionType="button"
            options={[
              { value: 'income', label: '收入' },
              { value: 'expense', label: '支出' },
            ]}
          />
        </Form.Item>
        <Form.Item name="txDate" label="日期" rules={[{ required: true, message: '請選擇日期' }]}>
          <DatePicker format={DATE_FORMAT} />
        </Form.Item>
        <Form.Item name="category" label="類別" rules={[{ required: true, message: '請選擇類別' }]}>
          <Select options={categories.map((c) => ({ value: c, label: c }))} placeholder="請選擇" />
        </Form.Item>
        <Form.Item name="item" label="項目" rules={[{ required: true, whitespace: true, message: '請輸入項目' }]}>
          <Input maxLength={100} placeholder="例如：春季祭祖供品" />
        </Form.Item>
        <Form.Item name="amount" label="金額" rules={[{ required: true, message: '請輸入金額' }]}>
          <InputNumber min={1} precision={0} step={100} suffix="元" style={{ width: 200 }} />
        </Form.Item>
        <Form.Item name="note" label="備註">
          <Input.TextArea rows={2} maxLength={200} placeholder="例如：經手人、單據編號" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TransactionsTab;
