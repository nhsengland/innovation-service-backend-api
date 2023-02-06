import type { AzureFunction, HttpRequest } from '@azure/functions'
import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationsServiceSymbol, InnovationsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { PathParamsSchema, PathParamsType } from './validation.schemas';


class V1InnovationsExportRequestInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationsService = container.get<InnovationsServiceType>(InnovationsServiceSymbol);

    try {

      const auth = await authorizationService.validate(context)
        .checkInnovatorType()
        .checkAccessorType()
        .verify();

      const domainContext = auth.getContext();

      const params = JoiHelper.Validate<PathParamsType>(
        PathParamsSchema,
        request.params,
        { userType: domainContext.currentRole, userOrganisationRole: domainContext.organisation?.role }
      );

      const result = await innovationsService.getInnovationRecordExportRequestInfo(
        domainContext,
        params.requestId
      );

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}


export default openApi(V1InnovationsExportRequestInfo.httpTrigger as AzureFunction, '/v1/{innovationId}/export-requests/{requestId}', {
  get: {
    operationId: 'v1-innovations-export-request-info',
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
      400: { description: 'Invalid innovation payload' },
    },
  },
});
