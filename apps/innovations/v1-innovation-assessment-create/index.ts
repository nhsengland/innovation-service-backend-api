import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, JwtDecoder } from '@innovations/shared/decorators';
import { InnovationStatusEnum } from '@innovations/shared/enums';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationAssessmentsService } from '../_services/innovation-assessments.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schema';

class CreateInnovationAssessment {
  @JwtDecoder()
  @Audit({
    action: ActionEnum.CREATE,
    target: TargetEnum.ASSESSMENT,
    identifierResponseField: 'id'
  })
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationAssessmentsService = container.get<InnovationAssessmentsService>(
      SYMBOLS.InnovationAssessmentsService
    );

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkInnovation({ status: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT] })
        .verify();
      const domainContext = auth.getContext();
      const result = await innovationAssessmentsService.createInnovationAssessment(
        domainContext,
        params.innovationId,
        body
      );
      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(CreateInnovationAssessment.httpTrigger as AzureFunction, '/v1/{innovationId}/assessments', {
  post: {
    summary: 'Create an innovation assessment',
    description: 'Create an innovation assessment.',
    operationId: 'v1-innovation-assessment-create',
    tags: ['Innovation Assessment'],
    parameters: [
      {
        name: 'innovationId',
        in: 'path',
        description: 'The innovation id.',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid'
        }
      }
    ],
    requestBody: {
      description: 'The innovation assessment data.',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              comment: {
                type: 'string',
                description: 'The comment for the assessment.'
              }
            },
            required: ['comment']
          }
        }
      }
    },
    responses: {
      200: {
        description: 'The innovation assessment has been created.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                  description: 'The innovation assessment id.'
                }
              },
              required: ['id']
            }
          }
        }
      },
      400: {
        description: 'The innovation assessment has not been created.'
      },
      401: {
        description: 'The user is not authenticated.'
      },
      403: {
        description: 'The user is not authorized to create an innovation assessment.'
      },
      404: {
        description: 'The innovation does not exist.'
      },
      500: {
        description: 'An error occurred while creating the innovation assessment.'
      }
    }
  }
});
