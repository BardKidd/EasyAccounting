# Audit Log — 本地 MongoDB 分片實驗環境

audit log 的水平擴展練習環境。完整背景與實驗步驟見
[`docs/specs/audit-log-sharding-spec.md`](../../../../docs/specs/audit-log-sharding-spec.md)。

## 拓撲

```
mongos (router, :27017)  ← app / seed 連這裡
 ├─ config server RS  cfgrs    (configsvr, :27019)
 ├─ shard1 RS         shard1rs (shard1, :27018)
 └─ shard2 RS         shard2rs (shard2, :27028)
```

shard key：`{ userId: 1, createdAt: 1 }`（compound ranged）。

## 啟動

```bash
cd apps/backend

# 1. 起 cluster
docker compose -f docker/mongo-shard/docker-compose.yml up -d

# 2. 初始化 replica set + 加 shard + 開分片（跑一次，可重複）
./docker/mongo-shard/init-cluster.sh
```

## 接上 app / 灌資料

在 `apps/backend/.env`（或 `.env.development`）加：

```
AUDIT_MONGODB_URL=mongodb://localhost:27017/easyaccounting_audit
```

灌合成資料把 chunk 分裂逼出來：

```bash
pnpm tsx src/utils/seedAuditLog.ts 200000 500   # 20 萬筆、500 使用者
```

## 觀察分片（連 mongos）

```bash
docker compose -f docker/mongo-shard/docker-compose.yml exec mongos mongosh --port 27017
```

```js
sh.status();                                  // chunk 在各 shard 的分佈
use easyaccounting_audit;
db.auditlogs.getShardDistribution();          // 各 shard 資料量 / 筆數

// targeted（帶 shard key 前綴）→ 只命中一個 shard
db.auditlogs.find({ userId: 'seed-user-000001' }).explain('executionStats').queryPlanner.winningPlan;

// scatter-gather（不帶 userId）→ 廣播到所有 shard
db.auditlogs.find({ action: 'DELETE' }).explain('executionStats');
```

## 清掉重來

```bash
docker compose -f docker/mongo-shard/docker-compose.yml down -v   # -v 連 volume 一起刪
```

> ⚠️ 這是**本地練習**環境，非生產部署。生產的 audit log 可先單 replica set，待量大再升級分片；
> Atlas 免費/共享層不支援分片（需 M30+）。
