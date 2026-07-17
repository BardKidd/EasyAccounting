import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { ExtraAmountInline } from './extraAmountInline';

interface ExtraFields {
  extraAdd: number;
  extraAddLabel: string;
  extraMinus: number;
  extraMinusLabel: string;
}

function Wrapper({
  defaultValues,
}: {
  defaultValues?: Partial<ExtraFields>;
}) {
  const form = useForm<ExtraFields>({
    defaultValues: {
      extraAdd: 0,
      extraAddLabel: '折扣',
      extraMinus: 0,
      extraMinusLabel: '手續費',
      ...defaultValues,
    },
  });
  return (
    <FormProvider {...form}>
      <ExtraAmountInline />
    </FormProvider>
  );
}

describe('ExtraAmountInline', () => {
  it('預設收合，顯示預設提示文字，看不到輸入格', () => {
    render(<Wrapper />);

    expect(screen.getByText('額外金額（折扣／手續費）')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /額外金額/ }).getAttribute(
        'aria-expanded',
      ),
    ).toBe('false');
    expect(screen.queryByLabelText('加項金額')).toBeNull();
  });

  it('點擊展開後出現加項／減項輸入格', () => {
    render(<Wrapper />);

    fireEvent.click(screen.getByRole('button', { name: /額外金額/ }));

    expect(screen.getByLabelText('加項名稱')).toBeTruthy();
    expect(screen.getByLabelText('加項金額')).toBeTruthy();
    expect(screen.getByLabelText('減項名稱')).toBeTruthy();
    expect(screen.getByLabelText('減項金額')).toBeTruthy();
  });

  it('輸入加項金額後，摘要顯示名稱與金額', () => {
    render(<Wrapper />);

    fireEvent.click(screen.getByRole('button', { name: /額外金額/ }));
    fireEvent.change(screen.getByLabelText('加項金額'), {
      target: { value: '20' },
    });

    expect(screen.getByText('折扣 +20')).toBeTruthy();
  });

  it('編輯模式帶初始值時直接顯示摘要', () => {
    render(<Wrapper defaultValues={{ extraAdd: 20 }} />);

    expect(screen.getByText('折扣 +20')).toBeTruthy();
  });

  it('加項減項都有值時摘要並列', () => {
    render(<Wrapper defaultValues={{ extraAdd: 20, extraMinus: 15 }} />);

    expect(screen.getByText('折扣 +20 · 手續費 −15')).toBeTruthy();
  });
});
