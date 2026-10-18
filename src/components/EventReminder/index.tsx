import React, { useEffect, useState } from 'react';
import { Badge, Button, Empty, Modal, Popover, Tooltip } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { REMINDER_DAYS } from '@shared/events';
import UpcomingEventList from './UpcomingEventList';
import { useUpcomingEvents } from './UpcomingEventsContext';
import './EventReminder.css';

// 開啟程式後只自動跳出一次；之後要看提醒點右上角的鈴鐺
let shownThisSession = false;

// 頂端列的鈴鐺（顯示近期活動數）＋開啟程式時的提醒視窗
const EventReminder = () => {
  const { events } = useUpcomingEvents();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    if (events.length > 0 && !shownThisSession) {
      shownThisSession = true;
      setModalOpen(true);
    }
  }, [events]);

  const goToCalendar = () => {
    setModalOpen(false);
    setPopoverOpen(false);
    navigate('/events');
  };

  return (
    <>
      <Popover
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        trigger="click"
        placement="bottomRight"
        title={`${REMINDER_DAYS} 天內的活動`}
        content={
          <div className="event-reminder-popover">
            {events.length > 0 ? (
              <UpcomingEventList events={events} />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`${REMINDER_DAYS} 天內沒有活動`} />
            )}
            <Button type="link" onClick={goToCalendar} style={{ paddingInline: 0 }}>
              查看行事曆
            </Button>
          </div>
        }
      >
        <Tooltip title="活動提醒">
          <Button type="text" aria-label="活動提醒" className="event-reminder-bell">
            <Badge count={events.length} size="small">
              <BellOutlined style={{ fontSize: 18 }} />
            </Badge>
          </Button>
        </Tooltip>
      </Popover>

      <Modal
        title={
          <>
            <BellOutlined style={{ marginInlineEnd: 8, color: '#fa8c16' }} />
            活動提醒
          </>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="calendar" onClick={goToCalendar}>
            查看行事曆
          </Button>,
          <Button key="ok" type="primary" onClick={() => setModalOpen(false)}>
            知道了
          </Button>,
        ]}
      >
        <UpcomingEventList events={events} />
      </Modal>
    </>
  );
};

export default EventReminder;
