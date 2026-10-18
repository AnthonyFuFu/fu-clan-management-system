import { Button, Popconfirm, Table, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { DownloadOutlined, FileOutlined, FolderOpenOutlined, UploadOutlined } from '@ant-design/icons';
import type { DocumentFile } from '@shared/types';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useElectronAPI } from '@/hooks/useElectronAPI';
import { formatDateTime, formatFileSize, savedFileMessage } from '@/utils/format';

const { Text } = Typography;

const FilesTab = () => {
  const api = useElectronAPI();
  const runAction = useAsyncAction();
  const { data: files = [], loading, reload } = useApiQuery((a) => a.listDocuments(), []);

  const upload = async () => {
    if (
      await runAction(
        () => api.uploadDocuments(),
        (count) => (count > 0 ? `已上傳 ${count} 個檔案` : null),
        '上傳失敗'
      )
    ) {
      reload();
    }
  };

  const columns: TableColumnsType<DocumentFile> = [
    {
      title: '檔名',
      dataIndex: 'fileName',
      render: (name: string) => (
        <>
          <FileOutlined style={{ marginInlineEnd: 8, color: 'rgba(0,0,0,0.45)' }} />
          {name}
        </>
      ),
    },
    { title: '大小', dataIndex: 'size', width: 110, align: 'right', render: formatFileSize },
    { title: '上傳時間', dataIndex: 'uploadedAt', width: 170, render: formatDateTime },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_, row) => (
        <>
          <Button
            type="link"
            size="small"
            icon={<FolderOpenOutlined />}
            onClick={() =>
              runAction(
                () => api.openDocument(row.id),
                () => null,
                '開啟失敗'
              )
            }
          >
            開啟
          </Button>
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => runAction(() => api.downloadDocument(row.id), savedFileMessage, '下載失敗')}
          >
            下載
          </Button>
          <Popconfirm
            title={`確定刪除「${row.fileName}」？`}
            description="刪除後無法復原。"
            onConfirm={async () => {
              if (await runAction(() => api.deleteDocument(row.id), '已刪除', '刪除失敗')) reload();
            }}
          >
            <Button type="link" size="small" danger>
              刪除
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div>
      <div className="page-toolbar">
        <Text type="secondary">上傳的檔案會複製一份保存在本機的系統資料夾中，原始檔案移動或刪除都不影響。</Text>
        <div className="page-toolbar-spacer" />
        <Button type="primary" icon={<UploadOutlined />} onClick={upload}>
          上傳檔案
        </Button>
      </div>
      <Table<DocumentFile>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={files}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: '尚未上傳任何檔案' }}
      />
    </div>
  );
};

export default FilesTab;
