import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import { InnovationSupportStatusEnum } from '@innovations/shared/enums';
import type { InnovationSupportsService } from '../_services/innovation-supports.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationSupportSummaryUnitInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationSupportsService = container.get<InnovationSupportsService>(SYMBOLS.InnovationSupportsService);

    try {
      await authorizationService
        .validate(context)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkAdminType()
        .verify();

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const result = await innovationSupportsService.getSupportSummaryUnitInfo(params.innovationId, params.unitId);

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationSupportSummaryUnitInfo.httpTrigger as AzureFunction,
  '/v1/{innovationId}/support-summary/units/{unitId}',
  {
    get: {
      operationId: 'v1-innovation-support-summary-unit-info',
      description: 'Get support summary unit info',
      tags: ['[v1] Innovation Support Summary'],
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    createdAt: { type: 'string' },
                    createdBy: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        displayRole: { type: 'string' }
                      }
                    },
                    type: { type: 'string' },
                    params: {
                      type: 'object',
                      properties: {
                        supportStatus: {
                          type: 'string',
                          enum: Object.values(InnovationSupportStatusEnum)
                        },
                        message: { type: 'string' },
                        title: { type: 'string' },
                        suggestedByName: { type: 'string' },
                        file: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
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
  }
);
