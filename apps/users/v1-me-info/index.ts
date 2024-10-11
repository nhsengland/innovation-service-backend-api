import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { AnnouncementTypeEnum, PhoneUserPreferenceEnum, ServiceRoleEnum } from '@users/shared/enums';
import { ResponseHelper } from '@users/shared/helpers';
import type { DomainService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';

import type { AnnouncementsService } from '../_services/announcements.service';
import SYMBOLS from '../_services/symbols';
import type { TermsOfUseService } from '../_services/terms-of-use.service';
import type { UsersService } from '../_services/users.service';

import type { ResponseDTO } from './transformation.dtos';

class V1MeInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType): Promise<void> {
    const domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);
    const termsOfUseService = container.get<TermsOfUseService>(SYMBOLS.TermsOfUseService);
    const announcementsService = container.get<AnnouncementsService>(SYMBOLS.AnnouncementsService);

    try {
      // TODO: The org flag will be removed when we take organisations from the FE

      const forceRefresh = context.req?.query['forceRefresh'];
      const requestUser = await domainService.users.getUserInfo(
        { identityId: context.auth.user.identityId },
        { organisations: true },
        { forceRefresh: forceRefresh === 'true' }
      );
      const userRoles = requestUser.roles.filter(role => role.isActive);

      let termsOfUseAccepted = true;
      let hasInnovationTransfers = false;
      let hasInnovationCollaborations = false;
      let hasLoginAnnouncements = {};
      let userPreferences: {
        contactByPhone: boolean;
        contactByEmail: boolean;
        contactByPhoneTimeframe: null | PhoneUserPreferenceEnum;
        contactDetails: null | string;
      } = {
        contactByEmail: false,
        contactByPhone: false,
        contactByPhoneTimeframe: null,
        contactDetails: null
      };

      // TODO: Improve this endpoint together with FE in order to separate the responsibility
      // of a user request from a user role request.
      if (userRoles.length === 1 && userRoles[0]!.role !== ServiceRoleEnum.ADMIN) {
        const userRole = userRoles[0]!;

        termsOfUseAccepted = (await termsOfUseService.getActiveTermsOfUseInfo({ id: requestUser.id }, userRole.role))
          .isAccepted;

        if (userRole.role === ServiceRoleEnum.INNOVATOR) {
          userPreferences = await domainService.users.getUserPreferences(requestUser.id);
          hasInnovationTransfers = (await usersService.getUserPendingInnovationTransfers(requestUser.email)).length > 0;
          hasInnovationCollaborations = (await usersService.getCollaborationsInvitesList(requestUser.email)).length > 0;
        }
      }

      if (userRoles.length > 0 && userRoles[0]!.role !== ServiceRoleEnum.ADMIN) {
        hasLoginAnnouncements = await announcementsService.hasAnnouncementsToReadByRole(requestUser.id, [
          AnnouncementTypeEnum.LOG_IN
        ]);
      }

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: requestUser.id,
        email: requestUser.email,
        displayName: requestUser.displayName,
        roles: userRoles,
        contactByEmail: userPreferences.contactByEmail,
        contactByPhone: userPreferences.contactByPhone,
        contactByPhoneTimeframe: userPreferences.contactByPhoneTimeframe,
        contactDetails: userPreferences.contactDetails,
        phone: requestUser.phone,
        passwordResetAt: requestUser.passwordResetAt,
        firstTimeSignInAt: requestUser.firstTimeSignInAt,
        termsOfUseAccepted,
        hasInnovationTransfers,
        hasInnovationCollaborations,
        hasLoginAnnouncements,
        organisations: requestUser.organisations! // will exist since we call the userInfo with organisation flag
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
      200: { description: 'Successful operation' },
      404: { description: 'Not found' }
    }
  }
});
