import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, type AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationSupportsServiceSymbol, type InnovationSupportsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, type ParamsType } from './validation.schemas';


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
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(V1InnovationSupportInfo.httpTrigger as AzureFunction, '/v1/{innovationId}/supports/{supportId}', {
  get: {
    description: 'Get supporting information for an Innovation',
    operationId: 'v1-innovation-support-info',
    tags: ['[v1] Innovation Support'],
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

