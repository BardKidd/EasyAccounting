import Category from '@/models/category';
import { Op } from 'sequelize';
import ExcelJS from 'exceljs';
import Account from '@/models/account';
import { generateSasUrl, uploadFileToBlob } from '@/utils/azureBlob';
import { MainType, TransactionType } from '@repo/shared';
import Transaction from '@/models/transaction';
import User from '@/models/user';

interface SimplifyCategory {
  id: string;
  name: string;
  userId: string | null;
  children: SimplifyCategory[];
  parentId: string | null;
  parent: SimplifyCategory | null;
}
const getAllCategoriesHyphenString = async (userId: string) => {
  const categories = await Category.findAll({
    where: {
      [Op.or]: [{ userId }, { userId: null }],
    },
    raw: true,
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'name', 'parentId', 'userId'],
  });

  const categoryMap = new Map<string, SimplifyCategory>();

  categories.forEach((cat) => {
    const node: SimplifyCategory = {
      id: cat.id,
      name: cat.name,
      userId: cat.userId,
      children: [],
      parentId: cat.parentId,
      parent: null,
    };
    categoryMap.set(node.id, node);
  });

  // root > main > sub
  const mainCategories: SimplifyCategory[] = [];
  const rootCategoriesId: string[] = [];
  categoryMap.forEach((node) => {
    if (node.parentId && categoryMap.has(node.parentId)) {
      const parent = categoryMap.get(node.parentId)!;
      parent.children.push(node);
      node.parent = parent;
      mainCategories.push(node);
    } else {
      rootCategoriesId.push(node.id);
    }
  });
  const stringCollection: string[] = [];

  mainCategories.forEach((cat) => {
    cat.children.forEach((subCat) => {
      stringCollection.push(`${cat.name} - ${subCat.name}`);
    });

    // 沒有子分類但 parentId 為 root 分類的話就代表是 mainCategory，要加進來。
    if (
      cat.children.length === 0 &&
      cat.parentId &&
      rootCategoriesId.includes(cat.parentId)
    ) {
      stringCollection.push(cat.name);
    }
  });

  return stringCollection;
};

// 專注於繪製 Excel 模板
const generateTransactionsTemplateBuffer = async ({
  accounts,
  categories,
  transactions,
}: {
  accounts: string[];
  categories: string[];
  transactions?: TransactionType[];
}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('交易紀錄');

  worksheet.columns = [
    {
      header: '日期',
      key: 'date',
      width: 15,
    },
    {
      header: '時間',
      key: 'time',
      width: 15,
    },
    {
      header: '類型',
      key: 'type',
      width: 15,
    },
    {
      header: '金額',
      key: 'amount',
      width: 15,
    },
    {
      header: '帳戶',
      key: 'account',
      width: 15,
    },
    {
      header: '目標帳戶',
      key: 'targetAccount',
      width: 15,
    },
    {
      header: '分類',
      key: 'category',
      width: 15,
    },
    {
      header: '發票',
      key: 'receipt',
      width: 15,
    },
    {
      header: '描述',
      key: 'description',
      width: 30,
    },
  ];

  // 隱形的選項清單
  const optionSheet = workbook.addWorksheet('_Options');
  optionSheet.state = 'hidden';

  // 把帳號和分類寫入
  accounts.forEach((a, i) => (optionSheet.getCell(`A${i + 1}`).value = a));
  categories.forEach((c, i) => (optionSheet.getCell(`B${i + 1}`).value = c));

  if (transactions && transactions.length > 0) {
    transactions.forEach((t) => worksheet.addRow(t));
  } else {
    // 否則就插入範例資料
    worksheet.insertRow(2, {
      date: '2025-01-01',
      time: '12:30:30',
      type: '收入',
      amount: 10000,
      account: '錢包',
      targetAccount: '',
      category: '飲食 - 早餐',
      receipt: '',
      description: '這是範例行，時間日期需要按照範例格式填寫',
    });
  }
  const startRow = 2;

  for (let row = startRow; row <= 1001; row++) {
    const r = worksheet.getRow(row);

    r.getCell('A').numFmt = 'yyyy-mm-dd';

    r.getCell('B').numFmt = 'hh:mm:ss';

    // 只有三筆所以直接手動寫死
    r.getCell('C').dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"收入,支出,操作"'],
    };

    r.getCell('E').dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [`_Options!$A$1:$A${accounts.length || 1}`],
    };

    r.getCell('F').dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [`_Options!$A$1:$A${accounts.length || 1}`],
    };

    r.getCell('G').dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [`_Options!$B$1:$B${categories.length || 1}`],
    };
  }

  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
};

const exportTransactionsTemplateExcel = async (userId: string) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }
  const userEmail = user.email;

  const accounts = await Account.findAll({
    where: { userId },
    attributes: ['name'],
    raw: true,
  });
  const accountNames = accounts.map((a) => a.name);

  const categoryNames = await getAllCategoriesHyphenString(userId);

  // 產生檔案
  const buffer = await generateTransactionsTemplateBuffer({
    accounts: accountNames,
    categories: categoryNames,
  });

  // 上傳到 Azure Blob
  const blobName = `templates/transactions_template_${userEmail}.xlsx`;
  await uploadFileToBlob(blobName, buffer);

  return generateSasUrl(blobName, 15);
};

const exportUserTransactionsExcel = async (userId: string) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }
  const userEmail = user.email;

  const accounts = await Account.findAll({
    where: { userId },
    attributes: ['id', 'name'],
    raw: true,
  });
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const accountNames = accounts.map((a) => a.name);

  const categories = await Category.findAll({
    where: {
      [Op.or]: [{ userId }, { userId: null }],
    },
    attributes: ['id', 'name', 'parentId'],
    raw: true,
  });
  const categoryMap = new Map(
    categories.map((c) => {
      const parentName = categories.find((cat) => cat.id === c.parentId)?.name;
      const combinedParentAndChild = c.parentId
        ? `${parentName} - ${c.name}`
        : c.name;
      return [c.id, combinedParentAndChild];
    })
  );

  const transactions = await Transaction.findAll({
    where: { userId },
    attributes: [
      'date',
      'time',
      'type',
      'amount',
      'accountId',
      'targetAccountId',
      'categoryId',
      'receipt',
      'description',
    ],
    raw: true,
    order: [
      ['date', 'DESC'],
      ['time', 'DESC'],
    ],
  });
  // 排除被動轉帳收入 (INCOME + 有 targetAccountId)
  const excelTransactions = transactions
    .filter((t) => !(t.type === MainType.INCOME && t.targetAccountId))
    .map((t) => ({
      ...t,
      type: t.targetAccountId ? MainType.OPERATE : t.type,
      account: accountMap.get(t.accountId) || '',
      targetAccount: t.targetAccountId
        ? accountMap.get(t.targetAccountId) || ''
        : '',
      category: categoryMap.get(t.categoryId) || '',
    }));

  // 格式有空格為："飲食 - 早餐"
  const categoryNames = await getAllCategoriesHyphenString(userId);

  // 產生檔案
  const buffer = await generateTransactionsTemplateBuffer({
    accounts: accountNames,
    categories: categoryNames,
    transactions: excelTransactions as unknown as TransactionType[], // 這裡強制轉型，因為我們的 generate function 還是用 TransactionType，但其實我們要傳的是處理過後的物件
  });

  // 上傳到 Azure Blob
  const blobName = `transactions/${userEmail}_transactions.xlsx`;
  await uploadFileToBlob(blobName, buffer);

  return generateSasUrl(blobName, 15);
};

export default {
  getAllCategoriesHyphenString,
  generateTransactionsTemplateBuffer,
  exportTransactionsTemplateExcel,
  exportUserTransactionsExcel,
};
