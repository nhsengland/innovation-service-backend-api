import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { CustomContextType } from '@innovations/shared/types';
import { container } from '../_config';
import { InnovationSectionsServiceSymbol, InnovationSectionsServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';


class GetInnovationSectionInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationSectionsService = container.get<InnovationSectionsServiceType>(InnovationSectionsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const authInstance = await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkInnovation()
        .verify();
      const requestUser = authInstance.getUserInfo();

      const result = await innovationSectionsService.getInnovationSectionInfo({ type: requestUser.type }, params.innovationId, params.sectionKey);
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        section: result.section,
        status: result.status,
        submittedAt: result.submittedAt,
        data: result.data
      });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(GetInnovationSectionInfo.httpTrigger as AzureFunction, 'v1/{innovationId}/sections/{sectionKey}/info', {
  get: {
    description: 'Get an innovation section info.',
    tags: ['Innovation'],
    summary: 'Get an innovation section info.',
    operationId: 'getInnovationSectionInfo',
    parameters: [],
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