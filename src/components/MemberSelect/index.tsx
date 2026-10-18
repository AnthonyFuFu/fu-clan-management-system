import { useState } from 'react';
import { Select } from 'antd';
import type { MemberSummary } from '@shared/types';
import { useApiQuery } from '@/hooks/useApiQuery';

interface MemberSelectProps {
  // value / onChange 由 antd Form.Item 注入
  value?: number | null;
  onChange?: (value: number | null) => void;
  // 選取或清除時一併拿到成員資料（例如用來計算世代）
  onSelectMember?: (member: MemberSummary | null) => void;
  // 編輯時已選好的成員：搜尋結果裡還沒有它時，仍能正確顯示名字
  initialOption?: MemberSummary | null;
  // 列出但不能選（例如已在名單上、自己）
  disabledIds?: number[];
  placeholder?: string;
  allowClear?: boolean;
}

// 以姓名搜尋宗親的下拉選單：每次只向資料庫取 20 筆，宗親人數多也不會卡。
const MemberSelect = ({
  value,
  onChange,
  onSelectMember,
  initialOption,
  disabledIds = [],
  placeholder = '輸入姓名搜尋',
  allowClear,
}: MemberSelectProps) => {
  const [keyword, setKeyword] = useState('');
  // 打字很快時只採用最後一次搜尋的結果
  const { data: options = [] } = useApiQuery((api) => api.searchMembers(keyword), [keyword], {
    errorPrefix: '搜尋宗親失敗',
  });

  const merged =
    initialOption && !options.some((m) => m.id === initialOption.id) ? [initialOption, ...options] : options;

  return (
    <Select<number>
      value={value ?? undefined}
      onChange={(id) => {
        onChange?.(id ?? null);
        onSelectMember?.(merged.find((m) => m.id === id) ?? null);
      }}
      showSearch={{ filterOption: false, onSearch: setKeyword }}
      allowClear={allowClear}
      placeholder={placeholder}
      options={merged.map((m) => ({
        value: m.id,
        label: `${m.name}（第 ${m.generation} 世）`,
        disabled: disabledIds.includes(m.id),
      }))}
    />
  );
};

export default MemberSelect;
