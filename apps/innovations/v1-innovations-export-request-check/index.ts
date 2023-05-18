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
import { PathParamsSchema, PathParamsType } from './validation.schemas';

class V1InnovationsExportRequestInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationsService = container.get<InnovationsService>(SYMBOLS.InnovationsService);

    try {
      const auth = await authorizationService.validate(context).checkAccessorType().verify();

      const domainContext = auth.getContext();

      const params = JoiHelper.Validate<PathParamsType>(PathParamsSchema, request.params);

      const result = await innovationsService.checkInnovationRecordExportRequest(domainContext, params.requestId);

      if (!result.canExport) {
        context.res = ResponseHelper.Forbidden();
        return;
      }

      context.res = ResponseHelper.Ok<ResponseDTO>(result); // this content is stripped.
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationsExportRequestInfo.httpTrigger as AzureFunction,
  '/v1/{innovationId}/export-requests',
  {
    head: {
      operationId: 'v1-innovations-export-request-check',
      description: 'Get export request info.',
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
        }
      ],
      responses: {
        200: { description: 'Success' },
        403: { description: 'Forbidden' }
      }
    }
  }
);
