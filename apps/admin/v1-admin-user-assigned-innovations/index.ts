import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import { JwtDecoder } from '@admin/shared/decorators';
import { ResponseHelper } from '@admin/shared/helpers';
import type { AuthorizationService } from '@admin/shared/services';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { JoiHelper, SwaggerHelper } from '@admin/shared/helpers';
import { ParamsSchema, type ParamsType } from './validation.schemas';
import type { UsersService } from '../_services/users.service';
import SYMBOLS from '../_services/symbols';

class V1AdminUserAssignedInnovations {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService.validate(context).checkAdminType().verify();

      const result = await usersService.getAssignedInnovations(params.userId);

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1AdminUserAssignedInnovations.httpTrigger as AzureFunction,
  '/v1/users/{userId}/assigned-innovations',
  {
    get: {
      description: 'Retrieves the user assigned innovations.',
      operationId: 'v1-admin-user-assigned-innovations',
      tags: ['[v1] Innovations'],
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
          description: 'List of innovations assigned to the user'
        }),
        400: { description: 'Bad Request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
        500: { description: 'Internal server error' }
      }
    }
  }
);
