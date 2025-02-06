import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import type { AuthorizationService } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import type { OrganisationsService } from '../_services/organisations.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1AdminOrganisationUpdate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const organisationsService = container.get<OrganisationsService>(SYMBOLS.OrganisationsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      await authorizationService.validate(context).checkAdminType().verify();

      const result = await organisationsService.updateOrganisation(
        params.organisationId,
        body.name,
        body.acronym,
        body.summary
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({ organisationId: result.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1AdminOrganisationUpdate.httpTrigger as AzureFunction, '/v1/organisations/{organisationId}', {
  patch: {
    description: 'Update an organisation.',
    operationId: 'v1-admin-organisation-update',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    requestBody: SwaggerHelper.bodyJ2S(BodySchema, { description: 'New name and acronym for the organisation.' }),
    responses: {
      '200': SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'The organisation unit has been updated.'
      }),
      '400': {
        description: 'Bad request.'
      },
      '401': {
        description: 'The user is not authorized to update an organisation unit.'
      },
      '404': {
        description: 'The organisation unit does not exist.'
      },
      '500': {
        description: 'An error occurred while updating the organisation unit.'
      }
    }
  }
});
