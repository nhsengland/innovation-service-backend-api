import type { AzureFunction, HttpRequest } from '@azure/functions'
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


class CreateInnovationAssessment {

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
        .checkInnovation({ status: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT] })
        .verify();
      const requestUser = auth.getUserInfo();

      const result = await innovationAssessmentsService.createInnovationAssessment(
        { id: requestUser.id },
        params.innovationId,
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

export default openApi(CreateInnovationAssessment.httpTrigger as AzureFunction, 'v1/{innovationId}/assessments', {
  post: {
    summary: 'Create an innovation assessment',
    description: 'Create an innovation assessment.',
    operationId: 'createInnovationAssessment',
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
              },
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
                },
              },
              required: ['id']
            }
          }
        }
      },
      400: {
        description: 'The innovation assessment has not been created.',
      },
      401: {
        description: 'The user is not authenticated.',
      },
      403: {
        description: 'The user is not authorized to create an innovation assessment.',
      },
      404: {
        description: 'The innovation does not exist.',
      },
      500: {
        description: 'An error occurred while creating the innovation assessment.',
      }
    }
  }
});
