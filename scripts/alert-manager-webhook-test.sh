#!/usr/bin/env bash
set -euo pipefail

WEBHOOK_URL="${ALERT_WEBHOOK_URL:-http://localhost:7071/api/v1/admin/alert-manager/webhook}"
WEBHOOK_KEY="${ALERT_WEBHOOK_KEY:-}"
ALERT_RULE="${ALERT_RULE:-Innovation Service Main Website}"
ALERT_RULE_ID="${ALERT_RULE_ID:-/subscriptions/test-sub/resourceGroups/test-rg/providers/microsoft.insights/metricAlerts/Innovation Service Main Website}"
RESOURCE_ID="${ALERT_RESOURCE_ID:-/subscriptions/test-sub/resourceGroups/test-rg/providers/microsoft.web/sites/test-site}"
PAUSE_SECONDS="${ALERT_TEST_PAUSE_SECONDS:-1}"
THROTTLE_WAIT_SECONDS="${ALERT_TEST_THROTTLE_WAIT_SECONDS:-22}"

headers=(-H "Content-Type: application/json")
if [[ -n "$WEBHOOK_KEY" ]]; then
  headers+=(-H "x-functions-key: $WEBHOOK_KEY")
fi

post_alert() {
  local condition="$1"
  local fired_at="$2"
  local alert_rule="${3:-$ALERT_RULE}"
  local alert_rule_id="$ALERT_RULE_ID"
  if [[ $# -ge 4 ]]; then
    alert_rule_id="$4"
  fi
  local resource_id="${5:-$RESOURCE_ID}"

  echo
  echo "Posting Azure Monitor common alert schema payload: $condition | $alert_rule | $resource_id"

  local alert_rule_id_line=""
  if [[ -n "$alert_rule_id" ]]; then
    alert_rule_id_line="\"alertRuleId\": \"$alert_rule_id\","
  fi

  curl -sS -i -X POST "$WEBHOOK_URL" \
    "${headers[@]}" \
    --data-binary @- <<JSON
{
  "schemaId": "azureMonitorCommonAlertSchema",
  "data": {
    "essentials": {
      "alertId": "synthetic-alert-instance",
      "alertRule": "$alert_rule",
      $alert_rule_id_line
      "severity": "Sev2",
      "signalType": "Metric",
      "monitorCondition": "$condition",
      "alertTargetIDs": ["$resource_id"],
      "firedDateTime": "$fired_at",
      "description": "Synthetic Azure Monitor alert manager webhook test"
    },
    "alertContext": {
      "conditionType": "SingleResourceMultipleMetricCriteria",
      "testPayload": true
    }
  }
}
JSON
}

timestamp="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"
other_resource="/subscriptions/test-sub/resourceGroups/test-rg/providers/microsoft.web/sites/test-site-slot"
ignored_rule="http-5xx-errors-alert"

echo "Scenario 1: same alert/resource flaps inside throttle window"

post_alert "Fired" "$timestamp"
sleep "$PAUSE_SECONDS"

post_alert "Fired" "$timestamp"
sleep "$PAUSE_SECONDS"

post_alert "Resolved" "$timestamp"
sleep "$PAUSE_SECONDS"

post_alert "Fired" "$timestamp"

echo
echo "Scenario 2: same alert/resource after throttle window"
echo "Waiting $THROTTLE_WAIT_SECONDS seconds before sending a reminder Fired event..."
sleep "$THROTTLE_WAIT_SECONDS"
post_alert "Fired" "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

echo
echo "Scenario 3: same alert but different resource should have separate throttle state"
post_alert "Fired" "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")" "$ALERT_RULE" "$ALERT_RULE_ID" "$other_resource"
sleep "$PAUSE_SECONDS"
post_alert "Fired" "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")" "$ALERT_RULE" "$ALERT_RULE_ID" "$other_resource"

echo
echo "Scenario 4: ignored ops-only alert should not create manager email"
post_alert "Fired" "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")" "$ignored_rule" "/subscriptions/test-sub/resourceGroups/test-rg/providers/microsoft.insights/metricAlerts/http-5xx-errors-alert" "$RESOURCE_ID"

echo
echo "Scenario 5: missing alertRuleId should use alertRule + resourceId fallback key"
post_alert "Fired" "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")" "Innovation Service Informational CPU" "" "$RESOURCE_ID"

echo
echo "Done. Expected behavior with ALERT_MANAGER_THROTTLE_MINUTES=0.333:"
echo "- Scenario 1: sent, suppressed, resolved_recorded, suppressed"
echo "- Scenario 2: sent after about 20 seconds"
echo "- Scenario 3: sent, then suppressed for different resource"
echo "- Scenario 4: ignored"
echo "- Scenario 5: sent using fallback key"
