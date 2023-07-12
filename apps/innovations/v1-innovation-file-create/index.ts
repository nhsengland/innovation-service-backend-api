import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationFileService } from '../_services/innovation-file.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationFileCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationFilesService = container.get<InnovationFileService>(SYMBOLS.InnovationFileService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .checkInnovation()
        .verify();

      const result = await innovationFilesService.createFile(
        auth.getContext(),
        params.innovationId,
        auth.getInnovationInfo().status,
        body
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationFileCreate.httpTrigger as AzureFunction, '/v1/{innovationId}/files', {
  post: {
    description: 'Create a new innovation file.',
    operationId: 'v1-innovation-file-create',
    tags: ['[v1] Innovation Files'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    requestBody: SwaggerHelper.bodyJ2S(BodySchema),
    responses: {
      200: {
        description: 'The innovation file has been created.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' }
              },
              required: ['id']
            }
          }
        }
      },
      400: {
        description: 'The innovation file could not be created.'
      },
      401: {
        description: 'The user is not authorized to create an innovation file.'
      },
      403: {
        description: 'The user is not allowed to create an innovation file.'
      },
      404: {
        description: 'The innovation could not be found.'
      },
      500: {
        description: 'An unexpected error occurred while creating the innovation file.'
      }
    }
  }
});
