import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import type { ResponseDTO } from './transformation.dtos';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationTransferService } from '../_services/innovation-transfer.service';
import SYMBOLS from '../_services/symbols';
import { BodySchema, BodyType } from './validations.schema';

class CreateInnovationTransfer {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationTransferService = container.get<InnovationTransferService>(SYMBOLS.InnovationTransferService);

    try {
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(body.innovationId)
        .checkInnovatorType()
        .checkInnovation({ isOwner: true })
        .verify();
      const requestUser = auth.getUserInfo();
      const domainContext = auth.getContext();

      const result = await innovationTransferService.createInnovationTransfer(
        {
          id: requestUser.id,
          identityId: requestUser.identityId
        },
        domainContext,
        body.innovationId,
        body.email,
        body.ownerToCollaborator
      );
      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(CreateInnovationTransfer.httpTrigger as AzureFunction, '/v1/transfers', {
  post: {
    description: 'Create an innovation transfer',
    operationId: 'createInnovationTransfer',
    parameters: [],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object'
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object'
            }
          }
        }
      },
      400: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: {
              type: 'object'
            }
          }
        }
      },
      422: { description: 'Unprocessable Entity' }
    }
  }
});
