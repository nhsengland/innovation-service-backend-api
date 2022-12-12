import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import {
  AuthorizationServiceSymbol,
  AuthorizationServiceType
} from '@innovations/shared/services';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
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
  static async httpTrigger(
    context: CustomContextType,
    request: HttpRequest
  ): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(
      AuthorizationServiceSymbol
    );
    const innovationSectionsService =
      container.get<InnovationSectionsServiceType>(
        InnovationSectionsServiceSymbol
      );

    try {
      const params = JoiHelper.Validate<ParamsType>(
        ParamsSchema,
        request.params
      );
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService
        .validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkInnovation()
        .verify();

      const requestUser = auth.getUserInfo();
      const innovation = auth.getInnovationInfo();

      const result = await innovationSectionsService.createInnovationEvidence(
        { id: requestUser.id },
        innovation.id,
        body
      );
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
      });
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
      description: 'Create an innovation evidence entry.',
      tags: ['Innovation'],
      summary: 'Create an innovation evidence entry.',
      operationId: 'v1-innovation-evidence-create',
      parameters: [
        {
          name: 'innovationId',
          in: 'path',
          description: 'The innovation id.',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      requestBody: {
        description: 'The innovation evidence to create.',
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                evidenceType: {
                  type: 'string',
                  description: 'Type of the evidence.',
                  example: 'CLINICAL',
                },
                clinicalEvidenceType: {
                  type: 'string',
                  description: 'Type of clinical evidence.',
                  example: 'DATA_PUBLISHED',
                },
                description: {
                  type: 'string',
                  description: 'Description of the evidence.',
                  example: 'Example evidence.'
                },
                files: {
                  type: 'string',
                  description: 'Ids of the uploaded files.'
                }
              },
            },
          },
        },
      },
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
