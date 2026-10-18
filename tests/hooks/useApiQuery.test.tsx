import { useState } from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useApiQuery } from '@/hooks/useApiQuery';
import { mockElectronAPI, renderWithAntd } from '../helpers/electronAPI';

// 依 keyword 搜尋，畫面顯示搜尋結果的第一個名字
const SearchProbe = () => {
  const [keyword, setKeyword] = useState('a');
  const { data, loading } = useApiQuery((api) => api.searchMembers(keyword), [keyword]);
  return (
    <div>
      <button onClick={() => setKeyword('b')}>search b</button>
      <span data-testid="result">{loading ? 'loading' : (data?.[0]?.name ?? 'none')}</span>
    </div>
  );
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('ignores a slower, older response that arrives after a newer one', async () => {
  const first = deferred<{ id: number; name: string; generation: number }[]>();
  const second = deferred<{ id: number; name: string; generation: number }[]>();
  mockElectronAPI({
    searchMembers: vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise),
  });
  renderWithAntd(<SearchProbe />);

  await userEvent.click(screen.getByRole('button', { name: 'search b' }));
  await act(async () => second.resolve([{ id: 2, name: '傅新', generation: 20 }]));
  expect(screen.getByTestId('result')).toHaveTextContent('傅新');

  // 舊的查詢比較晚回來，不能蓋掉新的結果
  await act(async () => first.resolve([{ id: 1, name: '傅舊', generation: 20 }]));
  expect(screen.getByTestId('result')).toHaveTextContent('傅新');
});

test('shows an error message when the query fails and stops loading', async () => {
  mockElectronAPI({
    searchMembers: vi
      .fn()
      .mockRejectedValue(new Error("Error invoking remote method 'searchMembers': Error: 資料庫忙碌中")),
  });
  renderWithAntd(<SearchProbe />);

  expect(await screen.findByText('讀取資料失敗：資料庫忙碌中')).toBeInTheDocument();
  expect(screen.getByTestId('result')).toHaveTextContent('none');
});

test('does not query in a plain browser', () => {
  renderWithAntd(<SearchProbe />);
  expect(screen.getByTestId('result')).toHaveTextContent('none');
});
