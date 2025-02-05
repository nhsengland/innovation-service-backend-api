import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';

import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationSectionsService } from '../_services/innovation-sections.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';

class GetInnovationAllSectionsList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationSectionsService = container.get<InnovationSectionsService>(SYMBOLS.InnovationSectionsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const query = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAdminType()
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkInnovation()
        .verify();

      const result = await innovationSectionsService.findAllSections(
        auth.getContext(),
        params.innovationId,
        query.version
      );
      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(GetInnovationAllSectionsList.httpTrigger as AzureFunction, '/v1/{innovationId}/all-sections', {
  get: {
    description: 'Get an innovation sections list details.',
    tags: ['Innovation'],
    summary: 'Get an innovation sections list details.',
    operationId: 'v1-innovation-all-sections-list',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'Success'
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
