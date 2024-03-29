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
import { ParamsSchema, ParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1InnovationFilesList {
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

      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const { skip, take, order, ...filters } = queryParams;

      const result = await innovationFileService.getFilesList(auth.getContext(), params.innovationId, filters, {
        skip,
        take,
        order
      });

      context.res = ResponseHelper.Ok<ResponseDTO>({
        count: result.count,
        data: result.data.map(item => ({
          id: item.id,
          context: item.context,
          name: item.name,
          description: item.description,
          createdAt: item.createdAt,
          createdBy: {
            name: item.createdBy.name,
            role: item.createdBy.role,
            isOwner: item.createdBy.isOwner,
            orgUnitName: item.createdBy.orgUnitName
          },
          file: {
            id: item.storageId,
            name: item.file.name,
            size: item.file.size,
            extension: item.file.extension,
            url: item.file.url
          }
        }))
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationFilesList.httpTrigger as AzureFunction, '/v1/{innovationId}/files', {
  get: {
    operationId: 'v1-innovation-files-list',
    description: 'Get innovation files list',
    tags: ['[v1] Innovation Files'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema, query: QueryParamsSchema }),
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                count: {
                  type: 'integer',
                  description: 'The total number of records.'
                },
                data: {
                  type: 'array',
                  items: {
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
