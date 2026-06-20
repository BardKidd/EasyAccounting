#!/usr/bin/env bash
# 初始化本地 MongoDB sharded cluster（config RS + 2 shard RS），加 shard，對 audit log 開分片。
# 在 `docker compose ... up -d` 之後執行一次即可。可重複執行（idempotent）。
set -euo pipefail

COMPOSE="docker compose -f $(dirname "$0")/docker-compose.yml"

echo "==> [1/4] 初始化 config server replica set (cfgrs)"
$COMPOSE exec -T configsvr mongosh --port 27019 --quiet --eval '
  try { rs.initiate({_id:"cfgrs", configsvr:true, members:[{_id:0, host:"configsvr:27019"}]}); print("cfgrs initiated"); }
  catch (e) { print("cfgrs: " + e.message); }
'

echo "==> [2/4] 初始化 shard replica sets (shard1rs / shard2rs)"
$COMPOSE exec -T shard1 mongosh --port 27018 --quiet --eval '
  try { rs.initiate({_id:"shard1rs", members:[{_id:0, host:"shard1:27018"}]}); print("shard1rs initiated"); }
  catch (e) { print("shard1rs: " + e.message); }
'
$COMPOSE exec -T shard2 mongosh --port 27028 --quiet --eval '
  try { rs.initiate({_id:"shard2rs", members:[{_id:0, host:"shard2:27028"}]}); print("shard2rs initiated"); }
  catch (e) { print("shard2rs: " + e.message); }
'

echo "==> [3/4] 等待各 replica set 選出 primary 並讓 mongos 連上 config server ..."
# mongos 需待 config RS 就緒才會 ready；輪詢直到 mongos 可回應 ping（最多 ~60s）。
for i in $(seq 1 30); do
  if $COMPOSE exec -T mongos mongosh --port 27017 --quiet --eval 'db.adminCommand({ping:1})' >/dev/null 2>&1; then
    echo "    mongos ready."
    break
  fi
  sleep 2
  if [ "$i" -eq 30 ]; then echo "    mongos 仍未就緒，請檢查 docker compose logs mongos"; exit 1; fi
done

echo "==> [4/4] 加 shard + 開分片 (shard key: { userId:1, createdAt:1 })"
$COMPOSE exec -T mongos mongosh --port 27017 --quiet --file /scripts/init-cluster.js

echo ""
echo "完成。app 連線字串："
echo "  AUDIT_MONGODB_URL=mongodb://localhost:27017/easyaccounting_audit"
