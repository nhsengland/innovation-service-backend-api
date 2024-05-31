import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { ElasticSearchDocumentUpdate, JwtDecoder } from '@innovations/shared/decorators';
import { InnovationSupportStatusEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationSupportsService } from '../_services/innovation-supports.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, ParamsSchema, type BodyType, type ParamsType } from './validation.schemas';

class V1InnovationSupportUpdate {
  @JwtDecoder()
  @ElasticSearchDocumentUpdate()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationSupportsService = container.get<InnovationSupportsService>(SYMBOLS.InnovationSupportsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAccessorType({ organisationRole: [ServiceRoleEnum.QUALIFYING_ACCESSOR] })
        .checkInnovation()
        .checkNotArchived()
        .verify();
      const domainContext = auth.getContext();

      const result = await innovationSupportsService.updateInnovationSupport(
        domainContext,
        params.innovationId,
        params.supportId,
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

export default openApi(
  V1InnovationSupportUpdate.httpTrigger as AzureFunction,
  '/v1/{innovationId}/supports/{supportId}',
  {
    put: {
      description: 'Update support on innovation.',
      operationId: 'v1-innovation-support-update',
      tags: ['[v1] Innovation Support'],
      parameters: [
        {
          in: 'path',
          name: 'innovationId',
          description: 'Unique innovation ID',
          required: true,
          schema: {
            type: 'string'
          }
        },
        {
          in: 'path',
          name: 'supportId',
          required: true,
          schema: {
            type: 'string'
          }
        }
      ],
      requestBody: {
        description: '',
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: Object.values(InnovationSupportStatusEnum)
                },
                message: {
                  type: 'string',
                  maxLength: 400
                },
                accessors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      accessorId: {
                        type: 'string',
                        format: 'uuid'
                      },
                      organisationalUnitId: {
                        type: 'string',
                        format: 'uuid'
                      }
                    }
                  }
                }
              },
              required: ['status', 'message'],
              additionalProperties: false
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Innovation ID',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid'
                  }
                },
                required: ['id']
              }
            }
          }
        }
      }
    }
  }
);
