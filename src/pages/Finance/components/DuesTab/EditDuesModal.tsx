import React from 'react';
import { Form, Input, InputNumber, Modal } from 'antd';
import type { DuesRecord } from '@shared/types';
import { useResetFormOnOpen } from '@/hooks/useResetFormOnOpen';

const EditDuesModal = ({
  record,
  onClose,
  onSubmit,
}: {
  record: DuesRecord | null;
  onClose: () => void;
  onSubmit: (amount: number, note: string | null) => Promise<void>;
}) => {
  const [form] = Form.useForm<{ amount: number; note?: string }>();
  useResetFormOnOpen(form, record);
  return (
    <Modal
      title={record ? `編輯：${record.name}` : ''}
      open={record !== null}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      {record && (
        <Form
          form={form}
          layout="vertical"
          initialValues={{ amount: record.amountDue, note: record.note ?? '' }}
          onFinish={(v) => onSubmit(v.amount, v.note?.trim() || null)}
        >
          <Form.Item label="應繳金額" name="amount" extra="減免可調低金額，設為 0 即為免繳" rules={[{ required: true, message: '請輸入金額' }]}>
            <InputNumber min={0} precision={0} step={100} suffix="元" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item label="備註" name="note">
            <Input.TextArea rows={2} maxLength={200} placeholder="例如：減半（清寒）、代繳人、收據編號" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default EditDuesModal;
