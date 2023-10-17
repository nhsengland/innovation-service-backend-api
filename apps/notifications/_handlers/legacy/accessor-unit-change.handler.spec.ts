import { NotFoundError, UserErrorsEnum } from '@notifications/shared/errors';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { EmailTypeEnum } from '../../_config';
import { RecipientType, RecipientsService } from '../../_services/recipients.service';
import { AccessorUnitChangeHandler } from './accessor-unit-change.handler';

describe('Notifications / _handlers / accessor-unit-change suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
  });

  describe('Unable to retrieve user info', () => {
    let handler: AccessorUnitChangeHandler;

    let user: CompleteScenarioType['users']['sarahQualifyingAccessor'];
    let oldOrganisationUnit: CompleteScenarioType['users']['aliceQualifyingAccessor']['organisations']['healthOrg']['organisationUnits']['healthOrgUnit'];
    let newOrganisationUnit: CompleteScenarioType['users']['sarahQualifyingAccessor']['organisations']['healthOrg']['organisationUnits']['healthOrgAiUnit'];

    beforeAll(() => {
      oldOrganisationUnit =
        scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit;
      newOrganisationUnit =
        scenario.users.sarahQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgAiUnit;

      user = scenario.users.sarahQualifyingAccessor;

      handler = new AccessorUnitChangeHandler(
        DTOsHelper.getUserRequestContext(scenario.users.sarahQualifyingAccessor),
        {
          user: { id: user.id, identityId: user.identityId },
          oldOrganisationUnitId: oldOrganisationUnit.id,
          newOrganisationUnitId: newOrganisationUnit.id
        },
        MocksHelper.mockContext()
      );
    });

    it('Should throw a not found error when userInfo is not defined', async () => {
      // mock userInfo
      jest.spyOn(RecipientsService.prototype, 'getUsersRecipient').mockResolvedValueOnce(null);

      await expect(() => handler.run()).rejects.toThrowError(new NotFoundError(UserErrorsEnum.USER_ROLE_NOT_FOUND));
    });

    it('Should throw a not found error when userIdentityInfo is not defined', async () => {
      // mock userInfo
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(user, 'qaRole'));

      // mock userIdentityInfo
      jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValueOnce(null);

      await expect(() => handler.run()).rejects.toThrowError(new NotFoundError(UserErrorsEnum.USER_ROLE_NOT_FOUND));
    });
  });

  describe('User info is retrieved correctly', () => {
    let handler: AccessorUnitChangeHandler;

    let user: CompleteScenarioType['users']['sarahQualifyingAccessor'];
    let organisation: CompleteScenarioType['users']['sarahQualifyingAccessor']['organisations']['healthOrg'];
    let oldOrganisationUnit: CompleteScenarioType['users']['aliceQualifyingAccessor']['organisations']['healthOrg']['organisationUnits']['healthOrgUnit'];
    let newOrganisationUnit: CompleteScenarioType['users']['sarahQualifyingAccessor']['organisations']['healthOrg']['organisationUnits']['healthOrgAiUnit'];

    beforeAll(async () => {
      organisation = scenario.users.sarahQualifyingAccessor.organisations.healthOrg;
      oldOrganisationUnit =
        scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit;
      newOrganisationUnit =
        scenario.users.sarahQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgAiUnit;

      user = scenario.users.sarahQualifyingAccessor;

      // mock userInfo
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(user, 'qaRole'));

      //mock oldUnitInfo
      jest.spyOn(RecipientsService.prototype, 'organisationUnitInfo').mockResolvedValueOnce({
        organisation: {
          id: organisation.id,
          name: organisation.name,
          acronym: organisation.acronym
        },
        organisationUnit: {
          id: oldOrganisationUnit.id,
          name: oldOrganisationUnit.name,
          acronym: oldOrganisationUnit.acronym
        }
      });
      //mock newUnitInfo
      jest.spyOn(RecipientsService.prototype, 'organisationUnitInfo').mockResolvedValueOnce({
        organisation: {
          id: organisation.id,
          name: organisation.name,
          acronym: organisation.acronym
        },
        organisationUnit: {
          id: newOrganisationUnit.id,
          name: newOrganisationUnit.name,
          acronym: newOrganisationUnit.acronym
        }
      });

      //mock oldUnitQAs
      jest
        .spyOn(RecipientsService.prototype, 'organisationUnitsQualifyingAccessors')
        .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')]);
      //mock newUnitQAs
      jest
        .spyOn(RecipientsService.prototype, 'organisationUnitsQualifyingAccessors')
        .mockResolvedValueOnce([
          DTOsHelper.getRecipientUser(scenario.users.sarahQualifyingAccessor, 'qaRole'),
          DTOsHelper.getRecipientUser(scenario.users.bartQualifyingAccessor, 'qaRole')
        ]);

      handler = new AccessorUnitChangeHandler(
        DTOsHelper.getUserRequestContext(scenario.users.sarahQualifyingAccessor),
        {
          user: { id: user.id, identityId: user.identityId },
          oldOrganisationUnitId: oldOrganisationUnit.id,
          newOrganisationUnitId: newOrganisationUnit.id
        },
        MocksHelper.mockContext()
      );
      await handler.run();
    });

    it('Should send email to accessor that changed unit', () => {
      const expectedEmail = handler.emails.find(
        email => email.templateId === EmailTypeEnum.ACCESSOR_UNIT_CHANGE_TO_USER_MOVED
      );

      expect(expectedEmail).toMatchObject({
        templateId: EmailTypeEnum.ACCESSOR_UNIT_CHANGE_TO_USER_MOVED,
        to: DTOsHelper.getRecipientUser(user),
        notificationPreferenceType: null,
        params: {
          old_organisation: organisation.name,
          old_unit: oldOrganisationUnit.name,
          new_organisation: organisation.name,
          new_unit: newOrganisationUnit.name
        }
      });
    });

    it(`Should send email to QA's of new unit`, () => {
      const expectedEmail = handler.emails.find(
        email =>
          (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId ===
          scenario.users.bartQualifyingAccessor.roles.qaRole.id
      );

      expect(expectedEmail).toMatchObject({
        templateId: EmailTypeEnum.ACCESSOR_UNIT_CHANGE_TO_QA_NEW_UNIT,
        to: DTOsHelper.getRecipientUser(scenario.users.bartQualifyingAccessor, 'qaRole'),
        notificationPreferenceType: null,
        params: {
          user_name: user.name,
          new_unit: newOrganisationUnit.name
        }
      });
    });

    it(`Should filter requestUser from QA recipients of new unit`, () => {
      const expectedEmail = handler.emails.find(
        email =>
          (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId === user.roles.qaRole.id &&
          email.templateId === EmailTypeEnum.ACCESSOR_UNIT_CHANGE_TO_QA_NEW_UNIT
      );

      expect(expectedEmail).toBeUndefined();
    });

    it(`Should send email to QA's of old unit`, () => {
      const expectedEmail = handler.emails.find(
        email =>
          (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId ===
          scenario.users.aliceQualifyingAccessor.roles.qaRole.id
      );

      expect(expectedEmail).toMatchObject({
        templateId: EmailTypeEnum.ACCESSOR_UNIT_CHANGE_TO_QA_OLD_UNIT,
        to: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        notificationPreferenceType: null,
        params: {
          user_name: user.name,
          old_unit: oldOrganisationUnit.name
        }
      });
    });
  });
});
