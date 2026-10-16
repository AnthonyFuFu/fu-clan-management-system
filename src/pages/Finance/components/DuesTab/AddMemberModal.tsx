import React from 'react';
import { Form, InputNumber, Modal } from 'antd';
import { DEFAULT_DUES_AMOUNT } from '@shared/finance';
import MemberSelect from '@/components/MemberSelect';
import { useResetFormOnOpen } from '@/hooks/useResetFormOnOpen';

const AddMemberModal = ({
  year,
  open,
  existingMemberIds,
  onClose,
  onSubmit,
}: {
  year: number;
  open: boolean;
  existingMemberIds: number[];
  onClose: () => void;
  onSubmit: (memberId: number, amount: number) => Promise<void>;
}) => {
  const [form] = Form.useForm<{ memberId: number; amount: number }>();
  useResetFormOnOpen(form, open);
  return (
    <Modal title={`加入 ${year} 年度應繳名單`} open={open} onCancel={onClose} onOk={() => form.submit()} destroyOnHidden>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ amount: DEFAULT_DUES_AMOUNT }}
        onFinish={(v) => onSubmit(v.memberId, v.amount)}
      >
        <Form.Item label="宗親" name="memberId" rules={[{ required: true, message: '請選擇宗親' }]}>
          <MemberSelect disabledIds={existingMemberIds} />
        </Form.Item>
        <Form.Item label="應繳金額" name="amount" rules={[{ required: true, message: '請輸入金額' }]}>
          <InputNumber min={0} precision={0} step={100} suffix="元" style={{ width: 200 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddMemberModal;
