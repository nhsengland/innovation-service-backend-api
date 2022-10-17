import type { AzureFunction, HttpRequest } from '@azure/functions';
import { mapOpenApi3_1 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import {
  AuthorizationServiceSymbol, AuthorizationServiceType
} from '@innovations/shared/services';

import type {
  CustomContextType
} from '@innovations/shared/types'

import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { InnovationStatusEnum } from '@innovations/shared/enums';
import { JwtDecoder } from '@innovations/shared/decorators'

import { container } from '../_config';
import { InnovationAssessmentsServiceSymbol, InnovationAssessmentsServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsType, ParamsSchema } from './validation.schema';


class UpdateInnovationAssessment {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationAssessmentsService = container.get<InnovationAssessmentsServiceType>(InnovationAssessmentsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkInnovation({ status: [InnovationStatusEnum.NEEDS_ASSESSMENT] })
        .verify();
      const requestUser = auth.getUserInfo();

      const result = await innovationAssessmentsService.updateInnovationAssessment(
        { id: requestUser.id },
        params.innovationId,
        params.assessmentId,
        body
      );
      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }
  }
}

export default openApi(UpdateInnovationAssessment.httpTrigger as AzureFunction, 'v1/{innovationId}/assessments/{assessmentId}', {
  put: {
    summary: 'Update an innovation assessment',
    description: 'Update an innovation assessment.',
    parameters: [
      {
        name: 'innovationId',
        in: 'path',
        description: 'Innovation ID',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid'
        }
      },
      {
        name: 'assessmentId',
        in: 'path',
        description: 'Assessment ID',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid'
        }
      }
    ],
    requestBody: {
      description: 'Innovation assessment update request body.',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['APPROVED', 'REJECTED']
              },
              comment: {
                type: 'string',
                maxLength: 1000
              }
            },
            required: ['status']
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Returns the updated innovation assessment.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid'
                },
                innovationId: {
                  type: 'string',
                  format: 'uuid'
                },
                assessmentId: {
                  type: 'string',
                  format: 'uuid'
                },
                status: {
                  type: 'string',
                  enum: ['APPROVED', 'REJECTED']
                },
                comment: {
                  type: 'string',
                  maxLength: 1000
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time'
                },
                updatedAt: {
                  type: 'string',
                  format: 'date-time'
                }
              }
            }
          }
        }
      },
      400: {
        description: 'Bad request. Validation error.',
      },
      401: {
        description: 'Unauthorized. Invalid authentication credentials.',
      },
      403: {
        description: 'Forbidden. User does not have permission to update the innovation assessment.',
      },
      404: {
        description: 'Not found. Innovation or assessment not found.',
      },
      500: {
        description: 'Internal server error.',
      }
    }
  }
});