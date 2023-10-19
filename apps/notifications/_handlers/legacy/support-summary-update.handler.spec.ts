import { NotificationContextDetailEnum, NotificationContextTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV } from '../../_config';
import { RecipientsService, type RecipientType } from '../../_services/recipients.service';
import { SupportSummaryUpdateHandler } from './support-summary-update.handler';

describe('Notifications / _handlers / support-summary-update handler suite', () => {
  let handler: SupportSummaryUpdateHandler;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

  beforeAll(async () => {
    await testsHelper.init();
  });

  it('should send an email to the innovation owner', async () => {
    handler = new SupportSummaryUpdateHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
      {
        innovationId: innovation.id,
        organisationUnitId:
          scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
        supportId: innovation.supports.supportByHealthOrgUnit.id
      },
      MocksHelper.mockContext()
    );

    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      id: innovation.id,
      name: innovation.name,
      ownerId: scenario.users.johnInnovator.id,
      ownerIdentityId: scenario.users.johnInnovator.identityId
    });

    await handler.run();

    const expectedEmail = handler.emails.find(
      email =>
        (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId ===
        scenario.users.johnInnovator.roles.innovatorRole.id
    );

    expect(expectedEmail).toMatchObject({
      templateId: 'SUPPORT_SUMMARY_UPDATE_TO_INNOVATOR',
      notificationPreferenceType: null,
      to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
      params: {
        unit_name: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
        support_summary_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId/support-summary?unitId=:unitId')
          .setPathParams({
            innovationId: innovation.id,
            unitId: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id
          })
          .buildUrl()
      }
    });
  });

  it(`should not send an email if the innovation owner doesn't exist`, async () => {
    handler = new SupportSummaryUpdateHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
      {
        innovationId: innovation.id,
        organisationUnitId:
          scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
        supportId: innovation.supports.supportByHealthOrgUnit.id
      },
      MocksHelper.mockContext()
    );

    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      id: innovation.id,
      name: innovation.name,
      ownerId: undefined,
      ownerIdentityId: undefined
    });

    await handler.run();

    const expectedEmail = handler.emails.find(
      email =>
        (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId ===
        scenario.users.johnInnovator.roles.innovatorRole.id
    );

    expect(expectedEmail).toBeUndefined();
  });

  it('should send an in app to the innovation owner', async () => {
    handler = new SupportSummaryUpdateHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
      {
        innovationId: innovation.id,
        organisationUnitId:
          scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
        supportId: innovation.supports.supportByHealthOrgUnit.id
      },
      MocksHelper.mockContext()
    );

    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      id: innovation.id,
      name: innovation.name,
      ownerId: scenario.users.johnInnovator.id,
      ownerIdentityId: scenario.users.johnInnovator.identityId
    });

    await handler.run();

    const expectedInApp = handler.inApp.find(inApp =>
      inApp.userRoleIds.includes(scenario.users.johnInnovator.roles.innovatorRole.id)
    );

    expect(expectedInApp).toMatchObject({
      innovationId: innovation.id,
      context: {
        type: NotificationContextTypeEnum.SUPPORT,
        detail: NotificationContextDetailEnum.SUPPORT_SUMMARY_UPDATE,
        id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
      },
      userRoleIds: [scenario.users.johnInnovator.roles.innovatorRole.id],
      params: {
        organisationUnitName:
          scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
      }
    });
  });

  it(`should not send an in app if the innovation owner doesn't exist`, async () => {
    handler = new SupportSummaryUpdateHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
      {
        innovationId: innovation.id,
        organisationUnitId:
          scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
        supportId: innovation.supports.supportByHealthOrgUnit.id
      },
      MocksHelper.mockContext()
    );

    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      id: innovation.id,
      name: innovation.name,
      ownerId: undefined,
      ownerIdentityId: undefined
    });

    await handler.run();

    const expectedInApp = handler.inApp.find(inApp =>
      inApp.userRoleIds.includes(scenario.users.johnInnovator.roles.innovatorRole.id)
    );

    expect(expectedInApp).toBeUndefined();
  });

  it('should send an email to the innovation collaborators', async () => {
    handler = new SupportSummaryUpdateHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
      {
        innovationId: innovation.id,
        organisationUnitId:
          scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
        supportId: innovation.supports.supportByHealthOrgUnit.id
      },
      MocksHelper.mockContext()
    );

    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      id: innovation.id,
      name: innovation.name,
      ownerId: scenario.users.johnInnovator.id,
      ownerIdentityId: scenario.users.johnInnovator.identityId
    });

    jest
      .spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators')
      .mockResolvedValueOnce([scenario.users.janeInnovator.id]);

    await handler.run();

    const expectedEmail = handler.emails.find(
      email =>
        (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId ===
        scenario.users.janeInnovator.roles.innovatorRole.id
    );

    expect(expectedEmail).toMatchObject({
      templateId: 'SUPPORT_SUMMARY_UPDATE_TO_INNOVATOR',
      notificationPreferenceType: null,
      to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator),
      params: {
        unit_name: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
        support_summary_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId/support-summary?unitId=:unitId')
          .setPathParams({
            innovationId: innovation.id,
            unitId: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id
          })
          .buildUrl()
      }
    });
  });

  it(`should not send an email if there are no active collaborators`, async () => {
    handler = new SupportSummaryUpdateHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
      {
        innovationId: innovation.id,
        organisationUnitId:
          scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
        supportId: innovation.supports.supportByHealthOrgUnit.id
      },
      MocksHelper.mockContext()
    );

    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      id: innovation.id,
      name: innovation.name,
      ownerId: scenario.users.johnInnovator.id,
      ownerIdentityId: scenario.users.johnInnovator.identityId
    });

    jest.spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators').mockResolvedValueOnce([]);

    await handler.run();

    const expectedEmail = handler.emails.find(
      email =>
        (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId ===
        scenario.users.janeInnovator.roles.innovatorRole.id
    );

    expect(expectedEmail).toBeUndefined();
  });

  it('should send an in app to the active collaborators', async () => {
    handler = new SupportSummaryUpdateHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
      {
        innovationId: innovation.id,
        organisationUnitId:
          scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
        supportId: innovation.supports.supportByHealthOrgUnit.id
      },
      MocksHelper.mockContext()
    );

    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      id: innovation.id,
      name: innovation.name,
      ownerId: scenario.users.johnInnovator.id,
      ownerIdentityId: scenario.users.johnInnovator.identityId
    });

    jest
      .spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators')
      .mockResolvedValueOnce([scenario.users.janeInnovator.id]);

    await handler.run();

    const expectedInApp = handler.inApp.find(inApp =>
      inApp.userRoleIds.includes(scenario.users.janeInnovator.roles.innovatorRole.id)
    );

    expect(expectedInApp).toMatchObject({
      innovationId: innovation.id,
      context: {
        type: NotificationContextTypeEnum.SUPPORT,
        detail: NotificationContextDetailEnum.SUPPORT_SUMMARY_UPDATE,
        id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
      },
      userRoleIds: [scenario.users.janeInnovator.roles.innovatorRole.id],
      params: {
        organisationUnitName:
          scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
      }
    });
  });

  it(`should not send an in app if the innovation has no active collaborators`, async () => {
    handler = new SupportSummaryUpdateHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
      {
        innovationId: innovation.id,
        organisationUnitId:
          scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
        supportId: innovation.supports.supportByHealthOrgUnit.id
      },
      MocksHelper.mockContext()
    );

    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      id: innovation.id,
      name: innovation.name,
      ownerId: scenario.users.johnInnovator.id,
      ownerIdentityId: scenario.users.johnInnovator.identityId
    });

    jest.spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators').mockResolvedValueOnce([]);

    await handler.run();

    const expectedInApp = handler.inApp.find(inApp =>
      inApp.userRoleIds.includes(scenario.users.janeInnovator.roles.innovatorRole.id)
    );

    expect(expectedInApp).toBeUndefined();
  });
});
