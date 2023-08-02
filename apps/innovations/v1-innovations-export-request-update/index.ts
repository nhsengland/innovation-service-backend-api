import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationsService } from '../_services/innovations.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationsExportRequestsUpdate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationsService = container.get<InnovationsService>(SYMBOLS.InnovationsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkInnovation()
        .verify();

      const domainContext = auth.getContext();

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body, {
        userType: domainContext.currentRole.role
      });

      const { rejectReason, status } = body;

      const result = await innovationsService.updateInnovationRecordExportRequest(domainContext, params.requestId, {
        rejectReason: rejectReason ?? null,
        status
      });

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationsExportRequestsUpdate.httpTrigger as AzureFunction,
  '/v1/{innovationId}/export-requests/{requestId}/status',
  {
    patch: {
      operationId: 'v1-innovations-export-requests-update-status',
      description: 'updates export request status',
      tags: ['[v1] Innovations'],
      parameters: [
        {
          name: 'innovationId',
          in: 'path',
          required: true,
          description: 'Innovation ID',
          schema: {
            type: 'string',
            format: 'uuid'
          }
        },
        {
          name: 'requestId',
          in: 'path',
          required: true,
          description: 'Export request ID',
          schema: {
            type: 'string',
            format: 'uuid'
          }
        }
      ],
      responses: {
        200: { description: 'Success' },
        400: { description: 'Invalid innovation payload' }
      }
    }
  }
);
