import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationSectionsService } from '../_services/innovation-sections.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationSectionsList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationSectionsService = container.get<InnovationSectionsService>(SYMBOLS.InnovationSectionsService);

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
      const domainContext = auth.getContext();

      const result = await innovationSectionsService.getInnovationSectionsList(domainContext, params.innovationId);
      context.res = ResponseHelper.Ok<ResponseDTO>(
        result.map(section => ({
          id: section.id,
          section: section.section,
          status: section.status,
          submittedAt: section.submittedAt,
          submittedBy: section.submittedBy
            ? {
                name: section.submittedBy.name,
                isOwner: section.submittedBy.isOwner
              }
            : null,
          openTasksCount: section.openTasksCount
        }))
      );
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
    parameters: [{ in: 'path', name: 'innovationId', required: true, schema: { type: 'string' } }],
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
                  description: 'Innovation id.'
                },
                name: {
                  type: 'string',
                  description: 'Innovation name.'
                },
                status: {
                  type: 'string',
                  description: 'Innovation status.'
                },
                sections: {
                  type: 'array',
                  description: 'Innovation sections.',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        description: 'Innovation section id.'
                      },
                      section: {
                        type: 'string',
                        description: 'Innovation section name.'
                      },
                      status: {
                        type: 'string',
                        description: 'Innovation section status.'
                      },
                      submittedAt: {
                        type: 'string',
                        description: 'Innovation section submitted date.'
                      }
                    }
                  }
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
      },
      500: {
        description: 'Internal Server Error'
      }
    }
  }
});
