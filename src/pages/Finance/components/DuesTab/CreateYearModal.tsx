import { Form, InputNumber, Modal, Typography } from 'antd';
import { DEFAULT_DUES_AMOUNT, DUES_MAX_AGE, DUES_MIN_AGE } from '@shared/finance';
import { remountOnOpen } from '@/hoc/remountOnOpen';

const { Paragraph } = Typography;

const CreateYearModal = ({
  year,
  open,
  onClose,
  onSubmit,
}: {
  year: number;
  open: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
}) => {
  const [form] = Form.useForm<{ amount: number }>();
  return (
    <Modal
      title={`開立 ${year} 年度會費`}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="開立"
      destroyOnHidden
    >
      <Paragraph type="secondary">
        應繳名單會沿用前一年度的名單；如果是第一次開立，則列入當年滿 {DUES_MIN_AGE} 歲、未滿 {DUES_MAX_AGE + 1}{' '}
        歲（或未登記生日）的宗親。開立後仍可個別加入、移除或調整金額。
      </Paragraph>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ amount: DEFAULT_DUES_AMOUNT }}
        onFinish={(v) => onSubmit(v.amount)}
      >
        <Form.Item label="每人會費" name="amount" rules={[{ required: true, message: '請輸入金額' }]}>
          <InputNumber min={0} precision={0} step={100} suffix="元" style={{ width: 200 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// 每次開啟都用全新的表單，避免殘留上一次的內容（見 remountOnOpen）
export default remountOnOpen(CreateYearModal, (props) => props.open);
