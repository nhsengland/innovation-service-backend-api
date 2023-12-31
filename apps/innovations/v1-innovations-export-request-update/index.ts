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
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationsExportRequestsUpdate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationExportRequestService = container.get<InnovationExportRequestService>(
      SYMBOLS.InnovationExportRequestService
    );

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .checkInnovation()
        .verify();
      const domainContext = auth.getContext();

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body, {
        userType: domainContext.currentRole.role
      });

      await innovationExportRequestService.updateExportRequest(domainContext, params.requestId, body);

      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationsExportRequestsUpdate.httpTrigger as AzureFunction,
  '/v1/{innovationId}/export-requests/{requestId}',
  {
    patch: {
      operationId: 'v1-innovations-export-request-update',
      description: 'Patch export request status',
      tags: ['[v1] Innovation Export Requests'],
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      requestBody: SwaggerHelper.bodyJ2S(BodySchema),
      responses: {
        204: { description: 'Export request was successfully updated' },
        400: { description: 'The request is invalid.' },
        401: { description: 'The user is not authenticated.' },
        403: { description: 'The user is not authorized to access this resource.' },
        500: { description: 'An error occurred while processing the request.' }
      }
    }
  }
);
