import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';

import {
  AuthorizationServiceSymbol, AuthorizationServiceType
} from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationSectionsServiceSymbol, InnovationSectionsServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';


class GetInnovationAllSectionsList {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationSectionsService = container.get<InnovationSectionsServiceType>(InnovationSectionsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const query = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      await authorizationService.validate(context)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkInnovation()
        .verify();

      const result = await innovationSectionsService.findAllSections(params.innovationId, query.version);
      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(GetInnovationAllSectionsList.httpTrigger as AzureFunction, '/v1/{innovationId}/all-sections', {
  get: {
    description: 'Get an innovation sections list details.',
    tags: ['Innovation'],
    summary: 'Get an innovation sections list details.',
    operationId: 'v1-innovation-all-sections-list',
    parameters: [
      { in: 'path', name: 'innovationId', required: true, schema: { type: 'string' } }
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
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
        description: 'Not Found',
      },
      500: {
        description: 'Internal Server Error',
      },
    },
  },
});
