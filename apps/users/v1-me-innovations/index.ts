import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction } from '@azure/functions';
import { JwtDecoder } from '@users/shared/decorators';
import { ResponseHelper, SwaggerHelper } from '@users/shared/helpers';
import type { AuthorizationService, DomainService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';

class V1MeInnovationsInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);

    try {
      const authInstance = await authorizationService.validate(context).checkInnovatorType().verify();
      const requestUser = authInstance.getUserInfo();

      const result = await domainService.innovations.getInnovationsByInnovatorId(requestUser.id);
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
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'Success'
      }),
      400: { description: 'Bad request' }
    }
  }
});
