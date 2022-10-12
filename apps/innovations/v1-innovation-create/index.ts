import type { AzureFunction, HttpRequest } from '@azure/functions'
import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import {
  AuthorizationServiceSymbol, AuthorizationServiceType,
} from '@innovations/shared/services';
import {
  JwtDecoder,
} from '@innovations/shared/decorators'

import { container } from '../_config';
import { InnovationsServiceSymbol, InnovationsServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, QueryParamsSchema, QueryParamsType } from './validation.schemas';
import type { CustomContextType } from '@innovations/shared/types';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';


class CreateInnovation {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationService = container.get<InnovationsServiceType>(InnovationsServiceSymbol);

    try {


      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      const query = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query)

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .checkInnovatorType()
        .verify();
      const requestUser = auth.getUserInfo();

      let surveyId;
      if (query.isSurvey) surveyId = requestUser.surveyId;

      const result = await innovationService.createInnovation({ id: requestUser.id }, body, surveyId);
      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }

  }

}

export default openApi(CreateInnovation.httpTrigger as AzureFunction, '/v1', {
  post: {
    description: 'Create an innovation',
    operationId: 'createInnovation',
    parameters: [],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
          },
        },
      }
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Unique identifier for innovation object' },
              },
            },
          },
        },
      },
      400: { description: 'Invalid innovation payload' },
    },
  },
});