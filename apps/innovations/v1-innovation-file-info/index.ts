import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import { InnovationFileContextTypeEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import type { InnovationFileService } from '../_services/innovation-file.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationFileInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationFileService = container.get<InnovationFileService>(SYMBOLS.InnovationFileService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkAdminType()
        .checkInnovation()
        .verify();

      const result = await innovationFileService.getFileInfo(auth.getContext(), params.innovationId, params.fileId);

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        context: { id: result.context.id, type: result.context.type, name: result.context.name },
        name: result.name,
        description: result.description,
        createdAt: result.createdAt,
        createdBy: {
          name: result.createdBy.name,
          role: result.createdBy.role,
          isOwner: result.createdBy.isOwner,
          orgUnitName: result.createdBy.orgUnitName
        },
        file: {
          id: result.storageId,
          name: result.file.name,
          size: result.file.size,
          extension: result.file.extension,
          url: result.file.url
        },
        canDelete: result.canDelete
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationFileInfo.httpTrigger as AzureFunction, '/v1/{innovationId}/files/{fileId}', {
  get: {
    operationId: 'v1-innovation-file-info',
    description: 'Get innovation file info',
    tags: ['[v1] Innovation Files'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                context: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    type: {
                      type: 'string',
                      enum: Object.values(InnovationFileContextTypeEnum)
                    }
                  }
                },
                name: { type: 'string' },
                description: { type: 'string' },
                createdAt: { type: 'string' },
                createdBy: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    role: {
                      type: 'string',
                      enum: Object.values(ServiceRoleEnum)
                    },
                    isOwner: { type: 'boolean' },
                    orgUnitName: { type: 'string' }
                  }
                },
                file: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Storage Id' },
                    name: { type: 'string' },
                    size: { type: 'number' },
                    extension: { type: 'string' },
                    url: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      },
      400: {
        description: 'The request is invalid.'
      },
      401: {
        description: 'The user is not authenticated.'
      },
      403: {
        description: 'The user is not authorized to access this resource.'
      },
      500: {
        description: 'An error occurred while processing the request.'
      }
    }
  }
});
