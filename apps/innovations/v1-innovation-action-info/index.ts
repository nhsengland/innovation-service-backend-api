import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, type AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationActionsServiceSymbol, InnovationActionsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';


class V1InnovationActionInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationActionsService = container.get<InnovationActionsServiceType>(InnovationActionsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .setContext(context.auth.organisationUnitId)
        .checkAccessorType()
        .checkInnovatorType()
        .checkInnovation()
        .checkAdminType()
        .verify();
        
      const result = await innovationActionsService.getActionInfo(params.actionId);
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
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationActionInfo.httpTrigger as AzureFunction, '/v1/{innovationId}/actions/{actionId}', {
  get: {
    description: 'Get an innovation action.',
    operationId: 'v1-innovation-action-info',
    tags: ['[v1] Innovation Actions'],
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
