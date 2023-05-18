import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { CurrentDocumentSchemaMap } from '@innovations/shared/schemas/innovation-record';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationSectionsService } from '../_services/innovation-sections.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationSectionUpdate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationSectionsService = container.get<InnovationSectionsService>(SYMBOLS.InnovationSectionsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const key = params.sectionKey;
      const body = JoiHelper.Validate<{ [key: string]: any }>(CurrentDocumentSchemaMap[key], request.body);

      const authInstance = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkInnovation()
        .verify();
      const requestUser = authInstance.getUserInfo();
      const domainContext = authInstance.getContext();

      const result = await innovationSectionsService.updateInnovationSectionInfo(
        { id: requestUser.id },
        domainContext,
        params.innovationId,
        params.sectionKey,
        body
      );
      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result?.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationSectionUpdate.httpTrigger as AzureFunction,
  '/v1/{innovationId}/sections/{sectionKey}',
  {
    put: {
      description: 'Update an innovation section info.',
      tags: ['Innovation'],
      summary: 'Update an innovation section info.',
      operationId: 'v1-innovation-section-update',
      parameters: [
        { in: 'path', name: 'innovationId', required: true, schema: { type: 'string' } },
        { in: 'path', name: 'sectionKey', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        description: 'Innovation section info update request body.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                status: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Innovation section info updated successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' }
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request.'
        },
        401: {
          description: 'Unauthorized.'
        },
        403: {
          description: 'Forbidden.'
        },
        404: {
          description: 'Not found.'
        },
        500: {
          description: 'Internal server error.'
        }
      }
    }
  }
);
