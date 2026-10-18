import { Col, DatePicker, Form, Input, Modal, Row, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { ClanEvent, ClanEventInput } from '@shared/types';
import { remountOnOpen } from '@/hoc/remountOnOpen';
import { DATE_FORMAT } from '@/utils/format';

const TIME_FORMAT = 'HH:mm';

// 表單開啟的情境：在某一天新增，或修改既有活動
export type EventFormState = { mode: 'create'; date: Dayjs } | { mode: 'edit'; event: ClanEvent } | null;

interface EventFormValues {
  title: string;
  eventDate: Dayjs;
  startTime?: Dayjs | null;
  endTime?: Dayjs | null;
  location?: string;
  note?: string;
}

interface EventFormModalProps {
  state: EventFormState;
  onClose: () => void;
  onSubmit: (input: ClanEventInput) => Promise<void>;
}

const toTime = (value: string | null) => (value ? dayjs(value, TIME_FORMAT) : null);

function initialValues(state: NonNullable<EventFormState>): Partial<EventFormValues> {
  if (state.mode === 'create') {
    return { eventDate: state.date };
  }
  const e = state.event;
  return {
    title: e.title,
    eventDate: dayjs(e.eventDate),
    startTime: toTime(e.startTime),
    endTime: toTime(e.endTime),
    location: e.location ?? '',
    note: e.note ?? '',
  };
}

const EventFormModal = ({ state, onClose, onSubmit }: EventFormModalProps) => {
  const [form] = Form.useForm<EventFormValues>();
  const editing = state?.mode === 'edit' ? state.event : null;

  return (
    <Modal
      title={editing ? `修改活動：${editing.title}` : '新增活動'}
      open={state !== null}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="儲存"
      destroyOnHidden
    >
      {state && (
        <Form<EventFormValues>
          form={form}
          layout="vertical"
          initialValues={initialValues(state)}
          onFinish={(v) =>
            onSubmit({
              id: editing?.id,
              title: v.title.trim(),
              eventDate: v.eventDate.format(DATE_FORMAT),
              startTime: v.startTime ? v.startTime.format(TIME_FORMAT) : null,
              endTime: v.endTime ? v.endTime.format(TIME_FORMAT) : null,
              location: v.location?.trim() || null,
              note: v.note?.trim() || null,
            })
          }
        >
          <Form.Item
            name="title"
            label="活動名稱"
            rules={[{ required: true, whitespace: true, message: '請輸入活動名稱' }]}
          >
            <Input maxLength={100} placeholder="例如：秋季祭祖" />
          </Form.Item>

          <Form.Item name="eventDate" label="日期" rules={[{ required: true, message: '請選擇日期' }]}>
            <DatePicker format={[`${DATE_FORMAT}（dd）`, DATE_FORMAT]} style={{ width: '100%' }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startTime" label="開始時間" extra="不填表示整天">
                <TimePicker format={TIME_FORMAT} minuteStep={5} needConfirm={false} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endTime"
                label="結束時間"
                dependencies={['startTime']}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, end: Dayjs | null | undefined) {
                      const start: Dayjs | null | undefined = getFieldValue('startTime');
                      if (!end) return Promise.resolve();
                      if (!start) return Promise.reject(new Error('請先填寫開始時間'));
                      return end.format(TIME_FORMAT) > start.format(TIME_FORMAT)
                        ? Promise.resolve()
                        : Promise.reject(new Error('結束時間必須晚於開始時間'));
                    },
                  }),
                ]}
              >
                <TimePicker format={TIME_FORMAT} minuteStep={5} needConfirm={false} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="location" label="地點">
            <Input maxLength={100} placeholder="例如：傅氏宗祠" />
          </Form.Item>

          <Form.Item name="note" label="備註">
            <Input.TextArea rows={3} maxLength={500} placeholder="例如：請著正式服裝、需事先報名" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

// 每次開啟都用全新的表單，避免殘留上一次的內容（見 remountOnOpen）
export default remountOnOpen(EventFormModal, (props) => props.state);
