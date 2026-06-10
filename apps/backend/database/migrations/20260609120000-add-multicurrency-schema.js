'use strict';

/**
 * 多幣別 Phase 1：兩張維度表 + 五模型加欄 + 回填。
 * up/down 對稱、零停機、可逆，且整個 up 包在單一 transaction 內（Postgres DDL 可交易），
 * 任一步失敗即整批回滾，不留半套狀態。
 * 既有資料皆 TWD、本位 TWD，故 amountInBase = amount（零回歸）。
 * 注意：本檔為純 JS（sequelize-cli），seed 清單與 @repo/shared 的 SEED_CURRENCIES 保持一致。
 */

const SEED_CURRENCIES = [
  { code: 'TWD', name: '新台幣', symbol: 'NT$', decimalPlaces: 0 },
  { code: 'JPY', name: '日圓', symbol: '¥', decimalPlaces: 0 },
  { code: 'USD', name: '美元', symbol: '$', decimalPlaces: 2 },
  { code: 'EUR', name: '歐元', symbol: '€', decimalPlaces: 2 },
  { code: 'CNY', name: '人民幣', symbol: '¥', decimalPlaces: 2 },
  { code: 'HKD', name: '港幣', symbol: 'HK$', decimalPlaces: 2 },
  { code: 'GBP', name: '英鎊', symbol: '£', decimalPlaces: 2 },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';
    const now = new Date();

    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };

      // ---- 1. currency 維度表 + seed ----
      await queryInterface.createTable(
        { tableName: 'currency', schema },
        {
          code: { type: Sequelize.STRING(3), allowNull: false, primaryKey: true },
          name: { type: Sequelize.STRING, allowNull: false },
          symbol: { type: Sequelize.STRING, allowNull: false },
          decimalPlaces: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 2,
          },
          isCrypto: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          isActive: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          createdAt: { allowNull: false, type: Sequelize.DATE },
          updatedAt: { allowNull: false, type: Sequelize.DATE },
        },
        opt,
      );

      await queryInterface.bulkInsert(
        { tableName: 'currency', schema },
        SEED_CURRENCIES.map((c) => ({
          code: c.code,
          name: c.name,
          symbol: c.symbol,
          decimalPlaces: c.decimalPlaces,
          isCrypto: false,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })),
        opt,
      );

      // ---- 2. exchange_rate 時序表 + 唯一索引 + seed TWD→TWD=1 ----
      await queryInterface.createTable(
        { tableName: 'exchange_rate', schema },
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.UUIDV4,
          },
          baseCode: {
            type: Sequelize.STRING(3),
            allowNull: false,
            references: { model: { tableName: 'currency', schema }, key: 'code' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          quoteCode: {
            type: Sequelize.STRING(3),
            allowNull: false,
            references: { model: { tableName: 'currency', schema }, key: 'code' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          rate: { type: Sequelize.DECIMAL(20, 10), allowNull: false },
          rateDate: { type: Sequelize.DATEONLY, allowNull: false },
          source: {
            type: Sequelize.ENUM('MANUAL', 'API'),
            allowNull: false,
            defaultValue: 'MANUAL',
          },
          provider: { type: Sequelize.STRING, allowNull: true },
          createdAt: { allowNull: false, type: Sequelize.DATE },
          updatedAt: { allowNull: false, type: Sequelize.DATE },
        },
        opt,
      );

      await queryInterface.addIndex(
        { tableName: 'exchange_rate', schema },
        {
          unique: true,
          fields: ['baseCode', 'quoteCode', 'rateDate', 'source'],
          name: 'exchange_rate_base_quote_date_source_uniq',
          transaction: t,
        },
      );

      // seed：本位幣自身匯率 = 1（rateDate 取極早日期，確保 <= 任何目標日）
      await queryInterface.sequelize.query(
        `INSERT INTO "${schema}"."exchange_rate"
           ("id","baseCode","quoteCode","rate","rateDate","source","provider","createdAt","updatedAt")
         VALUES
           (gen_random_uuid(),'TWD','TWD',1,'2000-01-01','MANUAL',NULL,NOW(),NOW())`,
        opt,
      );

      // ---- 3. account.currencyCode ----
      await queryInterface.addColumn(
        { tableName: 'account', schema },
        'currencyCode',
        {
          type: Sequelize.STRING(3),
          allowNull: false,
          defaultValue: 'TWD',
          references: { model: { tableName: 'currency', schema }, key: 'code' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        opt,
      );

      // ---- 4. user.baseCurrencyCode ----
      await queryInterface.addColumn(
        { tableName: 'user', schema },
        'baseCurrencyCode',
        {
          type: Sequelize.STRING(3),
          allowNull: false,
          defaultValue: 'TWD',
          references: { model: { tableName: 'currency', schema }, key: 'code' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        opt,
      );

      // ---- 5. transaction 多幣別欄位 + 回填 amountInBase ----
      await queryInterface.addColumn(
        { tableName: 'transaction', schema },
        'amountInBase',
        { type: Sequelize.DECIMAL(20, 5), allowNull: true },
        opt,
      );
      await queryInterface.addColumn(
        { tableName: 'transaction', schema },
        'originalCurrencyCode',
        { type: Sequelize.STRING(3), allowNull: true },
        opt,
      );
      await queryInterface.addColumn(
        { tableName: 'transaction', schema },
        'originalAmount',
        { type: Sequelize.DECIMAL(20, 5), allowNull: true },
        opt,
      );
      await queryInterface.addColumn(
        { tableName: 'transaction', schema },
        'exchangeRate',
        { type: Sequelize.DECIMAL(20, 10), allowNull: true },
        opt,
      );
      await queryInterface.addColumn(
        { tableName: 'transaction', schema },
        'baseRate',
        { type: Sequelize.DECIMAL(20, 10), allowNull: true },
        opt,
      );

      // 既有皆 TWD、本位 TWD → amountInBase = amount
      await queryInterface.sequelize.query(
        `UPDATE "${schema}"."transaction" SET "amountInBase" = "amount" WHERE "amountInBase" IS NULL`,
        opt,
      );
      await queryInterface.changeColumn(
        { tableName: 'transaction', schema },
        'amountInBase',
        { type: Sequelize.DECIMAL(20, 5), allowNull: false, defaultValue: 0 },
        opt,
      );

      // ---- 6. transaction_extra base 快照 + 回填 ----
      await queryInterface.addColumn(
        { tableName: 'transaction_extra', schema },
        'extraAddInBase',
        { type: Sequelize.DECIMAL(20, 5), allowNull: false, defaultValue: 0 },
        opt,
      );
      await queryInterface.addColumn(
        { tableName: 'transaction_extra', schema },
        'extraMinusInBase',
        { type: Sequelize.DECIMAL(20, 5), allowNull: false, defaultValue: 0 },
        opt,
      );
      await queryInterface.sequelize.query(
        `UPDATE "${schema}"."transaction_extra"
           SET "extraAddInBase" = COALESCE("extraAdd",0),
               "extraMinusInBase" = COALESCE("extraMinus",0)`,
        opt,
      );

      // ---- 7. budget：移除殭屍 currencyId、amount 精度對齊 ----
      await queryInterface.removeColumn(
        { tableName: 'budget', schema },
        'currencyId',
        opt,
      );
      await queryInterface.changeColumn(
        { tableName: 'budget', schema },
        'amount',
        { type: Sequelize.DECIMAL(20, 5), allowNull: false },
        opt,
      );
    });
  },

  async down(queryInterface, Sequelize) {
    const schema = 'accounting';

    await queryInterface.sequelize.transaction(async (t) => {
      const opt = { transaction: t };

      // 7. budget 還原
      await queryInterface.changeColumn(
        { tableName: 'budget', schema },
        'amount',
        { type: Sequelize.DECIMAL(15, 2), allowNull: false },
        opt,
      );
      await queryInterface.addColumn(
        { tableName: 'budget', schema },
        'currencyId',
        { type: Sequelize.INTEGER, allowNull: true },
        opt,
      );

      // 6. transaction_extra
      await queryInterface.removeColumn(
        { tableName: 'transaction_extra', schema },
        'extraMinusInBase',
        opt,
      );
      await queryInterface.removeColumn(
        { tableName: 'transaction_extra', schema },
        'extraAddInBase',
        opt,
      );

      // 5. transaction
      await queryInterface.removeColumn(
        { tableName: 'transaction', schema },
        'baseRate',
        opt,
      );
      await queryInterface.removeColumn(
        { tableName: 'transaction', schema },
        'exchangeRate',
        opt,
      );
      await queryInterface.removeColumn(
        { tableName: 'transaction', schema },
        'originalAmount',
        opt,
      );
      await queryInterface.removeColumn(
        { tableName: 'transaction', schema },
        'originalCurrencyCode',
        opt,
      );
      await queryInterface.removeColumn(
        { tableName: 'transaction', schema },
        'amountInBase',
        opt,
      );

      // 4. user
      await queryInterface.removeColumn(
        { tableName: 'user', schema },
        'baseCurrencyCode',
        opt,
      );

      // 3. account
      await queryInterface.removeColumn(
        { tableName: 'account', schema },
        'currencyCode',
        opt,
      );

      // 2. exchange_rate（含 ENUM 型別清理）
      await queryInterface.dropTable({ tableName: 'exchange_rate', schema }, opt);
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "${schema}"."enum_exchange_rate_source"`,
        opt,
      );

      // 1. currency
      await queryInterface.dropTable({ tableName: 'currency', schema }, opt);
    });
  },
};
