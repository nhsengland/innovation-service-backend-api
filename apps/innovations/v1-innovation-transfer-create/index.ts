import type { AzureFunction, HttpRequest } from '@azure/functions'
import { mapOpenApi3_1 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import { InnovationTransferServiceSymbol, InnovationTransferServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';

import type { CustomContextType } from '@innovations/shared/types';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import {
  AuthorizationServiceSymbol, AuthorizationServiceType,
} from '@innovations/shared/services';
import {
  JwtDecoder,
} from '@innovations/shared/decorators'

import { container } from '../_config';

import { BodySchema, BodyType } from './validations.schema';

class CreateInnovationTransfer {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationTransferService = container.get<InnovationTransferServiceType>(InnovationTransferServiceSymbol);

    try {

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(body.innovationId)
        .checkAdminType()
        .checkInnovatorType()
        .checkInnovation()
        .verify();
      const requestUser = auth.getUserInfo();

      const result = await innovationTransferService.createInnovationTransfer(
        {
          id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type
        },
        body.innovationId,
        body.email
      );
      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }
  }
}

export default openApi(CreateInnovationTransfer.httpTrigger as AzureFunction, '/v1/innovation-transfers', {
  post: {
    description: 'Create an innovation transfer',
    operationId: 'createInnovationTransfer',
    parameters: [],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
      },
      400: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
      },
    },
  },
});