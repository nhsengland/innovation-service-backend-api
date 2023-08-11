import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationExportRequestService } from '../_services/innovation-export-request.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationsExportRequestsCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationExportRequestService = container.get<InnovationExportRequestService>(
      SYMBOLS.InnovationExportRequestService
    );

    try {
      const auth = await authorizationService.validate(context).checkAccessorType().checkAssessmentType().verify();

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const result = await innovationExportRequestService.createExportRequest(
        auth.getContext(),
        params.innovationId,
        body
      );

      context.res = ResponseHelper.Created<ResponseDTO>({ id: result.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationsExportRequestsCreate.httpTrigger as AzureFunction,
  '/v1/{innovationId}/export-requests',
  {
    post: {
      operationId: 'v1-innovations-export-requests-create',
      description: 'Create export request.',
      tags: ['[v1] Innovation Export Requests'],
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      requestBody: SwaggerHelper.bodyJ2S(BodySchema),
      responses: {
        201: {
          description: 'Creates a new export request',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { id: { type: 'string' } }
              }
            }
          }
        },
        400: { description: 'The request is invalid.' },
        401: { description: 'The user is not authenticated.' },
        403: { description: 'The user is not authorized to access this resource.' },
        500: { description: 'An error occurred while processing the request.' }
      }
    }
  }
);
