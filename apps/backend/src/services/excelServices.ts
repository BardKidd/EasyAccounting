import { Category, Account, Transaction, User } from '@/models';
import { Op } from 'sequelize';
import ExcelJS from 'exceljs';
import { generateSasUrl, uploadFileToBlob } from '@/utils/azureBlob';
import {
  CreateTransactionSchema,
  CreateTransferSchema,
  RootType,
  PaymentFrequency,
  ExcelImportMode,
  ExcelExportMode,
  Currency,
  DEFAULT_CURRENCY,
  isZeroDecimalCurrency,
  normalizeCurrencyCode,
} from '@repo/shared';
import { format } from 'date-fns';
import transactionServices from './transactionServices';
import { getRate } from './exchangeRateService';
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
  currency?: string;
  amount: number;
  account: string;
  targetAccount?: string | null;
  category: string;
  receipt?: string;
  description?: string;
  // 只有 User 輸入錯誤時才會有這個值
  error?: string;
  errFields?: string[];
  isReconciled?: string; // Excel 中讀取進來可能是字串
  reconciliationDate?: string;
  // 編輯用匯出檔的隱藏 id 欄。匯出/錯誤報告含 id 時帶上，純匯出時為 undefined。
  id?: string;
}

// 解析後的「成功列」：沿用 create schema，編輯模式額外帶回隱藏 id 欄。
// _excelRow 保留該列的 Excel 原始呈現，apply 階段若失敗可還原成錯誤報告列。
type ParsedSuccessRow = (CreateTransactionSchema | CreateTransferSchema) & {
  id?: string;
  _excelRow: ImportTransactionRow;
};

// 以欄位 key 取得在 transactionColumns 中的 1-based 欄號（尚未加上 colOffset）。
// 用此 helper 而非寫死數字，插入/調整欄位時所有 getCell 計算自動跟著正確。
const colIndexOf = (key: string): number =>
  transactionColumns.findIndex((c) => c.key === key) + 1;

// 金額數字格式：新台幣等無小數幣別顯示整數；其餘幣別有小數才顯示小數位。
const AMOUNT_FORMAT_INT = '#,##0';
const AMOUNT_FORMAT_DECIMAL = '#,##0.#####';
const amountNumFmt = (currency: string): string =>
  isZeroDecimalCurrency(currency) ? AMOUNT_FORMAT_INT : AMOUNT_FORMAT_DECIMAL;

// 幣別下拉清單（inline list，內容固定且少量）
const CURRENCY_LIST_FORMULA = `"${Object.values(Currency).join(',')}"`;

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
      const parentName = categoryMap.get(cat.parentId)!.name;
      stringCollection.push(`${parentName}-${cat.name}`);
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
  userId: string,
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
  includeIdColumn = false,
  transactions,
}: {
  userId: string;
  hasErrorColumn: boolean;
  // 編輯用匯出 / 編輯模式錯誤報告：在最後一欄附加隱藏的 id 欄
  includeIdColumn?: boolean;
  transactions?: ImportTransactionRow[];
}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('交易紀錄');
  const colOffset = hasErrorColumn ? 1 : 0;

  // id 欄一律放最後，避免影響既有 colOffset 與所有 getCell index 計算
  worksheet.columns = [
    ...(hasErrorColumn
      ? [{ header: '錯誤說明', key: 'error', width: 100 }, ...transactionColumns]
      : transactionColumns),
    ...(includeIdColumn ? [{ header: 'id', key: 'id', width: 20 }] : []),
  ];

  if (includeIdColumn) {
    worksheet.getColumn('id').hidden = true;
  }

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

  // 這裡先提出來長度並先處理好下拉選單名稱的話會是一個固定的值，假如在 formulae 裡面才去決定裡面要使用的選單範圍時 Excel 可能會算錯長度導致底部有時會出現一個完全空白的選項出現。有可能會有判斷上的 bug 出現。
  const accountCount = accountNames.length || 1;
  const categoryCount = categoryNames.length || 1;
  workbook.definedNames.add(
    `'_Options'!$A$1:$A$${accountCount}`,
    'AccountList',
  );
  workbook.definedNames.add(
    `'_Options'!$B$1:$B$${categoryCount}`,
    'CategoryList',
  );

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
      currency: DEFAULT_CURRENCY,
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

    const dateCell = r.getCell(colIndexOf('date') + colOffset);
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

    const timeCell = r.getCell(colIndexOf('time') + colOffset);
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
    r.getCell(colIndexOf('type') + colOffset).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"收入,支出,操作"'],
    };

    // 幣別（下拉；允許空白，空白時匯入視為新台幣）
    r.getCell(colIndexOf('currency') + colOffset).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [CURRENCY_LIST_FORMULA],
    };

    // 金額：已填幣別的列依幣別決定（新台幣等無小數幣別顯示整數，其餘顯示小數）；
    // 空白範本列保留小數格式，方便使用者改填外幣時仍能輸入小數。
    const rowCurrency = r
      .getCell(colIndexOf('currency') + colOffset)
      .text.trim();
    r.getCell(colIndexOf('amount') + colOffset).numFmt = rowCurrency
      ? amountNumFmt(rowCurrency)
      : AMOUNT_FORMAT_DECIMAL;

    // 帳戶
    r.getCell(colIndexOf('account') + colOffset).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['AccountList'],
    };

    // 目標帳戶
    r.getCell(colIndexOf('targetAccount') + colOffset).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['AccountList'],
    };

    // 分類
    r.getCell(colIndexOf('category') + colOffset).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['CategoryList'],
    };

    // 已核對
    r.getCell(colIndexOf('isReconciled') + colOffset).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"是,否"'],
    };

    // 核對日期
    const recDateCell = r.getCell(colIndexOf('reconciliationDate') + colOffset);
    recDateCell.numFmt = 'yyyy-mm-dd';
    recDateCell.dataValidation = {
      type: 'date',
      operator: 'between',
      formulae: [new Date('1900-01-01'), new Date('2100-12-31')],
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: '日期格式錯誤',
      error: '請輸入有效的日期格式 (YYYY-MM-DD)',
      allowBlank: true,
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

const exportUserTransactionsExcel = async (
  userId: string,
  mode: ExcelExportMode = ExcelExportMode.EXPORT,
) => {
  const isEditMode = mode === ExcelExportMode.EDIT;
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
    }),
  );

  const transactions = await Transaction.findAll({
    where: { userId },
    attributes: [
      'id',
      'date',
      'time',
      'type',
      'amount',
      'accountId',
      'targetAccountId',
      'categoryId',
      'receipt',
      'description',
      'isReconciled',
      'reconciliationDate',
    ],
    raw: true,
    order: [
      ['date', 'DESC'],
      ['time', 'DESC'],
    ],
  });
  // 排除被動轉帳收入 (INCOME + 有 targetAccountId)
  // 編輯模式下，轉帳列匯出的是來源側 (EXPENSE) 那一筆，其 id 也是來源側 id
  const excelTransactions = transactions
    .filter((t) => !(t.type === RootType.INCOME && t.targetAccountId))
    .map((t) => ({
      ...t,
      type: t.targetAccountId ? RootType.OPERATE : t.type,
      // 目前系統未持久化幣別，一律以預設新台幣匯出
      currency: DEFAULT_CURRENCY,
      // amount 在 DB 為 DECIMAL，Sequelize 會回傳字串；轉成真正的數字，
      // 避免 Excel 存成「文字」(綠色三角形) 並導致重新上傳時金額驗證失敗
      amount: Number(t.amount),
      account: accountMap.get(t.accountId) || '',
      targetAccount: t.targetAccountId
        ? accountMap.get(t.targetAccountId) || ''
        : '',
      category: categoryMap.get(t.categoryId) || '',
      isReconciled: t.isReconciled ? '是' : '否',
      reconciliationDate: t.reconciliationDate
        ? format(new Date(t.reconciliationDate), 'yyyy-MM-dd')
        : '',
      // 純匯出模式不附 id，避免使用者誤用；編輯模式才帶隱藏 id
      id: isEditMode ? t.id : undefined,
    }));

  // 產生檔案
  const buffer = await generateTransactionsBuffer({
    userId,
    hasErrorColumn: false,
    includeIdColumn: isEditMode,
    transactions: excelTransactions as ImportTransactionRow[],
  });

  // 上傳到 Azure Blob（編輯用與純匯出用分開 blob，避免互相覆蓋）
  const blobName = `transactions/${userEmail}_transactions${
    isEditMode ? '_edit' : ''
  }.xlsx`;
  await uploadFileToBlob(blobName, buffer);

  return generateSasUrl(blobName, 15);
};

//============== Import Excel ==============
// Step1: 驗證欄位是否填寫正確
const validateAndParseRows = async (
  worksheet: ExcelJS.Worksheet,
  accountMap: Map<string, string>,
  categoryMap: Map<string, string>,
  editMode: boolean = false,
  validTransactionIds?: Set<string>,
): Promise<{
  successRows: ParsedSuccessRow[];
  errorRows: ImportTransactionRow[];
}> => {
  // 正確的 Row 要轉為 DB 格式，錯誤的繼續維持 Excel 的格式
  const successRows: ParsedSuccessRow[] = [];
  const errorRows: ImportTransactionRow[] = [];

  const isErrorsExcelFile = worksheet.getRow(1).getCell(1).text === '錯誤說明';
  const colOffset = isErrorsExcelFile ? 1 : 0;

  // 偵測隱藏 id 欄（固定在最後一欄，以 header 文字定位，不依賴 colOffset 計算）
  let idColNumber: number | undefined;
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    if (cell.text === 'id') idColNumber = colNumber;
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    // 防止用戶輸入奇怪的值導致 format 出錯
    let date = '';
    try {
      const cellVal = row.getCell(colIndexOf('date') + colOffset).value;
      const d =
        cellVal instanceof Date
          ? cellVal
          : new Date(row.getCell(colIndexOf('date') + colOffset).text);
      // 檢查是否為有效日期
      if (!isNaN(d.getTime())) {
        // 確保 d 必須是 new Date
        date = format(d, 'yyyy-MM-dd');
      }
    } catch {
      date = '';
    }
    // 防止用戶輸入奇怪的值導致 format 出錯
    let time = '';
    try {
      // 取得 value，假如 ExcelJS 有幫你轉成 new Date 的話那就可以直接丟進 format 裡面。
      const cellVal = row.getCell(colIndexOf('time') + colOffset).value;
      let d: Date | null = null;

      if (cellVal instanceof Date) {
        d = cellVal;
      } else {
        // 假如手動輸入然後 ExcelJS 看不懂會走這裡，直接取字串。
        const text = row.getCell(colIndexOf('time') + colOffset).text;
        // 嘗試直接 new Date (可能是 ISO)
        const tryD = new Date(text);
        if (!isNaN(tryD.getTime())) {
          d = tryD;
        } else {
          // 可能是 HH:mm:ss，補個假日期，反正重點是時間不是日期。
          const withDate = new Date(`2000-01-01 ${text}`);
          if (!isNaN(withDate.getTime())) d = withDate;
        }
      }

      if (d && !isNaN(d.getTime())) {
        time = format(d, 'HH:mm:ss');
      }
    } catch {
      time = '';
    }
    const type = row.getCell(colIndexOf('type') + colOffset).text as RootType;
    // 幣別：空白視為預設新台幣
    const currencyRaw = row
      .getCell(colIndexOf('currency') + colOffset)
      .text.trim();
    // 正規化（'NTD' → 'TWD' 等歷史別名容錯）；空白視為預設本位幣
    const currency = currencyRaw
      ? normalizeCurrencyCode(currencyRaw)
      : DEFAULT_CURRENCY;
    let amount = row.getCell(colIndexOf('amount') + colOffset).value;
    const accountName = row.getCell(colIndexOf('account') + colOffset).text;
    const targetAccountName = row
      .getCell(colIndexOf('targetAccount') + colOffset)
      .text;
    const category = row.getCell(colIndexOf('category') + colOffset).text;
    const receipt = row.getCell(colIndexOf('receipt') + colOffset).text;
    const description = row.getCell(colIndexOf('description') + colOffset).text;
    const isReconciledText = row
      .getCell(colIndexOf('isReconciled') + colOffset)
      .text;
    const reconciliationDateVal = row.getCell(
      colIndexOf('reconciliationDate') + colOffset,
    ).value; // Date or string
    // 編輯模式才讀取隱藏 id 欄；空字串代表使用者新增的列（走 create）
    const rowId =
      editMode && idColNumber
        ? String(row.getCell(idColNumber).text || '').trim()
        : '';

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
      type !== RootType.INCOME &&
      type !== RootType.EXPENSE &&
      type !== RootType.OPERATE
    ) {
      errMsg += '類型錯誤, ';
      errFields.push('type');
    }

    if (typeof amount !== 'number' || amount <= 0) {
      errMsg += '金額必須為數字且大於 0, ';
      errFields.push('amount');
    } else {
      amount = Number(amount);
    }

    if (type === RootType.OPERATE && !targetAccountName) {
      errMsg += '目標帳戶為必填欄位, ';
      errFields.push('targetAccount');
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

    // 幣別：有填就必須是支援的幣別（空白已預設為本位幣，不會進到這裡）。
    // 以正規化後的值驗證（舊 'NTD' 會映射成 'TWD' 視為合法別名），錯誤訊息仍顯示使用者原輸入。
    if (
      currencyRaw &&
      !(Object.values(Currency) as string[]).includes(currency)
    ) {
      errMsg += `幣別[${currencyRaw}]不支援, `;
      errFields.push('currency');
    }

    // 編輯模式：有帶 id 的列必須屬於本人且存在，否則列入錯誤（避免越權編輯）
    if (editMode && rowId && !validTransactionIds?.has(rowId)) {
      errMsg += `交易紀錄不存在或無權限編輯, `;
    }

    if (errMsg) {
      const regex = /, $/;
      errorRows.push({
        error: errMsg.replace(regex, ''), // 移除最後面的逗號
        errFields,
        date,
        time,
        type,
        currency,
        amount: amount as any,
        account: accountName,
        targetAccount: targetAccountName,
        category,
        receipt,
        description,
        // 保留 id，讓使用者修正錯誤報告後仍能以編輯模式重新上傳
        id: rowId || undefined,
      });
    } else {
      successRows.push({
        date,
        time,
        type,
        amount: amount as number,
        accountId: accountId!,
        targetAccountId: targetAccountId!, // 沒有就給 null
        categoryId: categoryMap.get(category)!,
        receipt,
        description,
        paymentFrequency: PaymentFrequency.ONE_TIME,
        isReconciled: isReconciledText === '是',
        reconciliationDate: (() => {
          if (!reconciliationDateVal) return null;
          if (reconciliationDateVal instanceof Date)
            return reconciliationDateVal;
          const d = new Date(String(reconciliationDateVal));
          return isNaN(d.getTime()) ? null : d;
        })(),
        // 編輯模式且有 id → 後續走 update；無 id → 走 create
        id: rowId || undefined,
        // 保留 Excel 原始呈現，供 apply 失敗時還原成錯誤報告列
        _excelRow: {
          date,
          time,
          type,
          currency,
          amount: amount as number,
          account: accountName,
          targetAccount: targetAccountName,
          category,
          receipt,
          description,
          isReconciled: isReconciledText,
          id: rowId || undefined,
        },
      });
    }
  });

  return { successRows, errorRows };
};

// 逐列套用：編輯模式且有 id → 依型別走 update；否則走 create。
// 每列獨立 try/catch，單列失敗不中斷整批，並回傳失敗列（Excel 格式）以併入錯誤報告，
// 維持「部分成功 + 錯誤報告」的承諾。
const applyTransactions = async (
  userId: string,
  successRows: ParsedSuccessRow[],
  editMode: boolean,
): Promise<ImportTransactionRow[]> => {
  const failedRows: ImportTransactionRow[] = [];

  for (const row of successRows) {
    // 剝離 id 與內部欄位，避免後續 service 以 {...data} 展開時誤寫主鍵或塞入未知欄位
    const { id, _excelRow, ...payload } = row;
    try {
      if (editMode && id) {
        // 有 id → 編輯既有交易，依 Excel 型別分流。
        // Excel 沒有 paymentFrequency 欄，更新時不可覆寫（否則會把分期/週期交易改成單次）。
        const { paymentFrequency: _pf, ...updatePayload } = payload;
        if (row.type === RootType.OPERATE) {
          await transactionServices.updateTransfer(
            id,
            updatePayload as any,
            userId,
          );
        } else {
          await transactionServices.updateIncomeExpense(
            id,
            updatePayload as any,
            userId,
          );
        }
      } else {
        // 無 id（或新增模式）→ 建立新交易
        if (row.type === RootType.OPERATE) {
          await transactionServices.createTransfer(
            payload as CreateTransferSchema,
            userId,
          );
        } else {
          await transactionServices.createTransaction(payload as any, userId);
        }
      }
    } catch (err) {
      // 單列失敗 → 還原成錯誤報告列，繼續處理其餘列
      const message = err instanceof Error ? err.message : '處理失敗';
      failedRows.push({
        ..._excelRow,
        error: `${editMode && id ? '更新' : '新增'}失敗：${message}`,
      });
    }
  }

  return failedRows;
};

/**
 * 匯入外幣前置檢查：對「帳戶幣別 != 本位幣」的列，確認該幣別→本位幣於交易日期有匯率。
 * Excel 匯入是批次、無互動 UI，缺匯率時若硬匯入會落庫錯誤的 amountInBase（baseRate fallback=1），
 * 故改為「不匯入該列、列入錯誤報告並提示補匯率」。轉帳同時檢查來源與目標帳戶幣別。
 */
const partitionByMissingRate = async (
  rows: ParsedSuccessRow[],
  accountCurrencyById: Map<string, string>,
  baseCode: string,
): Promise<{ ok: ParsedSuccessRow[]; missing: ImportTransactionRow[] }> => {
  const ok: ParsedSuccessRow[] = [];
  const missing: ImportTransactionRow[] = [];

  for (const row of rows) {
    const needed: [string, string][] = []; // [accountCurrency, date]
    const accCur = accountCurrencyById.get(row.accountId) || baseCode;
    if (accCur !== baseCode) needed.push([accCur, row.date]);
    const targetAccountId = (row as any).targetAccountId as string | undefined;
    if (targetAccountId) {
      const tCur = accountCurrencyById.get(targetAccountId) || baseCode;
      if (tCur !== baseCode) needed.push([tCur, row.date]);
    }

    let missMsg = '';
    for (const [cur, date] of needed) {
      const r = await getRate(cur, baseCode, date);
      if (r == null) missMsg += `${cur}→${baseCode}(${date}) `;
    }

    if (missMsg) {
      missing.push({
        ...row._excelRow,
        error: `缺匯率：${missMsg.trim()}，請先於系統補上該幣別匯率再匯入`,
      });
    } else {
      ok.push(row);
    }
  }

  return { ok, missing };
};

const importNewTransactionsExcel = async (
  userId: string,
  fileBuffer: Buffer,
  mode: ExcelImportMode = ExcelImportMode.CREATE,
) => {
  const editMode = mode === ExcelImportMode.EDIT;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as any);
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error('工作表不存在');

  const accounts = await Account.findAll({
    where: {
      userId,
    },
    attributes: ['id', 'name', 'currencyCode'],
    raw: true,
  });
  if (accounts.length === 0) throw new Error('User 沒有帳號');

  const { stringCollection: categoriesName } =
    await getAllCategoriesHyphenString(userId);
  const categories = await Category.findAll({
    where: {
      [Op.or]: [{ userId }, { userId: null }],
    },
    attributes: ['id', 'name', 'parentId'],
    raw: true,
  });
  if (categoriesName.length === 0) throw new Error('取得分類有誤');
  if (categories.length === 0) throw new Error('取得分類有誤');

  // User 都是填文字，所以製作 Map <name -> id>
  const accountMap = new Map<string, string>(
    accounts.map((a) => [a.name, a.id]),
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
          ?.id || '',
      );
    } else if (splitCat.length === 1) {
      categoryMap.set(
        cstr,
        categories.find((c) => c.name === mainName && c.id === mainId)?.id ||
          '',
      );
    }
  });
  // 編輯模式：預載該 User 的所有交易 id，用來驗證 Excel 帶回的 id 確實屬於本人
  let validTransactionIds: Set<string> | undefined;
  if (editMode) {
    const userTransactions = await Transaction.findAll({
      where: { userId },
      attributes: ['id'],
      raw: true,
    });
    validTransactionIds = new Set(
      userTransactions
        .map((tx) => tx.id)
        .filter((txId): txId is string => !!txId),
    );
  }

  const { successRows, errorRows } = await validateAndParseRows(
    worksheet,
    accountMap,
    categoryMap,
    editMode,
    validTransactionIds,
  );

  // 外幣前置檢查：缺匯率的列不匯入，列入錯誤報告（避免落庫錯誤的本位幣快照）
  const accountCurrencyById = new Map<string, string>(
    accounts.map((a) => [a.id, (a as any).currencyCode || DEFAULT_CURRENCY]),
  );
  const userRow = await User.findByPk(userId, {
    attributes: ['baseCurrencyCode'],
    raw: true,
  });
  const baseCode = (userRow as any)?.baseCurrencyCode || DEFAULT_CURRENCY;
  const { ok: rowsToApply, missing: missingRateRows } =
    await partitionByMissingRate(successRows, accountCurrencyById, baseCode);

  // 先套用，收集 apply 階段（DB 操作）失敗的列；單列失敗不中斷整批
  const applyFailedRows =
    rowsToApply.length > 0
      ? await applyTransactions(userId, rowsToApply, editMode)
      : [];

  // 驗證錯誤 + 缺匯率 + apply 失敗合併成同一份錯誤報告
  const allErrorRows = [...errorRows, ...missingRateRows, ...applyFailedRows];
  const successCount = rowsToApply.length - applyFailedRows.length;

  let errorUrl = '';
  if (allErrorRows.length > 0) {
    const buffer = await generateTransactionsBuffer({
      userId,
      hasErrorColumn: true,
      // 編輯模式的錯誤報告同樣帶隱藏 id 欄，使用者修正後可再以編輯模式上傳
      includeIdColumn: editMode,
      transactions: allErrorRows,
    });
    const blobName = `errors/transaction_error_${userId}_${Date.now()}.xlsx`;
    await uploadFileToBlob(blobName, buffer);
    errorUrl = generateSasUrl(blobName, 15);
  }

  return {
    isSuccess: true,
    errorUrl,
    message: `成功匯入 ${successCount} 筆交易紀錄，失敗 ${allErrorRows.length} 筆`,
  };
};

export default {
  getAllCategoriesHyphenString,
  generateTransactionsBuffer,
  exportTransactionsTemplateExcel,
  exportUserTransactionsExcel,
  importNewTransactionsExcel,
};
