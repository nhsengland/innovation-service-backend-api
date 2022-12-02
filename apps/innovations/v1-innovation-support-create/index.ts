import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { AccessorOrganisationRoleEnum } from '@innovations/shared/enums';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationSupportsServiceSymbol, InnovationSupportsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';


class V1InnovationSupportCreate {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationSupportsService = container.get<InnovationSupportsServiceType>(InnovationSupportsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkAccessorType({ organisationRole: [AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR] })
        .checkInnovation()
        .verify();
      const requestUser = auth.getUserInfo();

      const result = await innovationSupportsService.createInnovationSupport(
        { id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type },
        requestUser.organisations[0]?.organisationUnits[0]?.id || '',
        params.innovationId,
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

export default openApi(V1InnovationSupportCreate.httpTrigger as AzureFunction, '/v1/{innovationId}/supports', {
  post: {
    description: 'Create support in innovation.',
    operationId: 'v1-innovation-support-create',
    tags: ['Innovation Support'],
    parameters: [
      {
        in: 'path',
        name: 'innovationId',
        required: true,
        schema: {
          type: 'string',
        },
      },
    ],
    responses: {
      201: {
        description: 'Creates a new innovation support request for the innovation identified by the supplied Innovation ID.',
      },
      401: {
        description: 'Unauthorised.'
      },
    },
  }
});
