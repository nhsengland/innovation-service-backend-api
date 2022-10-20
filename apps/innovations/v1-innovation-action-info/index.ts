import type { AzureFunction, HttpRequest } from '@azure/functions'
import { mapOpenApi3_1 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { type AuthorizationServiceType, AuthorizationServiceSymbol } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';
import { container } from '../_config';
import { InnovationActionServiceSymbol, InnovationActionServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1GetInnovationActionInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationActionService = container.get<InnovationActionServiceType>(InnovationActionServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkAccessorType()
        .checkInnovatorType()
        .checkInnovation()
        .verify();

      const result = await innovationActionService.getInnovationActionInfo(params.actionId);
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        displayId: result.displayId,
        status: result.status,
        description: result.description,
        section: result.section,
        createdAt: result.createdAt,
        createdBy: result.createdBy
      });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }
  }
}

export default openApi(V1GetInnovationActionInfo.httpTrigger as AzureFunction, '/v1/{innovationId}/actions/{actionId}', {
  get: {
    description: 'Get an innovation action.',
    operationId: 'v1-innovation-action-info',
    parameters: [
      {
        name: 'innovationId',
        in: 'path',
        required: true,
        description: 'The innovation id.',
        schema: {
          type: 'string',
          format: 'uuid'
        }
      },
      {
        name: 'actionId',
        in: 'path',
        required: true,
        description: 'The innovation action id.',
        schema: {
          type: 'string',
          format: 'uuid'
        }
      }
    ],
    responses: {
      200: {
        description: 'The innovation action.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid'
                },
                displayId: {
                  type: 'string'
                },
                status: {
                  type: 'string',
                  enum: [
                    'DRAFT',
                    'SUBMITTED',
                    'APPROVED',
                    'REJECTED'
                  ]
                },
                description: {
                  type: 'string'
                },
                section: {
                  type: 'string',
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time'
                },
                createdBy: {
                  type: 'string'
                }
              }
            }
          }
        }
      },
      401: {
        description: 'Unauthorized'
      },
      403: {
        description: 'Forbidden'
      },
      404: {
        description: 'Not Found'
      }
    }
  }
});
