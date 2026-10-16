import React, { useMemo, useState } from 'react';
import { Alert, Modal, Segmented, Table, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import { GENDER_LABEL } from '@shared/labels';
import type { Gender, MemberImportPreview, MemberImportRow, MemberImportStatus } from '@shared/types';

const STATUS_TAG: Record<MemberImportStatus, { color: string; label: string }> = {
  new: { color: 'green', label: '新增' },
  skip: { color: 'default', label: '略過' },
  error: { color: 'red', label: '錯誤' },
};

interface ImportPreviewModalProps {
  preview: MemberImportPreview | null;
  importing: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onPickAgain: () => void;
}

const ImportPreviewModal = ({ preview, importing, onClose, onConfirm, onPickAgain }: ImportPreviewModalProps) => {
  const [onlyErrors, setOnlyErrors] = useState(false);
  const rows = useMemo(
    () => (preview ? (onlyErrors ? preview.rows.filter((r) => r.status === 'error') : preview.rows) : []),
    [preview, onlyErrors]
  );

  if (!preview) return null;
  const blocked = preview.errorCount > 0 || preview.newCount === 0;

  const columns: TableColumnsType<MemberImportRow> = [
    { title: 'Excel 列', dataIndex: 'rowNumber', width: 80 },
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '性別', dataIndex: 'gender', width: 60, render: (g: Gender | null) => (g ? GENDER_LABEL[g] : '') },
    { title: '世代', dataIndex: 'generation', width: 70, render: (g: number | null) => (g ? `第 ${g} 世` : '') },
    { title: '父母', dataIndex: 'parentName', width: 100, render: (v: string | null) => v ?? '' },
    { title: '生日', dataIndex: 'birthday', width: 110, render: (v: string | null) => v ?? '' },
    { title: '已故', dataIndex: 'deceased', width: 60, render: (v: boolean) => (v ? '是' : '') },
    {
      title: '狀態',
      dataIndex: 'status',
      width: 70,
      render: (status: MemberImportStatus) => <Tag color={STATUS_TAG[status].color}>{STATUS_TAG[status].label}</Tag>,
    },
    { title: '說明', dataIndex: 'messages', render: (messages: string[]) => messages.join('；') },
  ];

  return (
    <Modal
      title={`匯入預覽：${preview.fileName}`}
      open
      width={1000}
      onCancel={onClose}
      okText={`匯入 ${preview.newCount} 人`}
      okButtonProps={{ disabled: blocked, loading: importing }}
      onOk={onConfirm}
      cancelText="取消"
      footer={(_, { OkBtn, CancelBtn }) => (
        <>
          <a onClick={onPickAgain} style={{ float: 'left', lineHeight: '32px' }}>
            重新選擇檔案
          </a>
          <CancelBtn />
          <OkBtn />
        </>
      )}
    >
      {preview.errorCount > 0 ? (
        <Alert
          type="error"
          showIcon
          title={`有 ${preview.errorCount} 列需要修正，修正 Excel 後請重新選擇檔案`}
          description="為避免族譜關係只匯入一半，檔案有任何錯誤時都不會匯入。"
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Alert
          type={preview.newCount > 0 ? 'success' : 'info'}
          showIcon
          title={
            preview.newCount > 0
              ? `將新增 ${preview.newCount} 人${preview.skipCount > 0 ? `，略過 ${preview.skipCount} 位已存在的成員` : ''}`
              : '檔案中的成員都已存在，沒有需要新增的人'
          }
          description={preview.newBranches.length > 0 ? `會自動新增分支：${preview.newBranches.join('、')}` : undefined}
          style={{ marginBottom: 16 }}
        />
      )}

      {preview.errorCount > 0 && (
        <Segmented<'all' | 'errors'>
          value={onlyErrors ? 'errors' : 'all'}
          onChange={(v) => setOnlyErrors(v === 'errors')}
          options={[
            { value: 'all', label: `全部 ${preview.rows.length}` },
            { value: 'errors', label: `只看錯誤 ${preview.errorCount}` },
          ]}
          style={{ marginBottom: 12 }}
        />
      )}

      <Table<MemberImportRow>
        rowKey="rowNumber"
        size="small"
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 50, hideOnSinglePage: true }}
        scroll={{ y: 400 }}
      />
    </Modal>
  );
};

export default ImportPreviewModal;
