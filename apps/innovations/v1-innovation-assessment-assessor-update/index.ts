import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';

import { JwtDecoder } from '@innovations/shared/decorators';
import { InnovationStatusEnum } from '@innovations/shared/enums';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationAssessmentsService } from '../_services/innovation-assessments.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationAssessmentAssessorUpdate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
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
        .checkInnovation({ status: [InnovationStatusEnum.NEEDS_ASSESSMENT] })
        .verify();

      const innovation = auth.getInnovationInfo();
      const domainContext = auth.getContext();

      const result = await innovationAssessmentsService.updateAssessor(
        domainContext,
        innovation.id,
        params.assessmentId,
        body.assessorId
      );
      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationAssessmentAssessorUpdate.httpTrigger as AzureFunction,
  '/v1/{innovationId}/assessments/{assessmentId}',
  {
    patch: {
      summary: 'Update the assigned assessor of an innovation.',
      description: 'Update the assigned assessor of an innovation.',
      operationId: 'v1-innovation-assessment-assessor-update',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      requestBody: SwaggerHelper.bodyJ2S(BodySchema, {
        description: 'The new assessor to be assigned.'
      }),
      responses: {
        200: {
          description: 'The assigned assessor has been successfully updated.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  assessmentId: {
                    type: 'string',
                    format: 'uuid'
                  },
                  assessorId: {
                    type: 'string',
                    format: 'uuid'
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request. Validation error.'
        },
        401: {
          description: 'Unauthorized. Invalid authentication credentials.'
        },
        403: {
          description: 'Forbidden. User does not have permission to assign a new assessor.'
        },
        404: {
          description: 'Not found. Innovation or assessment not found.'
        },
        500: {
          description: 'Internal server error.'
        }
      }
    }
  }
);
