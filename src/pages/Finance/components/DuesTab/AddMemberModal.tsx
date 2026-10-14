import React, { useEffect, useState } from 'react';
import { Form, InputNumber, Modal, Select } from 'antd';
import { DEFAULT_DUES_AMOUNT } from '@shared/finance';
import type { MemberSummary } from '@shared/types';

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
  const [options, setOptions] = useState<MemberSummary[]>([]);

  const search = (keyword: string) => {
    window.electronAPI?.searchMembers(keyword).then(setOptions);
  };

  useEffect(() => {
    if (open) search('');
  }, [open]);

  return (
    <Modal title={`加入 ${year} 年度應繳名單`} open={open} onCancel={onClose} onOk={() => form.submit()} destroyOnHidden>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ amount: DEFAULT_DUES_AMOUNT }}
        onFinish={(v) => onSubmit(v.memberId, v.amount)}
      >
        <Form.Item label="宗親" name="memberId" rules={[{ required: true, message: '請選擇宗親' }]}>
          <Select
            showSearch={{ filterOption: false, onSearch: search }}
            placeholder="輸入姓名搜尋"
            options={options.map((m) => ({
              value: m.id,
              label: `${m.name}（第 ${m.generation} 世）`,
              disabled: existingMemberIds.includes(m.id),
            }))}
          />
        </Form.Item>
        <Form.Item label="應繳金額" name="amount" rules={[{ required: true, message: '請輸入金額' }]}>
          <InputNumber min={0} precision={0} step={100} suffix="元" style={{ width: 200 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddMemberModal;
