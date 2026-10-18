import { Button, Card, Popconfirm, Space, Typography } from 'antd';
import { CloudDownloadOutlined, FolderOpenOutlined, HistoryOutlined, SafetyOutlined } from '@ant-design/icons';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useElectronAPI } from '@/hooks/useElectronAPI';

const { Paragraph } = Typography;

// 備份與還原：手動備份到使用者選的位置（例如隨身碟）、從備份還原、查看每天的自動備份
const BackupCard = () => {
  const api = useElectronAPI();
  const runAction = useAsyncAction();

  const restore = async () => {
    let restored = false;
    await runAction(
      async () => {
        restored = await api.restoreBackup();
      },
      () => (restored ? '已還原備份，畫面將重新載入' : null),
      '還原失敗'
    );
    // 資料整個換掉了，重新載入讓每個畫面都讀到新的資料
    if (restored) setTimeout(() => window.location.reload(), 800);
  };

  return (
    <Card
      title={
        <>
          <SafetyOutlined style={{ marginInlineEnd: 8 }} />
          備份與還原
        </>
      }
    >
      <Paragraph type="secondary">
        宗親名冊與帳目只存在這台電腦裡。請定期備份到隨身碟或雲端硬碟資料夾，電腦故障時才能救回資料。
        <br />
        系統每天第一次開啟時也會自動備份資料庫，保留最近 14 天。
      </Paragraph>
      <Space wrap>
        <Button
          type="primary"
          icon={<CloudDownloadOutlined />}
          onClick={() =>
            runAction(
              () => api.exportBackup(),
              (folder) => (folder ? `已備份到：${folder}` : null),
              '備份失敗'
            )
          }
        >
          立即備份
        </Button>
        <Popconfirm
          title="從備份還原？"
          description="目前所有資料會被備份的內容取代（系統會先自動保留一份目前的資料）。"
          okText="選擇備份資料夾"
          cancelText="取消"
          onConfirm={restore}
        >
          <Button icon={<HistoryOutlined />}>從備份還原</Button>
        </Popconfirm>
        <Button
          icon={<FolderOpenOutlined />}
          onClick={() =>
            runAction(
              () => api.openBackupFolder(),
              () => null,
              '無法開啟資料夾'
            )
          }
        >
          開啟自動備份資料夾
        </Button>
      </Space>
    </Card>
  );
};

export default BackupCard;
