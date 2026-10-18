import { useEffect, useState } from 'react';
import { Button, Card, InputNumber, Space, Typography } from 'antd';
import { BellOutlined, FontSizeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { FONT_SIZE_OPTIONS, MAX_REMINDER_DAYS, MIN_REMINDER_DAYS } from '@shared/settings';
import type { FontSize } from '@shared/types';
import { useSettings } from '@/providers/SettingsProvider';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import BackupCard from './components/BackupCard';
import './Settings.css';

const { Paragraph, Text } = Typography;

// 選項按鈕上的示意文字以「目前畫面 × 該選項的倍率」顯示，讓人一眼看出差別
const PREVIEW_FONT_SIZE = 16;

const Settings = () => {
  const { settings, update } = useSettings();
  const runAction = useAsyncAction();
  const [reminderDays, setReminderDays] = useState<number | null>(settings.reminderDays);

  // 設定從資料庫讀到之後，同步到輸入框
  useEffect(() => {
    setReminderDays(settings.reminderDays);
  }, [settings.reminderDays]);

  const changeFontSize = (fontSize: FontSize) => {
    const label = FONT_SIZE_OPTIONS.find((option) => option.value === fontSize)?.label;
    runAction(() => update({ fontSize }), `文字大小已改為「${label}」`, '儲存失敗');
  };

  const saveReminderDays = () => {
    if (reminderDays === null) return;
    runAction(() => update({ reminderDays }), '已儲存提醒天數', '儲存失敗');
  };

  // 範例：以 7 天後的活動說明從哪一天開始提醒
  const exampleEvent = dayjs().add(7, 'day');
  const exampleStart = exampleEvent.subtract(reminderDays ?? 0, 'day');
  const reminderChanged = reminderDays !== null && reminderDays !== settings.reminderDays;

  return (
    <div>
      <div className="page-header">
        <h1>系統設定</h1>
      </div>

      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Card
          title={
            <>
              <FontSizeOutlined style={{ marginInlineEnd: 8 }} />
              文字大小
            </>
          }
        >
          <Paragraph type="secondary">
            整個畫面（文字、按鈕、圖示）會一起放大，點選後立即套用，下次開啟系統時也會保留。
          </Paragraph>
          <div className="font-size-options" role="radiogroup" aria-label="文字大小">
            {FONT_SIZE_OPTIONS.map((option) => {
              const selected = option.value === settings.fontSize;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`font-size-option${selected ? ' font-size-option--selected' : ''}`}
                  onClick={() => !selected && changeFontSize(option.value)}
                >
                  <span className="font-size-option-sample" style={{ fontSize: PREVIEW_FONT_SIZE * option.zoom }}>
                    傅氏宗親
                  </span>
                  <span className="font-size-option-label">
                    {option.label}
                    <Text type="secondary">（{Math.round(option.zoom * 100)}%）</Text>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card
          title={
            <>
              <BellOutlined style={{ marginInlineEnd: 8 }} />
              活動提醒
            </>
          }
        >
          <Paragraph type="secondary">
            活動前幾天開始提醒：開啟系統時跳出提醒清單，右上角的鈴鐺也會顯示這段期間內的活動。
          </Paragraph>
          <Space wrap align="center">
            <Text>活動前</Text>
            <InputNumber
              aria-label="提醒天數"
              min={MIN_REMINDER_DAYS}
              max={MAX_REMINDER_DAYS}
              precision={0}
              value={reminderDays}
              onChange={setReminderDays}
              onPressEnter={saveReminderDays}
              suffix="天"
              size="large"
              style={{ width: 140 }}
            />
            <Text>開始提醒</Text>
            <Button type="primary" size="large" disabled={!reminderChanged} onClick={saveReminderDays}>
              儲存
            </Button>
          </Space>
          {reminderDays !== null && (
            <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
              {reminderDays === 0
                ? '只在活動當天提醒。'
                : `例如 ${exampleEvent.format('M/D')} 的活動，會從 ${exampleStart.format('M/D')} 開始提醒，直到活動當天。`}
              可設定 {MIN_REMINDER_DAYS}–{MAX_REMINDER_DAYS} 天。
            </Paragraph>
          )}
        </Card>

        <BackupCard />
      </Space>
    </div>
  );
};

export default Settings;
