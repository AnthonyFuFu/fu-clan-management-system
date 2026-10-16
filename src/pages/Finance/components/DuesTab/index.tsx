import React, { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Input, Popconfirm, Segmented, Table, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { PlusOutlined, CheckOutlined } from '@ant-design/icons';
import type { DuesRecord } from '@shared/types';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { formatMoney } from '@/utils/format';
import AddMemberModal from './AddMemberModal';
import CreateYearModal from './CreateYearModal';
import EditDuesModal from './EditDuesModal';
import PayModal from './PayModal';
import { isSettled, StatusTag } from './status';

const { Text } = Typography;

interface DuesTabProps {
  year: number;
  version: number;
  onChanged: () => void;
}

type StatusFilter = 'all' | 'unpaid' | 'paid';

const DuesTab = ({ year, version, onChanged }: DuesTabProps) => {
  const runAction = useAsyncAction();
  const api = window.electronAPI!;
  const [rows, setRows] = useState<DuesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [keyword, setKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<number[] | null>(null);
  const [editing, setEditing] = useState<DuesRecord | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setSelectedIds([]);
    api
      .getDues(year)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [api, year, version]);

  // 每次寫入：顯示結果，成功後通知所有財務畫面重新載入
  const run = async <T,>(action: () => Promise<T>, success: string | ((result: T) => string), errorPrefix?: string) => {
    const ok = await runAction(action, success, errorPrefix);
    if (ok) onChanged();
    return ok;
  };

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (statusFilter === 'paid' && !isSettled(row)) return false;
        if (statusFilter === 'unpaid' && isSettled(row)) return false;
        return keyword === '' || row.name.includes(keyword);
      }),
    [rows, statusFilter, keyword]
  );

  const unpaidCount = rows.filter((row) => !isSettled(row)).length;
  const expected = rows.reduce((sum, row) => sum + row.amountDue, 0);
  const collected = rows.reduce((sum, row) => sum + (row.paidDate ? row.amountDue : 0), 0);

  const columns: TableColumnsType<DuesRecord> = [
    { title: '世代', dataIndex: 'generation', width: 90, render: (g: number) => `第 ${g} 世` },
    { title: '姓名', dataIndex: 'name', width: 120 },
    {
      title: '應繳金額',
      dataIndex: 'amountDue',
      width: 120,
      align: 'right',
      render: (amount: number) => <span className="finance-amount">{formatMoney(amount)}</span>,
    },
    { title: '狀態', key: 'status', width: 80, render: (_, row) => <StatusTag row={row} /> },
    { title: '繳費日期', dataIndex: 'paidDate', width: 120, render: (date: string | null) => date ?? '—' },
    { title: '備註', dataIndex: 'note', ellipsis: true, render: (note: string | null) => note ?? '' },
    {
      title: '操作',
      key: 'actions',
      width: 230,
      render: (_, row) => (
        <>
          {row.amountDue > 0 &&
            (row.paidDate ? (
              <Popconfirm
                title={`確定取消 ${row.name} 的繳費紀錄？`}
                onConfirm={() => run(() => api.setDuesPaid([row.id], null), '已取消繳費紀錄')}
              >
                <Button type="link" size="small">
                  取消繳費
                </Button>
              </Popconfirm>
            ) : (
              <Button type="link" size="small" onClick={() => setPayTarget([row.id])}>
                登記繳費
              </Button>
            ))}
          <Button type="link" size="small" onClick={() => setEditing(row)}>
            編輯
          </Button>
          <Popconfirm
            title={`將 ${row.name} 從 ${year} 年度應繳名單移除？`}
            description={row.paidDate ? '此人已繳費，移除後收入會一併扣除。' : undefined}
            onConfirm={() => run(() => api.removeDues(row.id), '已從名單移除')}
          >
            <Button type="link" size="small" danger>
              移除
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  if (!loading && rows.length === 0) {
    return (
      <>
        <Empty description={`${year} 年度尚未開立會費`}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            開立 {year} 年度會費
          </Button>
        </Empty>
        <CreateYearModal
          year={year}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={async (amount) => {
            const ok = await run(
              () => api.createDuesYear(year, amount),
              (count) => `已開立 ${year} 年度會費，共 ${count} 人`,
              '開立失敗'
            );
            if (ok) setCreateOpen(false);
          }}
        />
      </>
    );
  }

  const unpaidSelected = selectedIds.filter((id) => {
    const row = rows.find((r) => r.id === id);
    return row && !isSettled(row);
  });

  return (
    <div>
      <div className="page-toolbar">
        <Segmented<StatusFilter>
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: `全部 ${rows.length}` },
            { value: 'unpaid', label: `未繳 ${unpaidCount}` },
            { value: 'paid', label: `已繳 ${rows.length - unpaidCount}` },
          ]}
        />
        <Input.Search
          placeholder="搜尋姓名"
          allowClear
          onChange={(e) => setKeyword(e.target.value.trim())}
          style={{ width: 200 }}
        />
        <div className="page-toolbar-spacer" />
        <Button
          icon={<CheckOutlined />}
          disabled={unpaidSelected.length === 0}
          onClick={() => setPayTarget(unpaidSelected)}
        >
          批次登記繳費{unpaidSelected.length > 0 ? `（${unpaidSelected.length}）` : ''}
        </Button>
        <Button icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
          加入成員
        </Button>
      </div>

      <Table<DuesRecord>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as number[]),
          getCheckboxProps: (row) => ({ disabled: isSettled(row) }),
        }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={3}>
              <Text strong>合計</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} colSpan={5}>
              <Text>
                應收 {formatMoney(expected)}，已收 <Text type="success">{formatMoney(collected)}</Text>，未收{' '}
                <Text type="warning">{formatMoney(expected - collected)}</Text>
              </Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />

      <PayModal
        count={payTarget?.length ?? 0}
        open={payTarget !== null}
        onClose={() => setPayTarget(null)}
        onSubmit={async (date) => {
          if (payTarget && (await run(() => api.setDuesPaid(payTarget, date), `已登記 ${payTarget.length} 人繳費`))) {
            setPayTarget(null);
            setSelectedIds([]);
          }
        }}
      />
      <EditDuesModal
        record={editing}
        onClose={() => setEditing(null)}
        onSubmit={async (amount, note) => {
          if (editing && (await run(() => api.updateDues(editing.id, amount, note), '已更新'))) {
            setEditing(null);
          }
        }}
      />
      <AddMemberModal
        year={year}
        open={addOpen}
        existingMemberIds={rows.map((row) => row.memberId)}
        onClose={() => setAddOpen(false)}
        onSubmit={async (memberId, amount) => {
          if (await run(() => api.addDuesMember(year, memberId, amount), '已加入應繳名單')) {
            setAddOpen(false);
          }
        }}
      />
    </div>
  );
};

export default DuesTab;
