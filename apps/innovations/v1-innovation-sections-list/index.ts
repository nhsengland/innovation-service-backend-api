import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationSectionsServiceSymbol, InnovationSectionsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';


class V1InnovationSectionsList {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationSectionsService = container.get<InnovationSectionsServiceType>(InnovationSectionsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkAdminType()
        .checkInnovation()
        .verify();
      const requestUser = auth.getUserInfo()

      const result = await innovationSectionsService.getInnovationSectionsList({ type: requestUser.type }, params.innovationId);
      context.res = ResponseHelper.Ok<ResponseDTO>(result.map(section => ({
        id: section.id,
        section: section.section,
        status: section.status,
        submittedAt: section.submittedAt,
        openActionsCount: section.openActionsCount
      })));
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(V1InnovationSectionsList.httpTrigger as AzureFunction, '/v1/{innovationId}/sections', {
  get: {
    description: 'Get an innovation sections list.',
    tags: ['Innovation'],
    summary: 'Get an innovation sections list.',
    operationId: 'v1-innovation-sections-list',
    parameters: [
      { in: 'path', name: 'innovationId', required: true, schema: { type: 'string' } },
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Innovation id.',
                },
                name: {
                  type: 'string',
                  description: 'Innovation name.',
                },
                status: {
                  type: 'string',
                  description: 'Innovation status.',
                },
                sections: {
                  type: 'array',
                  description: 'Innovation sections.',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        description: 'Innovation section id.',
                      },
                      section: {
                        type: 'string',
                        description: 'Innovation section name.',
                      },
                      status: {
                        type: 'string',
                        description: 'Innovation section status.',
                      },
                      submittedAt: {
                        type: 'string',
                        description: 'Innovation section submitted date.',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      401: {
        description: 'Unauthorized',
      },
      403: {
        description: 'Forbidden',
      },
      404: {
        description: 'Not Found',
      },
      500: {
        description: 'Internal Server Error',
      },
    },
  },
});
