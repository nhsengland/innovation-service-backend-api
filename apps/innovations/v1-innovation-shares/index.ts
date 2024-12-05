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
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationShares {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationsService = container.get<InnovationsService>(SYMBOLS.InnovationsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkAssessmentType()
        .checkAdminType()
        .checkAccessorType()
        .checkInnovation()
        .verify();

      const result = await innovationsService.getInnovationShares(params.innovationId);
      context.res = ResponseHelper.Ok<ResponseDTO>(
        result.map(item => ({
          organisation: {
            id: item.organisation.id,
            name: item.organisation.name,
            acronym: item.organisation.acronym
          }
        }))
      );
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationShares.httpTrigger as AzureFunction, '/v1/{innovationId}/shares', {
  get: {
    description: 'Get all the shares for an innovation.',
    tags: ['Innovation'],
    summary: 'Get all the shares for an innovation.',
    operationId: 'v1-innovation-shares',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'OK'
      }),
      401: {
        description: 'Unauthorized'
      },
      403: {
        description: 'Forbidden'
      },
      404: {
        description: 'Not Found'
      },
      500: {
        description: 'Internal Server Error'
      }
    }
  }
});
