import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { ResponseHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType, DomainServiceSymbol, DomainServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { TermsOfUseServiceSymbol, TermsOfUseServiceType, UsersServiceSymbol, UsersServiceType } from '../_services/interfaces';

import { PhoneUserPreferenceEnum, ServiceRoleEnum } from '@users/shared/enums';
import type { ResponseDTO } from './transformation.dtos';



class V1MeInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const usersService = container.get<UsersServiceType>(UsersServiceSymbol);
    const termsOfUseService = container.get<TermsOfUseServiceType>(TermsOfUseServiceSymbol);
    const domainService = container.get<DomainServiceType>(DomainServiceSymbol);

    try {

      const authInstance = await authorizationService.validate(context).verify();
      const requestUser = authInstance.getUserInfo();
      // [TechDebt] - TODO the domain context isn't always available and currently it's picking one at random (first)
      // This needs to be fixed so that the termsOfUse and Innovation Transfers are moved out of this endpoint and
      // asked for when needed (probably everytime user switches role). As long as there's no overlaps between admin and/or
      // innovators and/or accessors/qa/na then this is working.
      const domainContext = authInstance.getContext();

      let termsOfUseAccepted = false;
      let hasInnovationTransfers = false;
      let userPreferences: {
        contactByPhone: boolean,
        contactByEmail:  boolean,
        contactByPhoneTimeframe: null | PhoneUserPreferenceEnum,
        contactDetails: null | string,
      } = {
        contactByEmail: false,
        contactByPhone: false,
        contactByPhoneTimeframe: null,
        contactDetails: null,
      };

      if (domainContext.currentRole.role === ServiceRoleEnum.ADMIN) {
        termsOfUseAccepted = true;
        hasInnovationTransfers = false;
      } else {
        termsOfUseAccepted = (await termsOfUseService.getActiveTermsOfUseInfo({ id: requestUser.id }, domainContext.currentRole.role )).isAccepted;
        hasInnovationTransfers = (await usersService.getUserPendingInnovationTransfers(requestUser.email)).length > 0;
      }

      if (domainContext.currentRole.role === ServiceRoleEnum.INNOVATOR) {
        userPreferences = (await domainService.users.getUserPreferences(requestUser.id));
      }

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: requestUser.id,
        email: requestUser.email,
        displayName: requestUser.displayName,
        roles: requestUser.roles,
        contactByEmail: userPreferences.contactByEmail,
        contactByPhone: userPreferences.contactByPhone,
        contactByPhoneTimeframe: userPreferences.contactByPhoneTimeframe,
        contactDetails: userPreferences.contactDetails,
        phone: requestUser.phone,
        passwordResetAt: requestUser.passwordResetAt,
        firstTimeSignInAt: requestUser.firstTimeSignInAt,
        termsOfUseAccepted,
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
