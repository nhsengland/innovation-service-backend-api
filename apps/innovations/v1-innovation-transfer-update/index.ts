import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationTransferServiceSymbol, InnovationTransferServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validations.schema';


class V1InnovationTransferUpdate {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const transferService = container.get<InnovationTransferServiceType>(InnovationTransferServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .checkInnovatorType()
        .verify();
      const requestUser = auth.getUserInfo();

      const result = await transferService.updateInnovationTransferStatus({
        id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type
      }, params.transferId, body.status);

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationTransferUpdate.httpTrigger as AzureFunction, '/v1/innovation-transfers/{transferId}', {
  patch: {
    description: 'Update an innovation transfer status',
    operationId: 'updateInnovationTransferStatus',
    parameters: [
      {
        name: 'transferId',
        in: 'path',
        required: true,
        description: 'The innovation transfer id',
        schema: {
          type: 'string',
        },
      },
    ],
    requestBody: {
      description: 'The innovation transfer status',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
          },
        },
      },
    },
    responses: {
      204: {
        description: 'The innovation transfer status has been updated',
      },
      400: {
        description: 'The innovation transfer status is invalid',
      },
      401: {
        description: 'The user is not authorized to update the innovation transfer status',
      },
      404: {
        description: 'The innovation transfer does not exist',
      },
      500: {
        description: 'An error occurred while updating the innovation transfer status',
      },
    },
  },
});
