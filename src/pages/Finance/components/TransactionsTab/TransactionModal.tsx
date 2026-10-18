import { DatePicker, Form, Input, InputNumber, Modal, Radio, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@shared/finance';
import type { FinanceTransaction, FinanceTransactionInput, TransactionType } from '@shared/types';
import { remountOnOpen } from '@/hoc/remountOnOpen';
import { DATE_FORMAT } from '@/utils/format';
import { TRANSACTION_TYPE_LABEL } from '../../constants';

// 開啟表單的情境：新增時帶入收入或支出，修改時帶入既有紀錄
export type EditorState = { type: TransactionType } | { record: FinanceTransaction } | null;

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

  // 新增時的預設日期：看的是今年就用今天，否則用該年度的 1 月 1 日
  const defaultDate = dayjs().year() === year ? dayjs() : dayjs(`${year}-01-01`);
  const initialValues: Partial<TransactionFormValues> = record
    ? { ...record, txDate: dayjs(record.txDate), note: record.note ?? '' }
    : { type: state && 'type' in state ? state.type : 'expense', txDate: defaultDate };

  const categories = (type ?? initialValues.type) === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Modal
      title={
        record ? '編輯收支' : `新增${TRANSACTION_TYPE_LABEL[(initialValues.type as TransactionType) ?? 'expense']}`
      }
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
          // 收入與支出的類別不同，切換時清掉已選的類別
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

// 每次開啟都用全新的表單，避免殘留上一次的內容（見 remountOnOpen）
export default remountOnOpen(TransactionModal, (props) => props.state);
