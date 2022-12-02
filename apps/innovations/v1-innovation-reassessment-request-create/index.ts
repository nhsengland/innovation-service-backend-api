import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { InnovationStatusEnum } from '@innovations/shared/enums';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationAssessmentsServiceSymbol, InnovationAssessmentsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schema';


class V1InnovationReassessmentRequestCreate {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationAssessmentsService = container.get<InnovationAssessmentsServiceType>(InnovationAssessmentsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkInnovation({ status: [InnovationStatusEnum.IN_PROGRESS] })
        .verify();
      const requestUser = auth.getUserInfo();

      const result = await innovationAssessmentsService.createInnovationReassessment(
        { id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type },
        params.innovationId,
        body
      );
      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.assessment.id });
      return;

    } catch (error) {
      context.log.error(error);
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationReassessmentRequestCreate.httpTrigger as AzureFunction, '/v1/{innovationId}/reassessments', {
  post: {
    operationId: 'v1-innovation-reassessment-request-create',
    description: 'Create a reassessment request for an innovation.',
    summary: 'Create a reassessment request for an innovation.',
    tags: ['[v1] Innovation Assessments'],
    parameters: [
      {
        name: 'innovationId',
        in: 'path',
        description: 'Innovation ID',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid',
        },
      },
    ],
    requestBody: {
      description: 'Create a reassessment request for an innovation.',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              updatedInnovationRecord: {
                type: 'string',
                description: 'Updated innovation record since submitting the last assessment.',
                example: 'YES',
              },
              description: {
                type: 'string',
                description: 'Changes made to the innovation since submitting the last assessment and what support you need next',
              },
            },
            required: ['updatedInnovationRecord', 'changes'],
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Returns the reassessment request and the cloned assessment id',
      },
      400: {
        description: 'Bad request',
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
      422: {
        description: 'Unprocessable entity',
      },
      500: {
        description: 'Internal server error',
      },
    },
  },
});


