import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { SwaggerHelper } from '@admin/shared/helpers/swagger.helper';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper } from '@admin/shared/helpers';
import type { AuthorizationService } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import SYMBOLS from '../_services/symbols';
import type { TermsOfUseService } from '../_services/terms-of-use.service';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1AdminTermsOfUseUpdate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const toUService = container.get<TermsOfUseService>(SYMBOLS.TermsOfUseService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context).checkAdminType().verify();

      const domainContext = auth.getContext();

      const result = await toUService.updateTermsOfUse(domainContext, body, params.touId);

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1AdminTermsOfUseUpdate.httpTrigger as AzureFunction, '/v1/tou/{touId}', {
  put: {
    description: 'Update terms of use.',
    operationId: 'v1-admin-terms-of-use-update',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    requestBody: SwaggerHelper.bodyJ2S(BodySchema, {
      description: 'The terms of use to be updated.'
    }),
    responses: {
      '200': SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'The terms of use have been updated.'
      }),
      '400': {
        description: 'Bad request.'
      },
      '401': {
        description: 'The user is not authorized to update terms of use.'
      },
      '500': {
        description: 'An error occurred while updating the terms of use.'
      }
    }
  }
});
