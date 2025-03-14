import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationsService } from '../_services/innovations.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { ServiceRoleEnum } from '@innovations/shared/enums';
import { QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1InnovationsNeedingAction {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationsService = container.get<InnovationsService>(SYMBOLS.InnovationsService);

    try {
      const auth = await authorizationService
        .validate(context)
        .checkAccessorType({ organisationRole: [ServiceRoleEnum.QUALIFYING_ACCESSOR] })
        .verify();
      const domainContext = auth.getContext();

      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);
      const { skip, take, order } = queryParams;

      const result = await innovationsService.getInnovationsNeedingAction(domainContext, {
        pagination: { skip, take, order }
      });

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationsNeedingAction.httpTrigger as AzureFunction, '/v1/needing-action', {
  get: {
    operationId: 'v1-innovations-needing-action',
    description: 'Get innovations that need action',
    parameters: [],
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'Success'
      }),
      400: { description: 'Invalid innovation payload' }
    }
  }
});
