'use strict';

/**
 * 拆分交易 Phase B — S6 單一真實來源：view transaction_split_unit
 * （spec docs/specs/split-tags-spec.md §5.4，落地為 DB view 而非 JS helper，§7 已允許）。
 *
 * 把每筆交易展開成「分類單元」列，供 budget / statistics 的分類聚合直接 FROM：
 *   - 非拆分（isSplit=false）：整筆交易為一個單元（與既有 transaction LEFT JOIN extra 逐位相同）。
 *   - 拆分（isSplit=true）：每個 transaction_split 為一個單元，父層 extra 依各子項 gross 比例攤提。
 *
 * 不變量：Σ 單元(amountInBase ± extra) = 父交易 net（Σ split.amountInBase = 父 gross；
 * Σ 攤提 extra = 父 extra）。攤提用乘法比例（不在 SQL 逐分四捨五入），由消費端 SUM 後一次 round。
 *
 * 欄位設計為既有查詢的 drop-in：欄名與 transaction 對齊，extra 直接附在單元上
 * （extraAddInBase/extraMinusInBase），故消費端只需把 FROM transaction+extra 換成本 view、
 * 將 e."extra*InBase" 改為 t."extra*InBase"。deletedAt 一律 NULL（view 僅含未刪父交易）。
 */

const SCHEMA = 'accounting';

const VIEW_SQL = `
CREATE OR REPLACE VIEW "${SCHEMA}"."transaction_split_unit" AS
SELECT
  t."id", t."userId", t."accountId", t."categoryId",
  t."type", t."linkId", t."targetAccountId",
  t."date", t."billingDate",
  t."amountInBase",
  COALESCE(e."extraAddInBase", 0)   AS "extraAddInBase",
  COALESCE(e."extraMinusInBase", 0) AS "extraMinusInBase",
  t."transactionExtraId",
  t."deletedAt"
FROM "${SCHEMA}"."transaction" t
LEFT JOIN "${SCHEMA}"."transaction_extra" e ON e."id" = t."transactionExtraId"
WHERE t."deletedAt" IS NULL AND t."isSplit" = false
UNION ALL
SELECT
  t."id", t."userId", t."accountId", s."categoryId",
  t."type", t."linkId", t."targetAccountId",
  t."date", t."billingDate",
  s."amountInBase",
  COALESCE(COALESCE(e."extraAddInBase", 0)   * s."amountInBase" / NULLIF(g."total", 0), 0) AS "extraAddInBase",
  COALESCE(COALESCE(e."extraMinusInBase", 0) * s."amountInBase" / NULLIF(g."total", 0), 0) AS "extraMinusInBase",
  t."transactionExtraId",
  t."deletedAt"
FROM "${SCHEMA}"."transaction" t
JOIN "${SCHEMA}"."transaction_split" s ON s."transactionId" = t."id"
LEFT JOIN "${SCHEMA}"."transaction_extra" e ON e."id" = t."transactionExtraId"
JOIN (
  SELECT "transactionId", SUM("amountInBase") AS "total"
  FROM "${SCHEMA}"."transaction_split"
  GROUP BY "transactionId"
) g ON g."transactionId" = t."id"
WHERE t."deletedAt" IS NULL AND t."isSplit" = true;
`;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(VIEW_SQL);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DROP VIEW IF EXISTS "${SCHEMA}"."transaction_split_unit"`,
    );
  },
};
