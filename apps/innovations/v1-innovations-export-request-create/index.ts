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
import { BodySchema, BodyType, ParamsType, PathSchema } from './validation.schemas';

class V1InnovationsExportRequestsCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationsService = container.get<InnovationsService>(SYMBOLS.InnovationsService);

    try {
      const auth = await authorizationService.validate(context).checkAccessorType().verify();

      const domainContext = auth.getContext();

      const params = JoiHelper.Validate<ParamsType>(PathSchema, request.params);

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const organisationUnitId = domainContext.organisation?.organisationUnit?.id;

      // This never happens because the user is checked to be an accessor in the validator
      /* c8 ignore next 4 */
      if (!organisationUnitId) {
        context.res = ResponseHelper.Error(context, 'Organisation unit not found.');
        return;
      }

      const { requestReason } = body;

      const result = await innovationsService.createInnovationRecordExportRequest(
        domainContext,
        organisationUnitId,
        params.innovationId,
        { requestReason }
      );

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
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
        400: { description: 'Invalid innovation payload' }
      }
    }
  }
);
