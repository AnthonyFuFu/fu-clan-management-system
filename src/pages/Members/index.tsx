import { useCallback, useState } from 'react';
import { Button, Dropdown, Input, Popconfirm, Select, Table, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import { DownOutlined, FileExcelOutlined, PlusOutlined, UserAddOutlined } from '@ant-design/icons';
import type { Gender, Member, MemberInput, MemberListResult } from '@shared/types';
import { useMemberImport } from '@/components/MemberImport';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useElectronAPI } from '@/hooks/useElectronAPI';
import MemberFormModal, { type MemberFormState } from './components/MemberFormModal';
import { GENDER_LABEL, PAGE_SIZE } from './constants';

interface Filters {
  keyword: string;
  generation?: number;
  gender?: Gender;
  deceased?: boolean;
}

const EMPTY_RESULT: MemberListResult = { rows: [], total: 0, generations: [] };

const Members = () => {
  const api = useElectronAPI();
  const runAction = useAsyncAction();
  const [filters, setFilters] = useState<Filters>({ keyword: '' });
  const [page, setPage] = useState(1);
  const [formState, setFormState] = useState<MemberFormState>(null);

  const { data: branches = [] } = useApiQuery((a) => a.getBranches(), []);
  const {
    data: result = EMPTY_RESULT,
    loading,
    reload,
  } = useApiQuery((a) => a.listMembers({ ...filters, page, pageSize: PAGE_SIZE }), [filters, page]);
  const memberImport = useMemberImport(reload);

  // 改了篩選條件一律回到第一頁
  const updateFilters = useCallback((patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }, []);

  const handleSubmit = async (input: MemberInput) => {
    const editing = formState?.mode === 'edit' ? formState.member : null;
    const ok = editing
      ? await runAction(() => api.updateMember(editing.id, input), `已更新 ${input.name}`, '儲存失敗')
      : await runAction(() => api.createMember(input), `已新增 ${input.name}`, '新增失敗');
    if (ok) {
      setFormState(null);
      // 以同樣的篩選條件與頁碼重新載入
      reload();
    }
  };

  const handleDelete = async (member: Member) => {
    if (await runAction(() => api.deleteMember(member.id), `已刪除 ${member.name}`, '刪除失敗')) {
      reload();
    }
  };

  const columns: TableColumnsType<Member> = [
    { title: '世代', dataIndex: 'generation', width: 90, render: (g: number) => `第 ${g} 世` },
    {
      title: '姓名',
      dataIndex: 'name',
      width: 130,
      render: (name: string, row) => (
        <>
          {name}
          {row.deceased && <Tag style={{ marginInlineStart: 8 }}>已故</Tag>}
        </>
      ),
    },
    {
      title: '性別',
      dataIndex: 'gender',
      width: 70,
      render: (g: Gender) => <Tag color={g === 'M' ? 'blue' : 'magenta'}>{GENDER_LABEL[g]}</Tag>,
    },
    { title: '生日', dataIndex: 'birthday', width: 120, render: (d: string | null) => d ?? '—' },
    { title: '父母', dataIndex: 'parentName', width: 110, render: (name: string | null) => name ?? '（始祖）' },
    { title: '配偶', dataIndex: 'spouseName', width: 110, render: (name: string | null) => name ?? '' },
    { title: '職業', dataIndex: 'job', width: 100, render: (job: string | null) => job ?? '' },
    { title: '手機', dataIndex: 'cellphone', width: 130, render: (v: string | null) => v ?? '' },
    { title: '電話', dataIndex: 'phoneNo', width: 120, render: (v: string | null) => v ?? '' },
    { title: '分支', dataIndex: 'branchName', width: 100, render: (v: string | null) => v ?? '' },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      fixed: 'right',
      render: (_, row) => (
        <>
          <Button type="link" size="small" onClick={() => setFormState({ mode: 'edit', member: row })}>
            修改
          </Button>
          <Button
            type="link"
            size="small"
            icon={<UserAddOutlined />}
            onClick={() =>
              setFormState({ mode: 'create', parent: { id: row.id, name: row.name, generation: row.generation } })
            }
          >
            新增子女
          </Button>
          <Popconfirm
            title={`確定刪除 ${row.name}？`}
            description="刪除後無法復原。已過世的宗親請改用「修改」標記為已故。"
            okText="刪除"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(row)}
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
      <div className="page-header">
        <h1>宗親成員管理</h1>
      </div>

      <div className="page-toolbar">
        <Input.Search
          placeholder="搜尋姓名、配偶、電話"
          allowClear
          onSearch={(keyword) => updateFilters({ keyword: keyword.trim() })}
          style={{ width: 240 }}
        />
        <Select<number>
          allowClear
          placeholder="全部世代"
          value={filters.generation}
          onChange={(generation) => updateFilters({ generation })}
          options={result.generations.map((g) => ({ value: g, label: `第 ${g} 世` }))}
          style={{ width: 130 }}
        />
        <Select<Gender>
          allowClear
          placeholder="全部性別"
          value={filters.gender}
          onChange={(gender) => updateFilters({ gender })}
          options={(['M', 'F'] as const).map((g) => ({ value: g, label: GENDER_LABEL[g] }))}
          style={{ width: 120 }}
        />
        <Select<'living' | 'deceased'>
          allowClear
          placeholder="在世與已故"
          value={filters.deceased === undefined ? undefined : filters.deceased ? 'deceased' : 'living'}
          onChange={(status) => updateFilters({ deceased: status === undefined ? undefined : status === 'deceased' })}
          options={[
            { value: 'living', label: '在世' },
            { value: 'deceased', label: '已故' },
          ]}
          style={{ width: 130 }}
        />
        <div className="page-toolbar-spacer" />
        <Dropdown
          menu={{
            items: [
              { key: 'template', label: '下載匯入範本', onClick: memberImport.downloadTemplate },
              { key: 'import', label: '選擇 Excel 檔案匯入', onClick: memberImport.pickImportFile },
            ],
          }}
        >
          <Button icon={<FileExcelOutlined />}>
            Excel 匯入 <DownOutlined />
          </Button>
        </Dropdown>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormState({ mode: 'create' })}>
          新增成員
        </Button>
      </div>

      <Table<Member>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={result.rows}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: '沒有符合條件的成員' }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: result.total,
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 人`,
          onChange: setPage,
        }}
      />

      <MemberFormModal
        state={formState}
        branches={branches}
        onClose={() => setFormState(null)}
        onSubmit={handleSubmit}
      />
      {memberImport.modal}
    </div>
  );
};

export default Members;
