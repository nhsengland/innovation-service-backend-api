import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationTransferService } from '../_services/innovation-transfer.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1InnovationTransferList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationTransferService = container.get<InnovationTransferService>(SYMBOLS.InnovationTransferService);

    try {
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const auth = await authorizationService.validate(context).checkInnovatorType().verify();
      const requestUser = auth.getUserInfo();

      const result = await innovationTransferService.getInnovationTransfersList(
        requestUser.id,
        queryParams.assignedToMe
      );
      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationTransferList.httpTrigger as AzureFunction, '/v1/transfers', {
  get: {
    description: 'Get innovation transfer list',
    operationId: 'getInnovationTransferList',
    parameters: [],
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'The innovation assessment has been created.'
      })
    }
  }
});
