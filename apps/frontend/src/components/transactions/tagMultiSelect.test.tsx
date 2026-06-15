import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagMultiSelect } from './tagMultiSelect';

vi.mock('@/services/tagService', () => ({
  getTags: vi.fn(),
  createTag: vi.fn(),
}));

import { getTags, createTag } from '@/services/tagService';

const TAGS = [
  {
    id: 't1',
    userId: 'u1',
    name: '美食',
    color: '#ff0000',
    groupName: null,
    isArchived: false,
  },
  {
    id: 't2',
    userId: 'u1',
    name: '交通',
    color: '#0000ff',
    groupName: null,
    isArchived: false,
  },
];

describe('TagMultiSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getTags as any).mockResolvedValue(TAGS);
  });

  it('依 value 顯示已選 chip，移除時呼叫 onChange', async () => {
    const onChange = vi.fn();
    render(<TagMultiSelect value={['t1']} onChange={onChange} />);

    // 已選的「美食」chip 應出現（等 getTags 完成）
    expect(await screen.findByText('美食')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('移除標籤 美食'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('開啟 popover 點選未選標籤 → onChange 加入', async () => {
    const onChange = vi.fn();
    render(<TagMultiSelect value={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /標籤/ }));

    const option = await screen.findByText('交通');
    fireEvent.click(option);
    expect(onChange).toHaveBeenCalledWith(['t2']);
  });

  it('搜尋不到時可 on-the-fly 建立標籤', async () => {
    (createTag as any).mockResolvedValue({
      isSuccess: true,
      data: {
        id: 't3',
        userId: 'u1',
        name: '日本旅遊',
        color: '#6b7280',
        groupName: null,
        isArchived: false,
      },
    });
    const onChange = vi.fn();
    render(<TagMultiSelect value={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /標籤/ }));

    const input = await screen.findByPlaceholderText('搜尋或建立標籤');
    fireEvent.change(input, { target: { value: '日本旅遊' } });

    fireEvent.click(await screen.findByText(/建立「日本旅遊」/));

    await waitFor(() =>
      expect(createTag).toHaveBeenCalledWith({ name: '日本旅遊' }),
    );
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['t3']));
  });
});
