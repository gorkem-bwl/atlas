#!/bin/bash
#
# CRM workflow multi-step smoke test against a running Atlas server.
#
# Usage:
#   1. Start the server against a fresh DB:
#        psql postgresql://postgres:postgres@localhost:5432/postgres -c "CREATE DATABASE atlas_smoke;"
#        cd packages/server && \
#          DATABASE_URL=postgresql://postgres:postgres@localhost:5432/atlas_smoke \
#          NODE_ENV=development \
#          npm run dev
#   2. In another shell:
#        bash packages/server/scripts/crm-workflow-smoke.sh
#
# Exits non-zero on any assertion failure.
# Covers: setup, create-with-steps, append, reorder, update, delete with
# gap-close, LAST_STEP error code, condition-field validation, and the live
# executor firing on deal_won (task + tag + executionCount bump).
set -euo pipefail

BASE=http://localhost:3001/api/v1
PASS=0
FAIL=0

check() {
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✓ $label"
    PASS=$((PASS+1))
  else
    echo "  ✗ $label  expected=$expected  actual=$actual"
    FAIL=$((FAIL+1))
  fi
}

echo "=== 1. Setup admin ==="
SETUP=$(curl -sS -X POST "$BASE/auth/setup" \
  -H 'Content-Type: application/json' \
  -d '{"adminName":"Smoke","adminEmail":"smoke@test.local","adminPassword":"SmokePass123!","companyName":"Smoke Co"}')
TOKEN=$(echo "$SETUP" | jq -r '.data.accessToken')
[ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] && echo "  ✓ setup → token obtained" && PASS=$((PASS+1)) || { echo "  ✗ no token: $SETUP"; exit 1; }

AUTH="Authorization: Bearer $TOKEN"

echo ""
echo "=== 2. Create workflow with 3 steps ==="
WF=$(curl -sS -X POST "$BASE/crm/workflows" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"Smoke chain","trigger":"deal_won","triggerConfig":{},"steps":[
    {"action":"create_task","actionConfig":{"taskTitle":"Welcome"}},
    {"action":"add_tag","actionConfig":{"tag":"smoke"}},
    {"action":"log_activity","actionConfig":{"activityType":"note","body":"Won"}}
  ]}')
WF_ID=$(echo "$WF" | jq -r '.data.id')
STEP_COUNT=$(echo "$WF" | jq -r '.data.steps | length')
FIRST_ACTION=$(echo "$WF" | jq -r '.data.steps[0].action')
FIRST_POS=$(echo "$WF" | jq -r '.data.steps[0].position')
check "workflow created"                "ok"           "$([ -n "$WF_ID" ] && [ "$WF_ID" != "null" ] && echo ok || echo miss)"
check "3 steps returned"                "3"            "$STEP_COUNT"
check "first step action = create_task" "create_task"  "$FIRST_ACTION"
check "first step position = 0"         "0"            "$FIRST_POS"

echo ""
echo "=== 3. Append a 4th step ==="
APPENDED=$(curl -sS -X POST "$BASE/crm/workflows/$WF_ID/steps" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"action":"send_notification","actionConfig":{"message":"yo"}}')
APPENDED_POS=$(echo "$APPENDED" | jq -r '.data.position')
check "appended step position = 3"      "3"            "$APPENDED_POS"

echo ""
echo "=== 4. GET /:id returns all 4 steps ordered ==="
GOT=$(curl -sS "$BASE/crm/workflows/$WF_ID" -H "$AUTH")
POS_SEQ=$(echo "$GOT" | jq -r '.data.steps | map(.position) | @csv')
check "positions 0,1,2,3"               "0,1,2,3"      "$POS_SEQ"

echo ""
echo "=== 5. Reorder: reverse the 4 steps ==="
IDS=$(echo "$GOT" | jq -c '.data.steps | reverse | map(.id)')
curl -sS -X POST "$BASE/crm/workflows/$WF_ID/steps/reorder" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"stepIds\":$IDS}" > /dev/null
AFTER=$(curl -sS "$BASE/crm/workflows/$WF_ID" -H "$AUTH")
NEW_FIRST=$(echo "$AFTER" | jq -r '.data.steps[0].action')
check "reorder → first action = send_notification" "send_notification" "$NEW_FIRST"

echo ""
echo "=== 6. Update step actionConfig ==="
STEP_TO_UPDATE=$(echo "$AFTER" | jq -r '.data.steps[0].id')
UPD_UAT=$(echo "$AFTER" | jq -r '.data.steps[0].updatedAt')
UPDATED=$(curl -sS -X PATCH "$BASE/crm/workflows/$WF_ID/steps/$STEP_TO_UPDATE" \
  -H "$AUTH" -H 'Content-Type: application/json' -H "If-Unmodified-Since: $UPD_UAT" \
  -d '{"actionConfig":{"message":"updated"}}')
UPD_MSG=$(echo "$UPDATED" | jq -r '.data.actionConfig.message')
check "updated message = 'updated'"     "updated"      "$UPD_MSG"

echo ""
echo "=== 7. Delete non-last step (gap closes) ==="
DEL_TARGET=$(echo "$AFTER" | jq -r '.data.steps[1].id')
curl -sS -X DELETE "$BASE/crm/workflows/$WF_ID/steps/$DEL_TARGET" -H "$AUTH" > /dev/null
AFTER_DEL=$(curl -sS "$BASE/crm/workflows/$WF_ID" -H "$AUTH")
LEN=$(echo "$AFTER_DEL" | jq -r '.data.steps | length')
POS_AFTER=$(echo "$AFTER_DEL" | jq -r '.data.steps | map(.position) | @csv')
check "3 steps remain after delete"     "3"            "$LEN"
check "positions 0,1,2 (gap closed)"    "0,1,2"        "$POS_AFTER"

echo ""
echo "=== 8. Delete last remaining step returns 400 LAST_STEP ==="
# First collapse to 1 step
STEPS=$(echo "$AFTER_DEL" | jq -r '.data.steps[1].id')
curl -sS -X DELETE "$BASE/crm/workflows/$WF_ID/steps/$(echo "$AFTER_DEL" | jq -r '.data.steps[0].id')" -H "$AUTH" > /dev/null
curl -sS -X DELETE "$BASE/crm/workflows/$WF_ID/steps/$(echo "$AFTER_DEL" | jq -r '.data.steps[1].id')" -H "$AUTH" > /dev/null
LAST=$(curl -sS "$BASE/crm/workflows/$WF_ID" -H "$AUTH" | jq -r '.data.steps[0].id')
RESP=$(curl -sS -X DELETE "$BASE/crm/workflows/$WF_ID/steps/$LAST" -H "$AUTH" -w "HTTP=%{http_code}")
CODE=$(echo "$RESP" | grep -oE 'HTTP=[0-9]+' | cut -d= -f2)
BODY=$(echo "$RESP" | sed 's/HTTP=[0-9]*$//')
ERR_CODE=$(echo "$BODY" | jq -r '.code // empty')
check "DELETE last step = 400"          "400"          "$CODE"
check "response code = LAST_STEP"       "LAST_STEP"    "$ERR_CODE"

echo ""
echo "=== 9. Condition validation: bad field → 400 ==="
BAD=$(curl -sS -X POST "$BASE/crm/workflows" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"bad","trigger":"deal_won","steps":[{"action":"create_task","actionConfig":{"taskTitle":"x"},"condition":{"field":"deal.secret","operator":"eq","value":"x"}}]}' \
  -w "HTTP=%{http_code}")
BAD_CODE=$(echo "$BAD" | grep -oE 'HTTP=[0-9]+' | cut -d= -f2)
check "unknown condition field → 400"   "400"          "$BAD_CODE"

echo ""
echo "=== 10. Executor: create deal → win → side effects ==="
curl -sS -X POST "$BASE/crm/stages/seed" -H "$AUTH" > /dev/null
STAGES=$(curl -sS "$BASE/crm/stages/list" -H "$AUTH")
STAGE_ID=$(echo "$STAGES" | jq -r '.data.stages[0].id')

# Seed a simple workflow
curl -sS -X POST "$BASE/crm/workflows" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"Exec chain","trigger":"deal_won","steps":[
    {"action":"create_task","actionConfig":{"taskTitle":"Exec task"}},
    {"action":"add_tag","actionConfig":{"tag":"exec-tag"}}
  ]}' > /dev/null

DEAL=$(curl -sS -X POST "$BASE/crm/deals" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Smoke deal\",\"value\":1000,\"stageId\":\"$STAGE_ID\"}")
DEAL_ID=$(echo "$DEAL" | jq -r '.data.id')
curl -sS -X POST "$BASE/crm/deals/$DEAL_ID/won" -H "$AUTH" > /dev/null
sleep 1  # let executor commit

DEAL_AFTER=$(curl -sS "$BASE/crm/deals/$DEAL_ID" -H "$AUTH")
HAS_TAG=$(echo "$DEAL_AFTER" | jq -r '.data.tags | contains(["exec-tag"])')
check "deal tagged with exec-tag"       "true"         "$HAS_TAG"

TASKS=$(curl -sS "$BASE/work/tasks" -H "$AUTH")
HAS_TASK=$(echo "$TASKS" | jq -r '[.data.tasks[] | select(.title == "Exec task")] | length > 0')
check "task 'Exec task' created"        "true"         "$HAS_TASK"

# executionCount bumped
WFS=$(curl -sS "$BASE/crm/workflows" -H "$AUTH")
EXEC_COUNT=$(echo "$WFS" | jq -r '.data.workflows | map(select(.name == "Exec chain")) | .[0].executionCount')
check "executionCount = 1"              "1"            "$EXEC_COUNT"

echo ""
echo "=== RESULT ==="
echo "  $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ]
