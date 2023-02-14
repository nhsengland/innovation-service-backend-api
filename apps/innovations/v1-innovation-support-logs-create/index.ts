import type { AzureFunction, HttpRequest } from '@azure/functions'
import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationSupportsServiceSymbol, InnovationSupportsServiceType } from '../_services/interfaces';

import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';
import { AccessorOrganisationRoleEnum } from '@innovations/shared/enums';


class V1InnovationsSupportLogCreate {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    
    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationSupportsService = container.get<InnovationSupportsServiceType>(InnovationSupportsServiceSymbol);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      
      const auth = await authorizationService.validate(context)
        .setInnovation(params.innovationId)
        .checkAccessorType({ organisationRole: [AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR] })
        .checkInnovation()
        .verify();
      const requestUser = auth.getUserInfo();
      const domainContext = auth.getContext();

      const result = await innovationSupportsService.createInnovationSupportLogs(
        { id: requestUser.id, identityId: requestUser.identityId },
        domainContext,
        params.innovationId,
        body
      );

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
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
          type: 'string',
        }
      }
    ],
    responses: {
      201: {
        description: 'Creates a new innovation support logs for the innovation identified by the supplied Innovation ID.',
      },
      401: {
        description: 'Unauthorised'
      },
      404: {
        description: 'Not Found',
      },
    }
  }
});
