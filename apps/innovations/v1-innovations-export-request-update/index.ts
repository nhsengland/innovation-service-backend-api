import type { AzureFunction, HttpRequest } from '@azure/functions'
import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationsServiceSymbol, InnovationsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, PathParamsSchema, PathParamsType } from './validation.schemas';


class V1InnovationsExportRequestsUpdate {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationsService = container.get<InnovationsServiceType>(InnovationsServiceSymbol);

    try {

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .checkInnovatorType()
        .checkAccessorType()
        .verify();

      const requestUser = auth.getUserInfo();

      const params = JoiHelper.Validate<PathParamsType>(
        PathParamsSchema,
        request.params,
        { userType: requestUser.type, userOrganisationRole: requestUser.organisations[0]?.role }
      );

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const { rejectReason, status } = body;

      const result = await innovationsService.updateInnovationRecordExportRequest(
        requestUser,
        params.requestId,
        { rejectReason, status }
      );

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}


export default openApi(V1InnovationsExportRequestsUpdate.httpTrigger as AzureFunction, '/v1/{innovationId}/export-requests/{requestId}', {
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
      400: { description: 'Invalid innovation payload' },
    },
  },
});
