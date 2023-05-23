import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import type { OrganisationsService } from '../_services/organisations.service';
import SYMBOLS from '../_services/symbols';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1AdminUnitUserCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const organisationsService = container.get<OrganisationsService>(SYMBOLS.OrganisationsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context).checkAdminType().verify();

      await organisationsService.createUnitUser(auth.getContext(), params.organisationUnitId, params.userId, body);

      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1AdminUnitUserCreate.httpTrigger as AzureFunction,
  '/v1/units/{organisationUnitId}/users/{userId}',
  {
    post: {
      description: 'Create unit user.',
      operationId: 'v1-admin-unit-user-create',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      requestBody: SwaggerHelper.bodyJ2S(BodySchema),
      responses: {
        '204': {
          description: 'The user as been added to the unit.'
        },
        '400': {
          description: 'Bad request.'
        },
        '401': {
          description: 'The user is not authorized to create an organisation unit.'
        },
        '404': {
          description: "The user doesn't exist on the service."
        },
        '409': {
          description: 'The user is from other other organisation or already exists in the unit.'
        },
        '500': {
          description: 'An error occurred while creating the organisation unit.'
        }
      }
    }
  }
);
