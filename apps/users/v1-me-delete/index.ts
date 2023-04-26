import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@users/shared/helpers';
import {
  AuthorizationServiceSymbol,
  AuthorizationServiceType,
  DomainServiceSymbol,
  DomainServiceType,
} from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';

import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType } from './validation.schemas';

class V1MeDelete {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(
      AuthorizationServiceSymbol
    );
    const domainService = container.get<DomainServiceType>(DomainServiceSymbol);

    try {
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context).checkInnovatorType().verify();
      const requestUser = auth.getUserInfo();

      const result = await domainService.users.deleteUser(requestUser.id, { reason: body.reason });

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1MeDelete.httpTrigger as AzureFunction, '/v1/me/delete', {
  patch: {
    description: 'User delete',
    operationId: 'v1-me-delete',
    tags: ['[v1] Users'],
    parameters: [],
    requestBody: SwaggerHelper.bodyJ2S(BodySchema, { description: 'Reason for deletion' }),
    responses: {
      200: {
        description: 'User deleted successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { id: { type: 'string' } },
            },
          },
        },
      },
      '400': { description: 'Bad request.' },
    },
  },
});
