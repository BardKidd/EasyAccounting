// 在 mongos 上執行（由 init-cluster.sh 以 --file 帶入）。
// 加入兩個 shard、調小 chunk size、對 audit log collection 開分片。
// shard key = { userId: 1, createdAt: 1 }（與 src/models/auditLog.ts 的索引一致）。

const AUDIT_DB = 'easyaccounting_audit';
const COLL = 'auditlogs';

// 1) 加入兩個 shard（單節點 replica set）。重複執行會回 "already exists"，無害。
try {
  sh.addShard('shard1rs/shard1:27018');
} catch (e) {
  print('addShard shard1: ' + e.message);
}
try {
  sh.addShard('shard2rs/shard2:27028');
} catch (e) {
  print('addShard shard2: ' + e.message);
}

// 2) 調小 chunk size 至 1MB，讓 lab 不必塞 GB 資料就能看到 chunk 分裂與 balancer 搬移。
db.getSiblingDB('config').settings.updateOne(
  { _id: 'chunksize' },
  { $set: { value: 1 } },
  { upsert: true },
);

// 3) 啟用 DB 分片。
try {
  sh.enableSharding(AUDIT_DB);
} catch (e) {
  print('enableSharding: ' + e.message);
}

// 4) 建立 shard key 索引（idempotent；須與 model 定義完全一致）。
db.getSiblingDB(AUDIT_DB)[COLL].createIndex({ userId: 1, createdAt: 1 });

// 5) 對 collection 開分片。
try {
  sh.shardCollection(AUDIT_DB + '.' + COLL, { userId: 1, createdAt: 1 });
  print('✅ ' + AUDIT_DB + '.' + COLL + ' sharded on { userId:1, createdAt:1 }');
} catch (e) {
  print('shardCollection: ' + e.message);
}

print('--- sh.status() ---');
sh.status();
