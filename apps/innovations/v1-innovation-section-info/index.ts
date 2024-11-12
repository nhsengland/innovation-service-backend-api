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

class GetInnovationSectionInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationSectionsService = container.get<InnovationSectionsService>(SYMBOLS.InnovationSectionsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const authInstance = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkAdminType()
        .checkInnovation()
        .verify();

      const domainContext = authInstance.getContext();

      const result = await innovationSectionsService.getInnovationSectionInfo(
        domainContext,
        params.innovationId,
        params.sectionKey,
        queryParams
      );
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        section: result.section,
        status: result.status,
        submittedAt: result.submittedAt,
        submittedBy: result.submittedBy,
        data: result.data,
        ...(result.tasksIds ? { tasksIds: result.tasksIds } : {})
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  GetInnovationSectionInfo.httpTrigger as AzureFunction,
  '/v1/{innovationId}/sections/{sectionKey}',
  {
    get: {
      description: 'Get an innovation section info.',
      tags: ['Innovation'],
      summary: 'Get an innovation section info.',
      operationId: 'v1-innovation-section-info',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
          description: 'Innovation section info.'
        }),
        401: {
          description: 'Unauthorized'
        },
        403: {
          description: 'Forbidden'
        },
        404: {
          description: 'Not found'
        },
        500: {
          description: 'Internal server error'
        }
      }
    }
  }
);
