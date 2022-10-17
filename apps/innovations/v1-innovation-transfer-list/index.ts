import type { AzureFunction, HttpRequest } from '@azure/functions'
import { mapOpenApi3_1 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import {
  AuthorizationServiceSymbol, AuthorizationServiceType,
} from '@innovations/shared/services';
import {
  JwtDecoder,
} from '@innovations/shared/decorators'

import { container } from '../_config';
import { InnovationTransferServiceSymbol, InnovationTransferServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import type { CustomContextType } from '@innovations/shared/types';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { QueryParamsSchema, QueryParamsType } from './validation.schemas';

class GetInnovationTransferList {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationTransferService = container.get<InnovationTransferServiceType>(InnovationTransferServiceSymbol);

    try {

      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .checkInnovatorType()
        .verify();
      const requestUser = auth.getUserInfo();

      const result = await innovationTransferService.getInnovationTransfersList(requestUser.id, queryParams.assignedToMe);
      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }

  }

}

export default openApi(GetInnovationTransferList.httpTrigger as AzureFunction, '/v1/transfers', {
  get: {
    description: 'Get innovation transfer list',
    operationId: 'getInnovationTransferList',
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
              },
            },
          },
        },
      },
    },
  },
});