import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { ResponseHelper } from '@admin/shared/helpers';
import type { CustomContextType } from '@admin/shared/types';

import type { AlertManagerService } from '../_services/alert-manager.service';
import { container } from '../_config';
import SYMBOLS from '../_services/symbols';

class V1AdminAlertManagerWebhook {
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    console.log('[AlertManagerWebhook] Request received', {
      invocationId: context.invocationId,
      schemaId: request.body?.schemaId
    });

    try {
      const service = container.get<AlertManagerService>(SYMBOLS.AlertManagerService);
      const result = await service.handleAlert(request.body);

      console.log('[AlertManagerWebhook] Request handled', result);
      context.res = {
        isRaw: true,
        status: 202,
        body: result,
        headers: { 'Content-Type': 'application/json' }
      };
    } catch (error: any) {
      console.log('[AlertManagerWebhook] Invalid alert payload', {
        message: error?.message
      });
      context.res = ResponseHelper.BadRequest({
        error: 'INVALID_ALERT_MANAGER_WEBHOOK_PAYLOAD',
        message: error?.message ?? 'Invalid Azure Monitor alert payload'
      });
    }
  }
}

export default openApi(V1AdminAlertManagerWebhook.httpTrigger as AzureFunction, '/v1/alert-manager/webhook', {
  post: {
    description: 'Receive Azure Monitor manager alert webhook notifications.',
    operationId: 'v1-admin-alert-manager-webhook',
    responses: {
      '202': { description: 'Accepted.' },
      '400': { description: 'Invalid Azure Monitor alert payload.' }
    }
  }
});
