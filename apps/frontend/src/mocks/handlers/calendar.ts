import { http, HttpResponse } from 'msw';
import { RootType } from '@repo/shared';
import { format } from 'date-fns';

const BASE_URL = 'http://localhost:3000/api'; // Adjust base URL as needed

// Mock Data
const generateMockTransactions = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  
  return [
    // Income
    {
      id: 'mock-1',
      date: `${year}-${month}-05`,
      time: '12:00:00',
      type: RootType.INCOME,
      amount: 5000,
      description: 'Salary',
      categoryId: 'cat-salary',
      accountId: 'acc-bank',
      targetAccountId: null,
      linkId: null,
    },
    // Expense
    {
      id: 'mock-2',
      date: `${year}-${month}-05`,
      time: '12:30:00',
      type: RootType.EXPENSE,
      amount: 150,
      description: 'Lunch',
      categoryId: 'cat-food',
      accountId: 'acc-cash',
      targetAccountId: null,
      linkId: null,
    },
    // Another Expense on same day (to test > 2 items if we add one more)
    {
      id: 'mock-3',
      date: `${year}-${month}-05`,
      time: '18:00:00',
      type: RootType.EXPENSE,
      amount: 300,
      description: 'Dinner',
      categoryId: 'cat-food',
      accountId: 'acc-cash',
      targetAccountId: null,
      linkId: null,
    },
    // Transfer (Outgoing) - Should be displayed
    {
      id: 'mock-4',
      date: `${year}-${month}-10`,
      time: '10:00:00',
      type: RootType.EXPENSE,
      amount: 1000,
      description: 'Transfer to Savings',
      categoryId: 'cat-transfer',
      accountId: 'acc-bank',
      targetAccountId: 'acc-savings',
      linkId: 'mock-5',
    },
    // Transfer (Incoming) - Should be filtered out by logic, but API returns it
    {
      id: 'mock-5',
      date: `${year}-${month}-10`,
      time: '10:00:00',
      type: RootType.INCOME,
      amount: 1000,
      description: 'Transfer from Checking',
      categoryId: 'cat-transfer',
      accountId: 'acc-savings',
      targetAccountId: 'acc-bank', // In incoming transfer, this is the source
      linkId: 'mock-4',
    },
     // Many items for overflow test
    ...Array.from({ length: 5 }).map((_, i) => ({
      id: `mock-overflow-${i}`,
      date: `${year}-${month}-15`,
      time: `09:0${i}:00`,
      type: RootType.EXPENSE,
      amount: 100 * (i + 1),
      description: `Expense ${i + 1}`,
      categoryId: 'cat-misc',
      accountId: 'acc-cash',
      targetAccountId: null,
      linkId: null,
    })),
  ];
};

let mockTransactions = generateMockTransactions();

export const calendarHandlers = [
  // GET /transaction/date
  http.get(`${BASE_URL}/transaction/date`, ({ request }) => {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Basic filtering if params exist, otherwise return all (for simple mock)
    let filtered = mockTransactions;
    if (startDate && endDate) {
        filtered = mockTransactions.filter(t => t.date >= startDate && t.date <= endDate);
    }
    
    // API response structure (ResponseHelper)
    return HttpResponse.json({
      data: {
          items: filtered,
          pagination: {
            total: filtered.length,
            page: 1,
            limit: filtered.length,
            totalPages: 1,
          },
          summary: {
            income: 0,
            expense: 0,
            balance: 0,
          }
      },
      isSuccess: true,
      message: 'Success',
      error: null
    });
  }),

  // PUT /transaction/:id
  http.put(`${BASE_URL}/transaction/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as { date: string };
    
    const index = mockTransactions.findIndex(t => t.id === id);
    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    // Update transaction
    mockTransactions[index] = {
      ...mockTransactions[index],
      date: body.date,
    };
    
    const updatedTransaction = mockTransactions[index];

    // Handle Linked Transaction (Mock Backend Logic)
    if (updatedTransaction.linkId) {
         const linkIndex = mockTransactions.findIndex(t => t.id === updatedTransaction.linkId);
         if (linkIndex !== -1) {
             mockTransactions[linkIndex] = {
                 ...mockTransactions[linkIndex],
                 date: body.date
             };
         }
    }

    return HttpResponse.json({
        data: updatedTransaction,
        isSuccess: true,
        message: 'Success',
        error: null
    });
  }),
];
