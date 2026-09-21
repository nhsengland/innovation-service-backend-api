import azureFunction from '.';

import { AzureHttpTriggerBuilder } from '@admin/shared/tests';
import { AlertManagerService } from '../_services/alert-manager.service';

jest.mock('../_services/alert-manager.service');

const payload = {
  schemaId: 'azureMonitorCommonAlertSchema',
  data: {
    essentials: {
      alertRule: 'Innovation Service Main Website',
      alertRuleId:
        '/subscriptions/sub/resourceGroups/rg/providers/microsoft.insights/metricAlerts/Innovation Service Main Website',
      severity: 'Sev2',
      monitorCondition: 'Fired',
      alertTargetIDs: ['/subscriptions/sub/resourceGroups/rg/providers/microsoft.web/sites/site-prd'],
      firedDateTime: '2026-06-04T09:59:00.000Z'
    },
    alertContext: {}
  }
};

describe('v1-admin-alert-manager-webhook Suite', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns accepted when the alert manager service handles the payload', async () => {
    jest.spyOn(AlertManagerService.prototype, 'handleAlert').mockResolvedValue({
      action: 'sent',
      reason: 'Manager email sent'
    });

    const result = await new AzureHttpTriggerBuilder().setBody(payload).call<{ action: string }>(azureFunction);

    expect(result.status).toBe(202);
    expect(result.body).toStrictEqual({ action: 'sent', reason: 'Manager email sent' });
  });

  it('returns bad request when the alert manager service rejects the payload', async () => {
    jest
      .spyOn(AlertManagerService.prototype, 'handleAlert')
      .mockRejectedValue(new Error('Invalid Azure Monitor payload'));

    const result = await new AzureHttpTriggerBuilder()
      .setBody({ schemaId: 'legacyMetricAlert' })
      .call<{ error: string; message: string }>(azureFunction);

    expect(result.status).toBe(400);
    expect(result.body).toStrictEqual({
      error: 'INVALID_ALERT_MANAGER_WEBHOOK_PAYLOAD',
      message: 'Invalid Azure Monitor payload'
    });
  });
});
