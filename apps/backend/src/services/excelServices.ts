import Category from '@/models/category';
import { Op } from 'sequelize';
import ExcelJS from 'exceljs';
import Account from '@/models/account';
import { generateSasUrl, uploadFileToBlob } from '@/utils/azureBlob';
import {
  CreateTransactionSchema,
  CreateTransferSchema,
  MainType,
  PaymentFrequency,
} from '@repo/shared';
import Transaction from '@/models/transaction';
import User from '@/models/user';
import { format } from 'date-fns';
import transactionServices from './transactionServices';
import { transactionColumns } from '@/excelColumns/transactionColumns';

interface SimplifyCategory {
  id: string;
  name: string;
  userId: string | null;
  children: SimplifyCategory[];
  parentId: string | null;
  parent: SimplifyCategory | null;
}

interface ImportTransactionRow {
  date: string;
  time: string;
  type: string;
  amount: number;
  account: string;
  targetAccount?: string | null;
  category: string;
  receipt?: string;
  description?: string;
  // 只有 User 輸入錯誤時才會有這個值
  error?: string;
  errFields?: string[];
}

/**
 * 取得所有類型的 name，並以 - 分隔。e.g. 飲食-早餐
 * @param userId
 * @returns ["飲食-早餐", "飲食-午餐", ...]
 */
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
      stringCollection.push(`${cat.name}-${subCat.name}`);
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

  return { stringCollection, categories };
};

/**
 * 取得該 Excel 模板常用的下拉選單資料
 * @param userId
 * @returns accounts: 該 User 的所有帳戶名原生資料
 * @returns accountNames: 該 User 的所有帳戶名。string[]
 * @returns categories: 該 User 以及預設的所有分類原生資料
 * @returns categoryNames: 該 User 以及預設的分類，以結合的方式命名 e.g. ["飲食-早餐", "飲食-午餐", ...]
 */
const getPersonnelAccountsAndCategoriesForExcelDropdown = async (
  userId: string
) => {
  const accounts = await Account.findAll({
    where: { userId },
    attributes: ['id', 'name'],
    raw: true,
  });
  const accountNames = accounts.map((a) => a.name);

  const { stringCollection: categoryNames, categories } =
    await getAllCategoriesHyphenString(userId);

  return {
    accounts,
    accountNames,
    categoryNames,
    categories,
  };
};

// 專注於繪製 Excel 模板
const generateTransactionsBuffer = async ({
  userId,
  hasErrorColumn = false,
  transactions,
}: {
  userId: string;
  hasErrorColumn: boolean;
  transactions?: ImportTransactionRow[];
}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('交易紀錄');
  const colOffset = hasErrorColumn ? 1 : 0;

  worksheet.columns = hasErrorColumn
    ? [{ header: '錯誤說明', key: 'error', width: 100 }, ...transactionColumns]
    : transactionColumns;

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    // 必填欄位設為淡粉紅色
    if (cell.text.includes('*')) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE0E0' },
      };
    }
  });

  // 隱形的選項清單
  const { accountNames, categoryNames, accounts, categories } =
    await getPersonnelAccountsAndCategoriesForExcelDropdown(userId);

  const optionSheet = workbook.addWorksheet('_Options');
  optionSheet.state = 'hidden';

  accountNames.forEach((a, i) => (optionSheet.getCell(`A${i + 1}`).value = a));
  categoryNames.forEach((c, i) => (optionSheet.getCell(`B${i + 1}`).value = c));

  if (!hasErrorColumn && transactions && transactions.length > 0) {
    transactions.forEach((t) => worksheet.addRow(t));
  } else if (hasErrorColumn && transactions && transactions.length > 0) {
    // 錯誤的欄位需要增加亮黃色背景
    transactions.forEach((t) => {
      const row = worksheet.addRow(t);
      if (t.errFields && t.errFields.length > 0) {
        t.errFields.forEach((field) => {
          const colIndex = transactionColumns.findIndex((c) => c.key === field);
          row.getCell(colIndex + 1 + colOffset).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFF00' },
          };
        });
      }
    });
  } else {
    // 否則就插入範例資料
    worksheet.insertRow(2, {
      date: new Date('2025-01-01'),
      // 記錄一下過程，在 Excel 裡，一天代表 1，所以 1 小時代表 1/24(天)，1 分鐘代表 1/(24*60)(天)，1 秒鐘代表 1/(24*60*60)(天)。
      time: 12 / 24 + 30 / (24 * 60) + 30 / (24 * 60 * 60), // 12:30:30。
      type: '收入',
      amount: 10000,
      account: '錢包',
      targetAccount: '',
      category: '飲食-早餐',
      receipt: '',
      description: '這是範例行，時間日期需要按照範例格式填寫',
    });
  }
  const startRow = 2;

  for (let row = startRow; row <= 1001; row++) {
    const r = worksheet.getRow(row);

    const dateCell = r.getCell(1 + colOffset);
    dateCell.numFmt = 'yyyy-mm-dd';
    dateCell.dataValidation = {
      type: 'date',
      operator: 'between',
      formulae: [new Date('1900-01-01'), new Date('2100-12-31')],
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: '日期格式錯誤',
      error: '請輸入有效的日期格式 (YYYY-MM-DD)',
    };

    const timeCell = r.getCell(2 + colOffset);
    timeCell.numFmt = 'hh:mm:ss';
    timeCell.dataValidation = {
      type: 'time' as any, // 這裡查一下是 ts 的問題，沒有定義到 time。
      operator: 'between',
      formulae: [0, 1], // covers 00:00:00 to 23:59:59
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: '時間格式錯誤',
      error: '請輸入有效的時間格式 (24 小時制，HH:MM:SS)',
    };

    // 類型
    // 只有三筆所以直接手動寫死
    r.getCell(3 + colOffset).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"收入,支出,操作"'],
    };

    // 帳戶
    r.getCell(5 + colOffset).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [`_Options!$A$1:$A${accounts.length || 1}`],
    };

    // 目標帳戶
    r.getCell(6 + colOffset).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`_Options!$A$1:$A${accounts.length || 1}`],
    };

    // 分類
    r.getCell(7 + colOffset).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [`_Options!$B$1:$B${categories.length || 1}`],
    };
  }

  return (await workbook.xlsx.writeBuffer()) as ExcelJS.Buffer;
};

const exportTransactionsTemplateExcel = async (userId: string) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }
  const userEmail = user.email;

  // 產生檔案
  const buffer = await generateTransactionsBuffer({
    userId,
    hasErrorColumn: false,
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

  const { accounts, categories } =
    await getPersonnelAccountsAndCategoriesForExcelDropdown(userId);
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map(
    categories.map((c) => {
      const parentName = categories.find((cat) => cat.id === c.parentId)?.name;
      const combinedParentAndChild = c.parentId
        ? `${parentName}-${c.name}`
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

  // 產生檔案
  const buffer = await generateTransactionsBuffer({
    userId,
    hasErrorColumn: false,
    transactions: excelTransactions as ImportTransactionRow[],
  });

  // 上傳到 Azure Blob
  const blobName = `transactions/${userEmail}_transactions.xlsx`;
  await uploadFileToBlob(blobName, buffer);

  return generateSasUrl(blobName, 15);
};

//============== Import Excel ==============
// Step1: 驗證欄位是否填寫正確
const validateAndParseRows = async (
  worksheet: ExcelJS.Worksheet,
  accountMap: Map<string, string>,
  categoryMap: Map<string, string>
): Promise<{
  successRows: (CreateTransactionSchema | CreateTransferSchema)[];
  errorRows: ImportTransactionRow[];
}> => {
  // 正確的 Row 要轉為 DB 格式，錯誤的繼續維持 Excel 的格式
  const successRows: (CreateTransactionSchema | CreateTransferSchema)[] = [];
  const errorRows: ImportTransactionRow[] = [];

  const isErrorsExcelFile = worksheet.getRow(1).getCell(1).text === '錯誤說明';
  const colOffset = isErrorsExcelFile ? 1 : 0;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    // 防止用戶輸入奇怪的值導致 format 出錯
    let date = '';
    try {
      date = format(row.getCell(1 + colOffset).text, 'yyyy-MM-dd');
    } catch {
      date = '';
    }
    // 防止用戶輸入奇怪的值導致 format 出錯
    let time = '';
    try {
      time = format(row.getCell(2 + colOffset).text, 'HH:mm:ss');
    } catch {
      time = '';
    }
    const type = row.getCell(3 + colOffset).text as MainType;
    const amount = Number(row.getCell(4 + colOffset).value);
    const accountName = row.getCell(5 + colOffset).text;
    const targetAccountName = row.getCell(6 + colOffset).text;
    const category = row.getCell(7 + colOffset).text;
    const receipt = row.getCell(8 + colOffset).text;
    const description = row.getCell(9 + colOffset).text;

    if (
      !date &&
      !time &&
      !type &&
      !amount &&
      !accountName &&
      !targetAccountName &&
      !category &&
      !receipt &&
      !description
    ) {
      return; // 空行直接跳過
    }

    let errMsg = '';
    const errFields: string[] = [];

    if (!date) {
      errMsg += '日期為必填欄位, ';
      errFields.push('date');
    }
    if (!time) {
      errMsg += '時間為必填欄位, ';
      errFields.push('time');
    }
    if (!type) {
      errMsg += '類型為必填欄位, ';
      errFields.push('type');
    }
    if (!accountName) {
      errMsg += '帳戶為必填欄位, ';
      errFields.push('account');
    }
    if (!category) {
      errMsg += '分類為必填欄位, ';
      errFields.push('category');
    }

    if (
      type !== MainType.INCOME &&
      type !== MainType.EXPENSE &&
      type !== MainType.OPERATE
    ) {
      errMsg += '類型錯誤, ';
      errFields.push('type');
    }

    if (amount < 0) {
      errMsg += '金額必須大於 0, ';
      errFields.push('amount');
    }
    if (typeof amount !== 'number') {
      errMsg += '金額必須為數字, ';
      errFields.push('amount');
    }

    const accountId = accountMap.get(accountName);
    if (accountName && !accountId) {
      errMsg += `帳戶[${accountName}]不存在, `;
      errFields.push('account');
    }

    let targetAccountId: string | null = null;
    if (targetAccountName) {
      targetAccountId = accountMap.get(targetAccountName) || null;
      if (targetAccountName && !targetAccountId) {
        errMsg += `目標帳戶[${targetAccountName}]不存在, `;
        errFields.push('targetAccount');
      }
    }

    if (category && !categoryMap.has(category)) {
      errMsg += `分類[${category}]不存在, `;
      errFields.push('category');
    }

    if (errMsg) {
      errorRows.push({
        error: errMsg,
        errFields,
        date,
        time,
        type,
        amount,
        account: accountName,
        targetAccount: targetAccountName,
        category,
        receipt,
        description,
      });
    } else {
      successRows.push({
        date,
        time,
        type,
        amount,
        accountId: accountId!,
        targetAccountId: targetAccountId!, // 沒有就給 null
        categoryId: categoryMap.get(category)!,
        receipt,
        description,
        paymentFrequency: PaymentFrequency.ONE_TIME,
      });
    }
  });

  return { successRows, errorRows };
};

const insertTransactions = async (
  userId: string,
  successRows: (CreateTransactionSchema | CreateTransferSchema)[]
) => {
  for (const row of successRows) {
    if (row.type === MainType.OPERATE) {
      await transactionServices.createTransfer(row, userId);
    } else {
      await transactionServices.createTransaction(row, userId);
    }
  }
};

const importNewTransactionsExcel = async (
  userId: string,
  fileBuffer: Buffer
) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as any);
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error('工作表不存在');

  const accounts = await Account.findAll({
    where: {
      userId,
    },
    attributes: ['id', 'name'],
    raw: true,
  });
  if (accounts.length === 0) throw new Error('User 沒有帳號');

  const { stringCollection: categoriesName } =
    await getAllCategoriesHyphenString(userId);
  const categories = await Category.findAll({
    where: {
      [Op.or]: [{ userId }, { userId: null }],
      parentId: {
        [Op.ne]: null,
      },
    },
    attributes: ['id', 'name', 'parentId'],
    raw: true,
  });
  if (categoriesName.length === 0) throw new Error('取得分類有誤');
  if (categories.length === 0) throw new Error('取得分類有誤');

  // User 都是填文字，所以製作 Map <name -> id>
  const accountMap = new Map<string, string>(
    accounts.map((a) => [a.name, a.id])
  );
  const categoryMap = new Map<string, string>();
  categoriesName.forEach((cstr) => {
    const splitCat = cstr.split('-');
    const mainName = splitCat[0];
    const mainId = categories.find((c) => c.name === mainName)?.id;
    const subName = splitCat[1];
    if (splitCat.length === 2) {
      categoryMap.set(
        cstr,
        categories.find((c) => c.name === subName && c.parentId === mainId)
          ?.id || ''
      );
    } else if (splitCat.length === 1) {
      categoryMap.set(
        cstr,
        categories.find((c) => c.name === mainName && c.id === mainId)?.id || ''
      );
    }
  });
  const { successRows, errorRows } = await validateAndParseRows(
    worksheet,
    accountMap,
    categoryMap
  );

  let errorUrl = '';
  if (errorRows.length > 0) {
    const buffer = await generateTransactionsBuffer({
      userId,
      hasErrorColumn: true,
      transactions: errorRows,
    });
    const blobName = `errors/create_new_transaction_error_${userId}_${Date.now()}.xlsx`;
    await uploadFileToBlob(blobName, buffer);
    errorUrl = generateSasUrl(blobName, 15);
  }

  if (successRows.length > 0) {
    await insertTransactions(userId, successRows);
  }

  return {
    isSuccess: true,
    errorUrl,
    message: `成功匯入 ${successRows.length} 筆交易紀錄，失敗 ${errorRows.length} 筆`,
  };
};

export default {
  getAllCategoriesHyphenString,
  generateTransactionsBuffer,
  exportTransactionsTemplateExcel,
  exportUserTransactionsExcel,
  importNewTransactionsExcel,
};
