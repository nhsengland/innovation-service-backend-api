import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { SwaggerHelper } from '@admin/shared/helpers/swagger.helper';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper } from '@admin/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import { TermsOfUseTypeEnum } from '@admin/shared/enums';
import SYMBOLS from '../_services/symbols';
import type { TermsOfUseService } from '../_services/terms-of-use.service';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1AdminTermsOfUse {
  @JwtDecoder()
  static async httpTrigger(
    context: CustomContextType,
    request: HttpRequest
  ): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(
      AuthorizationServiceSymbol
    );
    const toUService = container.get<TermsOfUseService>(SYMBOLS.TermsOfUseService);

    try {

      const pathParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService
        .validate(context)
        .checkAdminType()
        .verify();

      const result = await toUService.getTermsOfUse(pathParams.touId);

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1AdminTermsOfUse.httpTrigger as AzureFunction,
  '/v1/tou/{touId}',
  {
    get: {
      description: 'Get terms of use.',
      operationId: 'v1-admin-terms-of-use',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        '200': {
          description: 'The terms of use',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  touType: { type: 'string', enum: Object.values(TermsOfUseTypeEnum) },
                  summary: { type: 'string' },
                  releaseAt: { type: 'string', format: 'date-time', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        '400': { description: 'Bad request.' },
        '401': { description: 'The user is not authorized to get terms of use.' },
        '404': { description: 'The terms of use was not found.' },
        '500': { description: 'An error occurred while listing the terms of use.' },
      },
    },
  }
);
