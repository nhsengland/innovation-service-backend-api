import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { CustomContextType } from '@innovations/shared/types';
import { container } from '../_config';
import { InnovationSectionsServiceSymbol, InnovationSectionsServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';


class GetInnovationSectionInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationSectionsService = container.get<InnovationSectionsServiceType>(InnovationSectionsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const authInstance = await authorizationService.validate(context)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkAdminType()
        .checkInnovation()
        .verify();

      const domainContext = authInstance.getContext();

      const result = await innovationSectionsService.getInnovationSectionInfo(domainContext, params.innovationId, params.sectionKey, queryParams);
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        section: result.section,
        status: result.status,
        submittedAt: result.submittedAt,
        data: result.data,
        ...(result.actionsIds ? { actionsIds: result.actionsIds } : {})
      });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(GetInnovationSectionInfo.httpTrigger as AzureFunction, '/v1/{innovationId}/sections/{sectionKey}', {
  get: {
    description: 'Get an innovation section info.',
    tags: ['Innovation'],
    summary: 'Get an innovation section info.',
    operationId: 'v1-innovation-section-info',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      200: {
        description: 'Innovation section info.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Innovation section id.',
                  example: '1'
                },
                section: {
                  type: 'string',
                  description: 'Innovation section key.',
                  example: 'access'
                },
                status: {
                  type: 'string',
                  description: 'Innovation section status.',
                  example: 'COMPLETED'
                },
                submittedAt: {
                  type: 'string',
                  description: 'Innovation section submission date.',
                  example: '2021-01-01T00:00:00.000Z'
                },
                data: {
                  type: 'object',
                  description: 'Innovation section data.',
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Innovation section name.',
                      example: 'Access'
                    },
                    description: {
                      type: 'string',
                      description: 'Innovation section description.',
                      example: 'Access description'
                    },
                    questions: {
                      type: 'array',
                      description: 'Innovation section questions.',
                      items: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                            description: 'Innovation section question id.',
                            example: '1'
                          },
                          text: {
                            type: 'string',
                            description: 'Innovation section question text.',
                            example: 'Question text',
                          },
                        },
                      },
                    },
                  },
                },
                actionsIds: {
                  type: 'array',
                  items: {
                    type: 'string',
                    description: 'The id of the action.'
                  }
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
        description: 'Not found',
      },
      500: {
        description: 'Internal server error',
      },
    },
  },
});
