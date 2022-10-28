import type { AzureFunction, HttpRequest } from '@azure/functions';
import { mapOpenApi3_1 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { type AuthorizationServiceType, AuthorizationServiceSymbol } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { type InnovationSupportsServiceType, InnovationSupportsServiceSymbol } from '../_services/interfaces';

import { type ParamsType, ParamsSchema } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';


class V1InnovationSupportInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationSupportsService = container.get<InnovationSupportsServiceType>(InnovationSupportsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkAccessorType()
        .verify();

      const result = await innovationSupportsService.getInnovationSupportInfo(params.supportId);
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        status: result.status,
        engagingAccessors: result.engagingAccessors
      });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }

  }

}

export default openApi(V1InnovationSupportInfo.httpTrigger as AzureFunction, '/v1/{innovationId}/supports/{supportId}', {
  get: {
    description: 'Get supporting information for an Innovation',
    operationId: 'v1-innovation-support-info',
    tags: ['Innovation Support'],
    parameters: [
      {
        in: 'path',
        name: 'innovationId',
        required: true,
        schema: {
          type: 'string',
        }
      }, {
        in: 'path',
        name: 'supportId',
        required: true,
        schema: {
          type: 'string',
        }
      },
    ],
    responses: {
      200: {
        description: 'OK',
      },
      400: {
        description: 'Bad Request',
      },
      404: {
        description: 'Not Found',
      },
    }
  }
});

