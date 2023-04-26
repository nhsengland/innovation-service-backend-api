import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction } from '@azure/functions';
import { JwtDecoder } from '@users/shared/decorators';
import { ResponseHelper } from '@users/shared/helpers';
import {
  AuthorizationServiceSymbol,
  AuthorizationServiceType,
  DomainServiceSymbol,
  DomainServiceType,
} from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import type { ResponseDTO } from './transformation.dtos';

class V1MeInnovationsInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(
      AuthorizationServiceSymbol
    );
    const domainService = container.get<DomainServiceType>(DomainServiceSymbol);

    try {
      const authInstance = await authorizationService
        .validate(context)
        .checkInnovatorType()
        .verify();
      const requestUser = authInstance.getUserInfo();

      const result = await domainService.innovations.getInnovationsByOwnerId(requestUser.id);
      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1MeInnovationsInfo.httpTrigger as AzureFunction, '/v1/me/innovations', {
  get: {
    description: 'Retrieves the user owned innovations.',
    operationId: 'v1-me-innovations',
    tags: ['[v1] Owned innovations information'],
    parameters: [],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                  },
                  name: {
                    type: 'string',
                  },
                  collaboratorsCount: {
                    type: 'number',
                  },
                  expirationTransferDate: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
      400: { description: 'Bad request' },
    },
  },
});
