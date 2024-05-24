import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { ElasticSearchDocumentUpdate, JwtDecoder } from '@innovations/shared/decorators';
import { ServiceRoleEnum } from '@innovations/shared/enums';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationSupportsService } from '../_services/innovation-supports.service';
import SYMBOLS from '../_services/symbols';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

// TO DO: RENAME ENDPOINT
// IMPROVE VALIDATOR
// OPTIMIZE CREATE INNOVATION ORGANISATIONS SUGGESTIONS
class V1InnovationsSupportLogCreate {
  @JwtDecoder()
  @ElasticSearchDocumentUpdate()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationSupportsService = container.get<InnovationSupportsService>(SYMBOLS.InnovationSupportsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAccessorType({ organisationRole: [ServiceRoleEnum.QUALIFYING_ACCESSOR] })
        .checkInnovation()
        .checkNotArchived()
        .verify();
      const domainContext = auth.getContext();

      await innovationSupportsService.createInnovationOrganisationsSuggestions(
        domainContext,
        params.innovationId,
        body
      );

      context.res = ResponseHelper.Created();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationsSupportLogCreate.httpTrigger as AzureFunction, '/v1/{innovationId}/support-logs', {
  post: {
    description: 'Create support logs for an Innovation',
    operationId: 'v1-innovation-support-logs-create',
    tags: ['Create Innovation Support Logs'],
    parameters: [
      {
        in: 'path',
        name: 'innovationId',
        required: true,
        schema: {
          type: 'string'
        }
      }
    ],
    responses: {
      201: {
        description:
          'Creates a new innovation support logs for the innovation identified by the supplied Innovation ID.'
      },
      401: {
        description: 'Unauthorised'
      },
      404: {
        description: 'Not Found'
      }
    }
  }
});
