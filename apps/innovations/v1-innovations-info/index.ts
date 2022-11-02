import type { AzureFunction, HttpRequest } from '@azure/functions'
import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationsServiceSymbol, InnovationsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { PathParamsSchema, PathParamsType } from './validation.schemas';


class V1InnovationsInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationsService = container.get<InnovationsServiceType>(InnovationsServiceSymbol);

    try {

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .verify();

      const requestUser = auth.getUserInfo();

      const params = JoiHelper.Validate<PathParamsType>(
        PathParamsSchema,
        request.params,
        { userType: requestUser.type, userOrganisationRole: requestUser.organisations[0]?.role }
      );

      const result = await innovationsService.getInnovationLastEngagingTransition(
        params.innovationId,
      );

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }

  }

}


export default openApi(V1InnovationsInfo.httpTrigger as AzureFunction, '/v1/{innovationId}', {
  get: {
    operationId: 'v1-innovations-info',
    description: 'Get innovation information.',
    parameters: [
      {
        name: 'innovationId',
        in: 'path',
        required: true,
        description: 'Innovation ID',
        schema: {
          type: 'string',
          format: 'uuid'
        }
      },
    ],
    responses: {
      200: { description: 'Success' },
      400: { description: 'Invalid innovation payload' },
    },
  },
});
