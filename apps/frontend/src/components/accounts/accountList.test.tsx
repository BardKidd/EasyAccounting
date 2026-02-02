import { Account, AccountType } from '@repo/shared';
import AccountList from './accountList';
import { render, screen } from '@testing-library/react';

const mockData: AccountType[] = [
  {
    id: '1',
    userId: '1',
    name: '錢包',
    type: Account.CASH,
    balance: 100,
    color: 'red',
    isArchived: true,
    icon: 'wallet',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

test('account list should show 5 type of account', () => {
  render(<AccountList accounts={mockData} />);

  const moneyEl = screen.getByText(Account.CASH);
  const bankEl = screen.getByText(Account.BANK);
  const creditCardEl = screen.getByText(Account.CREDIT_CARD);
  const securitiesAccountEl = screen.getByText(Account.SECURITIES_ACCOUNT);
  const otherEl = screen.getByText(Account.OTHER);

  expect(moneyEl).toBeInTheDocument();
  expect(bankEl).toBeInTheDocument();
  expect(creditCardEl).toBeInTheDocument();
  expect(securitiesAccountEl).toBeInTheDocument();
  expect(otherEl).toBeInTheDocument();
});

test('renders account list', () => {
  render(<AccountList accounts={mockData} />);

  expect(screen.getByText('錢包')).toBeInTheDocument();

  const colorBar = screen.getByTestId('account-color');
  expect(colorBar).toHaveAttribute('style', 'background-color: red;');

  const moneyEl = screen.getByTestId('account-balance');

  expect(moneyEl).toHaveTextContent('$100');
});
