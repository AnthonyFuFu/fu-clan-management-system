import { DatePicker, Form, Modal } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { DATE_FORMAT } from '@/utils/format';
import { remountOnOpen } from '@/hoc/remountOnOpen';

const PayModal = ({
  count,
  open,
  onClose,
  onSubmit,
}: {
  count: number;
  open: boolean;
  onClose: () => void;
  onSubmit: (date: string) => Promise<void>;
}) => {
  const [form] = Form.useForm<{ date: Dayjs }>();
  return (
    <Modal title={`登記繳費（${count} 人）`} open={open} onCancel={onClose} onOk={() => form.submit()} destroyOnHidden>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ date: dayjs() }}
        onFinish={(v) => onSubmit(v.date.format(DATE_FORMAT))}
      >
        <Form.Item label="繳費日期" name="date" rules={[{ required: true, message: '請選擇日期' }]}>
          <DatePicker format={DATE_FORMAT} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// 每次開啟都用全新的表單，避免殘留上一次的內容（見 remountOnOpen）
export default remountOnOpen(PayModal, (props) => props.open);
