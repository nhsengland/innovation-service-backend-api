import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import { JwtDecoder } from '@admin/shared/decorators';
import { ResponseHelper } from '@admin/shared/helpers';
import type { AuthorizationService, DomainService } from '@admin/shared/services';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { JoiHelper, SwaggerHelper } from '@admin/shared/helpers';
import { ParamsSchema, QueryParamsSchema, QueryParamsType, type ParamsType } from './validation.schemas';

class V1MeInnovationsInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);

    try {
      await authorizationService.validate(context).checkAdminType().verify();

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const result = (
        await domainService.innovations.getInnovationsByInnovatorId(params.userId, queryParams.includeAsCollaborator)
      ).map(innovation => ({
        id: innovation.id,
        name: innovation.name,
        ...(innovation.isOwner !== undefined ? { isOwner: innovation.isOwner } : { isOwner: true })
      }));
      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1MeInnovationsInfo.httpTrigger as AzureFunction, '/v1/users/{userId}/innovations', {
  get: {
    description: 'Retrieves the user owned innovations.',
    operationId: 'v1-admin-user-innovations',
    tags: ['[v1] Innovations owned by user'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'Success'
      }),
      400: { description: 'Bad request' }
    }
  }
});
