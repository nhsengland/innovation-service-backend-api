import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import {
  InnovationSectionsServiceSymbol,
  InnovationSectionsServiceType,
} from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationSectionSubmit {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(
      AuthorizationServiceSymbol
    );
    const innovationSectionsService = container.get<InnovationSectionsServiceType>(
      InnovationSectionsServiceSymbol
    );

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const authInstance = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkInnovation()
        .verify();
      const domainContext = authInstance.getContext();

      const result = await innovationSectionsService.submitInnovationSection(
        domainContext,
        params.innovationId,
        params.sectionKey
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
  V1InnovationSectionSubmit.httpTrigger as AzureFunction,
  '/v1/{innovationId}/sections/{sectionKey}/submit',
  {
    patch: {
      description: 'Submit an innovation section.',
      tags: ['Innovation'],
      summary: 'Submit an innovation section.',
      operationId: 'v1-innovation-section-submit',
      parameters: [
        { in: 'path', name: 'innovationId', required: true, schema: { type: 'string' } },
        { in: 'path', name: 'sectionKey', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        description: 'Innovation section submit request body.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Innovation section id.',
                  example: '1',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Innovation section submit response.',
        },
      },
    },
  }
);
