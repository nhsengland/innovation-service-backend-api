import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { ResponseHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { TermsOfUseServiceSymbol, TermsOfUseServiceType, UsersServiceSymbol, UsersServiceType } from '../_services/interfaces';

import { UserTypeEnum } from '@users/shared/enums';
import type { ResponseDTO } from './transformation.dtos';


class V1MeInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const usersService = container.get<UsersServiceType>(UsersServiceSymbol);
    const termsOfUseService = container.get<TermsOfUseServiceType>(TermsOfUseServiceSymbol);

    try {

      const authInstance = await authorizationService.validate(context).verify();
      const requestUser = authInstance.getUserInfo();

      let termsOfUseAccepted = false;
      let hasInnovationTransfers = false;

      if (requestUser.type === UserTypeEnum.ADMIN) {
        termsOfUseAccepted = true;
        hasInnovationTransfers = false;
      } else {
        // termsOfUseAccepted = (await termsOfUseService.getActiveTermsOfUseInfo({ id: requestUser.id, type: requestUser.type })).isAccepted;
        hasInnovationTransfers = (await usersService.getUserPendingInnovationTransfers(requestUser.email)).length > 0;
      }

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: requestUser.id,
        email: requestUser.email,
        displayName: requestUser.displayName,
        type: requestUser.type,
        roles: requestUser.roles,
        phone: requestUser.phone,
        passwordResetAt: requestUser.passwordResetAt,
        firstTimeSignInAt: requestUser.firstTimeSignInAt,
        termsOfUseAccepted: true,
        hasInnovationTransfers,
        organisations: requestUser.organisations
      });
      return;

    } catch (error) {

      context.res = ResponseHelper.Error(context, error);
      return;

    }

  }

}


// TODO: Improve response
export default openApi(V1MeInfo.httpTrigger as AzureFunction, '/v1/me', {
  get: {
    description: 'Retrieves the user profile information.',
    operationId: 'v1-me-info',
    tags: ['[v1] Users'],
    parameters: [],
    responses: {
      200: { description: 'Successful operation'},
      404: { description: 'Not found' }
    }
  }
});
