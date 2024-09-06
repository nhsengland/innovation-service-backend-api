import azureFunction from '.';

import { randBoolean, randCompanyName, randEmail, randFullName, randPastDate, randText, randUuid } from '@ngneat/falso';
import { InnovatorOrganisationRoleEnum, ServiceRoleEnum } from '@users/shared/enums';
import { InternalServerError, UserErrorsEnum } from '@users/shared/errors';
import { DomainUsersService } from '@users/shared/services';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import type { ErrorResponseType } from '@users/shared/types';
import { omit } from 'lodash';
import { AnnouncementsService } from '../_services/announcements.service';
import { TermsOfUseService } from '../_services/terms-of-use.service';
import { UsersService } from '../_services/users.service';
import type { ResponseDTO } from './transformation.dtos';

jest.mock('@users/shared/decorators', () => ({
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  }),
  Audit: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  })
}));

const testsHelper = new TestsHelper();
const scenario = testsHelper.getCompleteScenario();

beforeAll(async () => {
  await testsHelper.init();
});

const userInfo = {
  id: randUuid(),
  identityId: randUuid(),
  email: randEmail(),
  displayName: randFullName(),
  roles: [{ id: randUuid(), role: ServiceRoleEnum.INNOVATOR, isActive: true }],
  phone: null,
  isActive: true,
  lockedAt: null,
  passwordResetAt: randPastDate(),
  firstTimeSignInAt: randPastDate(),
  organisations: [
    {
      id: randUuid(),
      name: randCompanyName(),
      acronym: null,
      role: InnovatorOrganisationRoleEnum.INNOVATOR_OWNER,
      isShadow: true,
      size: null,
      description: null,
      registrationNumber: null,
      organisationUnits: []
    }
  ]
};
const mock = jest.spyOn(DomainUsersService.prototype, 'getUserInfo').mockResolvedValue(userInfo);

const terms = {
  id: randUuid(),
  name: randText(),
  summary: randText(),
  releasedAt: randPastDate(),
  isAccepted: randBoolean()
};
const termsOfUseAcceptedMock = jest
  .spyOn(TermsOfUseService.prototype, 'getActiveTermsOfUseInfo')
  .mockResolvedValue(terms);

const pendingTransfersMock = jest
  .spyOn(UsersService.prototype, 'getUserPendingInnovationTransfers')
  .mockResolvedValue([1] as any);
const pendingCollaborationsMock = jest
  .spyOn(UsersService.prototype, 'getCollaborationsInvitesList')
  .mockResolvedValue([1] as any);
const announcementsMock = jest
  .spyOn(AnnouncementsService.prototype, 'hasAnnouncementsToReadByRole')
  .mockResolvedValue({});
const preferences = {
  contactByEmail: true,
  contactByPhone: true,
  contactByPhoneTimeframe: null,
  contactDetails: null
};
const preferencesMock = jest.spyOn(DomainUsersService.prototype, 'getUserPreferences').mockResolvedValue(preferences);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-me-info Suite', () => {
  describe('200', () => {
    it('should return the user info', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .call<ResponseDTO>(azureFunction);

      expect(result.status).toBe(200);
      expect(result.body).toStrictEqual({
        ...omit(userInfo, ['identityId', 'lockedAt', 'isActive']),
        ...preferences,
        hasLoginAnnouncements: {},
        hasInnovationCollaborations: true,
        hasInnovationTransfers: true,
        termsOfUseAccepted: terms.isAccepted
      });
      expect(mock).toHaveBeenCalledTimes(1);
      expect(termsOfUseAcceptedMock).toHaveBeenCalledTimes(1);
      expect(pendingTransfersMock).toHaveBeenCalledTimes(1);
      expect(pendingCollaborationsMock).toHaveBeenCalledTimes(1);
      expect(announcementsMock).toHaveBeenCalledTimes(1);
      expect(preferencesMock).toHaveBeenCalledTimes(1);
    });

    it('should return preferences, collaborations and transfers for innovator', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .call<ResponseDTO>(azureFunction);
      expect(preferencesMock).toHaveBeenCalledTimes(1);
      expect(result.body).toMatchObject({
        ...preferences,
        hasInnovationCollaborations: true,
        hasInnovationTransfers: true
      });
    });

    it.each([
      ServiceRoleEnum.ACCESSOR,
      ServiceRoleEnum.ADMIN,
      ServiceRoleEnum.ASSESSMENT,
      ServiceRoleEnum.QUALIFYING_ACCESSOR
    ])("shouldn't return preferences, collaborations and transfers for %s", async (role: ServiceRoleEnum) => {
      mock.mockResolvedValueOnce({
        ...userInfo,
        roles: [{ id: randUuid(), role, isActive: true }]
      });
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .call<ResponseDTO>(azureFunction);
      expect(preferencesMock).toHaveBeenCalledTimes(0);
      expect(pendingTransfersMock).toHaveBeenCalledTimes(0);
      expect(pendingCollaborationsMock).toHaveBeenCalledTimes(0);
      expect(result.body).toMatchObject({
        contactByEmail: false,
        contactByPhone: false,
        contactByPhoneTimeframe: null,
        contactDetails: null,
        hasInnovationCollaborations: false,
        hasInnovationTransfers: false
      });
    });

    it("shouldn't check announcements and termsOfUse for admin", async () => {
      mock.mockResolvedValueOnce({
        ...userInfo,
        roles: [{ id: randUuid(), role: ServiceRoleEnum.ADMIN, isActive: true }]
      });
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .call<ResponseDTO>(azureFunction);
      expect(termsOfUseAcceptedMock).toHaveBeenCalledTimes(0);
      expect(announcementsMock).toHaveBeenCalledTimes(0);
      expect(result.body).toMatchObject({
        hasLoginAnnouncements: {},
        termsOfUseAccepted: true
      });
    });

    it.each([
      ServiceRoleEnum.ACCESSOR,
      ServiceRoleEnum.ASSESSMENT,
      ServiceRoleEnum.INNOVATOR,
      ServiceRoleEnum.QUALIFYING_ACCESSOR
    ])('should check annoucements and termsOfUse for %s', async role => {
      mock.mockResolvedValueOnce({
        ...userInfo,
        roles: [{ id: randUuid(), role, isActive: true }]
      });
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .call<ResponseDTO>(azureFunction);
      expect(termsOfUseAcceptedMock).toHaveBeenCalledTimes(1);
      expect(announcementsMock).toHaveBeenCalledTimes(1);
      expect(result.body).toMatchObject({
        hasLoginAnnouncements: {},
        termsOfUseAccepted: terms.isAccepted
      });
    });

    it("shouldn't do any extra checks if user has multiple roles", async () => {
      mock.mockResolvedValueOnce({
        ...userInfo,
        roles: [
          { id: randUuid(), role: ServiceRoleEnum.QUALIFYING_ACCESSOR, isActive: true },
          { id: randUuid(), role: ServiceRoleEnum.INNOVATOR, isActive: true } // this isn't possible but helps prove a point
        ]
      });
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .call<ResponseDTO>(azureFunction);
      expect(preferencesMock).toHaveBeenCalledTimes(0);
      expect(pendingTransfersMock).toHaveBeenCalledTimes(0);
      expect(pendingCollaborationsMock).toHaveBeenCalledTimes(0);
      expect(termsOfUseAcceptedMock).toHaveBeenCalledTimes(0);
      expect(announcementsMock).toHaveBeenCalledTimes(1);
      expect(result.body).toMatchObject({
        contactByEmail: false,
        contactByPhone: false,
        contactByPhoneTimeframe: null,
        contactDetails: null,
        hasInnovationCollaborations: false,
        hasInnovationTransfers: false,
        hasLoginAnnouncements: {},
        termsOfUseAccepted: true
      });
    });

    it('should only consider active roles', async () => {
      mock.mockResolvedValueOnce({
        ...userInfo,
        roles: [...userInfo.roles, { id: randUuid(), role: ServiceRoleEnum.QUALIFYING_ACCESSOR, isActive: false }]
      });
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .call<ResponseDTO>(azureFunction);
      expect(result.status).toBe(200);
      expect(result.body).toStrictEqual({
        ...omit(userInfo, ['identityId', 'lockedAt', 'isActive']),
        ...preferences,
        hasLoginAnnouncements: {},
        hasInnovationCollaborations: true,
        hasInnovationTransfers: true,
        termsOfUseAccepted: terms.isAccepted
      });
      expect(mock).toHaveBeenCalledTimes(1);
      expect(termsOfUseAcceptedMock).toHaveBeenCalledTimes(1);
      expect(pendingTransfersMock).toHaveBeenCalledTimes(1);
      expect(pendingCollaborationsMock).toHaveBeenCalledTimes(1);
      expect(announcementsMock).toHaveBeenCalledTimes(1);
      expect(preferencesMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('500', () => {
    it('should return error if one happens', async () => {
      mock.mockRejectedValueOnce(new InternalServerError(UserErrorsEnum.USER_INFO_EMPTY_INPUT));
      const res = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .call<ErrorResponseType>(azureFunction);
      expect(res.status).toBe(500);
      expect(res.body.error).toBe(UserErrorsEnum.USER_INFO_EMPTY_INPUT);
    });
  });
});
