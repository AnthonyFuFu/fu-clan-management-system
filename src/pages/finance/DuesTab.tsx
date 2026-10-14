import React, { useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { PlusOutlined, CheckOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { DATE_FORMAT, DEFAULT_DUES_AMOUNT, errorMessage, formatMoney } from './constants';

const { Text, Paragraph } = Typography;

interface DuesTabProps {
  year: number;
  version: number;
  onChanged: () => void;
}

type StatusFilter = 'all' | 'unpaid' | 'paid';

// amountDue 0 = 減免（exempt）: on the roster, but nothing to collect.
function isSettled(row: DuesRecord): boolean {
  return row.paidDate !== null || row.amountDue === 0;
}

function StatusTag({ row }: { row: DuesRecord }) {
  if (row.amountDue === 0) {
    return <Tag>免繳</Tag>;
  }
  return row.paidDate ? <Tag color="green">已繳</Tag> : <Tag color="orange">未繳</Tag>;
}

const DuesTab = ({ year, version, onChanged }: DuesTabProps) => {
  const { message } = App.useApp();
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

  // Wrap every write: report the outcome, then reload all finance views.
  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      message.success(success);
      onChanged();
      return true;
    } catch (error) {
      message.error(`操作失敗：${errorMessage(error)}`);
      return false;
    }
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
            try {
              const count = await api.createDuesYear(year, amount);
              message.success(`已開立 ${year} 年度會費，共 ${count} 人`);
              setCreateOpen(false);
              onChanged();
            } catch (error) {
              message.error(`開立失敗：${errorMessage(error)}`);
            }
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
      <div className="finance-toolbar">
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
        <div className="finance-toolbar-spacer" />
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
        應繳名單會沿用前一年度的名單；如果是第一次開立，則列入當年滿 20 歲、未滿 100 歲（或未登記生日）的宗親。開立後仍可個別加入、移除或調整金額。
      </Paragraph>
      <Form form={form} layout="vertical" initialValues={{ amount: DEFAULT_DUES_AMOUNT }} onFinish={(v) => onSubmit(v.amount)}>
        <Form.Item label="每人會費" name="amount" rules={[{ required: true, message: '請輸入金額' }]}>
          <InputNumber min={0} precision={0} step={100} suffix="元" style={{ width: 200 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

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
      <Form form={form} layout="vertical" initialValues={{ date: dayjs() }} onFinish={(v) => onSubmit(v.date.format(DATE_FORMAT))}>
        <Form.Item label="繳費日期" name="date" rules={[{ required: true, message: '請選擇日期' }]}>
          <DatePicker format={DATE_FORMAT} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const EditDuesModal = ({
  record,
  onClose,
  onSubmit,
}: {
  record: DuesRecord | null;
  onClose: () => void;
  onSubmit: (amount: number, note: string | null) => Promise<void>;
}) => {
  const [form] = Form.useForm<{ amount: number; note?: string }>();
  return (
    <Modal
      title={record ? `編輯：${record.name}` : ''}
      open={record !== null}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      {record && (
        <Form
          form={form}
          layout="vertical"
          initialValues={{ amount: record.amountDue, note: record.note ?? '' }}
          onFinish={(v) => onSubmit(v.amount, v.note?.trim() || null)}
        >
          <Form.Item label="應繳金額" name="amount" extra="減免可調低金額，設為 0 即為免繳" rules={[{ required: true, message: '請輸入金額' }]}>
            <InputNumber min={0} precision={0} step={100} suffix="元" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item label="備註" name="note">
            <Input.TextArea rows={2} maxLength={200} placeholder="例如：減半（清寒）、代繳人、收據編號" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

const AddMemberModal = ({
  year,
  open,
  existingMemberIds,
  onClose,
  onSubmit,
}: {
  year: number;
  open: boolean;
  existingMemberIds: number[];
  onClose: () => void;
  onSubmit: (memberId: number, amount: number) => Promise<void>;
}) => {
  const [form] = Form.useForm<{ memberId: number; amount: number }>();
  const [options, setOptions] = useState<MemberSummary[]>([]);

  const search = (keyword: string) => {
    window.electronAPI?.searchMembers(keyword).then(setOptions);
  };

  useEffect(() => {
    if (open) search('');
  }, [open]);

  return (
    <Modal title={`加入 ${year} 年度應繳名單`} open={open} onCancel={onClose} onOk={() => form.submit()} destroyOnHidden>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ amount: DEFAULT_DUES_AMOUNT }}
        onFinish={(v) => onSubmit(v.memberId, v.amount)}
      >
        <Form.Item label="宗親" name="memberId" rules={[{ required: true, message: '請選擇宗親' }]}>
          <Select
            showSearch={{ filterOption: false, onSearch: search }}
            placeholder="輸入姓名搜尋"
            options={options.map((m) => ({
              value: m.id,
              label: `${m.name}（第 ${m.generation} 世）`,
              disabled: existingMemberIds.includes(m.id),
            }))}
          />
        </Form.Item>
        <Form.Item label="應繳金額" name="amount" rules={[{ required: true, message: '請輸入金額' }]}>
          <InputNumber min={0} precision={0} step={100} suffix="元" style={{ width: 200 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DuesTab;
