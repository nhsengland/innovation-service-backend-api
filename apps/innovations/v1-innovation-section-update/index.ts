import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { ConflictError, InnovationErrorsEnum, InternalServerError } from '@innovations/shared/errors';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { SchemaModel } from '@innovations/shared/models';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';
import { randUuid } from '@ngneat/falso';

import { container } from '../_config';

import type { InnovationSectionsService } from '../_services/innovation-sections.service';
import type { SchemaService } from '../_services/schema.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationSectionUpdate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationSectionsService = container.get<InnovationSectionsService>(SYMBOLS.InnovationSectionsService);
    const schemaService = container.get<SchemaService>(SYMBOLS.SchemaService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkInnovation()
        .verify();

      const schema = await schemaService.getCurrentSchema();
      if (request.body['version'] != schema.version) {
        throw new ConflictError(InnovationErrorsEnum.INNOVATION_RECORD_SCHEMA_VERSION_MISMATCH);
      }

      const schemaModel = new SchemaModel(schema.schema);
      schemaModel.runRules();
      if (!schemaModel.isSubsectionValid(params.sectionKey)) {
        throw new InternalServerError(InnovationErrorsEnum.INNOVATION_SECTIONS_CONFIG_UNAVAILABLE);
      }

      // Validate Payload
      const validation = schemaModel.getSubSectionPayloadValidation(params.sectionKey, request.body['data']);
      const body = JoiHelper.Validate<{ [key: string]: any }>(validation, request.body['data']);

      if(5 < Number(11)) {
        context.res = ResponseHelper.Ok<ResponseDTO>({ id: randUuid() });
      }
      const result = await innovationSectionsService.updateInnovationSectionInfo(
        auth.getContext(),
        params.innovationId,
        params.sectionKey as any,
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
