import { Button, Card, Empty, Popconfirm, Typography } from 'antd';
import { ClockCircleOutlined, EnvironmentOutlined, PlusOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import type { ClanEvent } from '@shared/types';
import { formatEventTime } from '@/utils/format';

const { Text } = Typography;

interface DayPanelProps {
  date: Dayjs;
  events: ClanEvent[];
  onAdd: () => void;
  onEdit: (event: ClanEvent) => void;
  onDelete: (event: ClanEvent) => void;
}

// 行事曆右側：選取日期的活動清單
const DayPanel = ({ date, events, onAdd, onEdit, onDelete }: DayPanelProps) => (
  <Card
    title={date.format('M/D（dd）')}
    extra={
      <Button type="primary" size="small" icon={<PlusOutlined />} onClick={onAdd}>
        新增活動
      </Button>
    }
  >
    {events.length === 0 ? (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="這天沒有活動" />
    ) : (
      events.map((event) => (
        <div key={event.id} className="day-panel-event">
          <Text strong>{event.title}</Text>
          <Text type="secondary">
            <ClockCircleOutlined /> {formatEventTime(event)}
          </Text>
          {event.location && (
            <Text type="secondary">
              <EnvironmentOutlined /> {event.location}
            </Text>
          )}
          {event.note && <Text>{event.note}</Text>}
          <div>
            <Button type="link" size="small" onClick={() => onEdit(event)} style={{ paddingInlineStart: 0 }}>
              修改
            </Button>
            <Popconfirm title={`確定刪除「${event.title}」？`} onConfirm={() => onDelete(event)}>
              <Button type="link" size="small" danger>
                刪除
              </Button>
            </Popconfirm>
          </div>
        </div>
      ))
    )}
  </Card>
);

export default DayPanel;
