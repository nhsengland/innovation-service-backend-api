import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import {
  AuthorizationServiceSymbol,
  AuthorizationServiceType
} from '@innovations/shared/services';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { CustomContextType } from '@innovations/shared/types';
import { container } from '../_config';
import {
  InnovationSectionsServiceSymbol,
  InnovationSectionsServiceType
} from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import {
  BodySchema,
  BodyType,
  ParamsSchema,
  ParamsType
} from './validation.schemas';

class CreateInnovationEvidence {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationSectionsService = container.get<InnovationSectionsServiceType>(InnovationSectionsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkInnovation()
        .verify();

      const requestUser = auth.getUserInfo();

      const result = await innovationSectionsService.updateInnovationEvidence(
        { id: requestUser.id },
        params.evidenceId,
        body
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  CreateInnovationEvidence.httpTrigger as AzureFunction,
  '/v1/{innovationId}/evidence',
  {
    post: {
      description: 'Update an innovation evidence entry.',
      tags: ['Innovation'],
      summary: 'Update an innovation evidence entry.',
      operationId: 'v1-innovation-evidence-create',
      parameters: SwaggerHelper.paramJ2S({path: ParamsSchema}),
      requestBody: SwaggerHelper.bodyJ2S(BodySchema, {description: 'The evidence data to update.'}),
      responses: {
        200: {
          description: 'Innovation evidence info.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'Innovation evidence id.',
                  },
                },
              },
            },
          },
        },
        400: {
          description: 'Bad Request',
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
  }
);
