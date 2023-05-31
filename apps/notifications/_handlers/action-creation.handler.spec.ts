/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NotificationContextDetailEnum, NotificationContextTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { DomainUsersService } from '@notifications/shared/services';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { ENV, EmailTypeEnum } from '../_config';
import { RecipientsService } from '../_services/recipients.service';
import { ActionCreationHandler } from './action-creation.handler';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';

describe('Notifications / _handlers / action-creation suite', () => {
  let handler: ActionCreationHandler;
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  it('Should send an email to the innovation owner and collaborators', async () => {
    const actionOwnerContext = testsHelper.getUserContext(scenario.users.aliceQualifyingAccessor, 'qaRole');

    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const action = innovation.actions[0]!;

    //mock request user info
    jest.spyOn(DomainUsersService.prototype, 'getUserInfo').mockResolvedValue({
      displayName: scenario.users.aliceQualifyingAccessor.name
    } as any);

    // mock innovation
    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValue({
      name: innovation.name,
      ownerId: scenario.users.johnInnovator.id,
      ownerIdentityId: scenario.users.johnInnovator.identityId
    });

    // mock collaborators
    jest.spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators').mockResolvedValue([]);

    const mockedInnovationOwner = DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole');
    const mockedInnovationCollaborator = DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole');

    // mock recipients
    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValue([mockedInnovationOwner, mockedInnovationCollaborator]);

    // mock action
    jest.spyOn(RecipientsService.prototype, 'actionInfoWithOwner').mockResolvedValue({
      organisationUnit: {
        name: scenario.users.aliceQualifyingAccessor.organisations.aliceOrg.organisationUnits.aliceOrgUnit.name
      }
    } as any);

    handler = new ActionCreationHandler(
      actionOwnerContext,
      {
        innovationId: innovation.id,
        action: {
          id: action.id,
          section: action.section
        }
      },
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toHaveLength(2);
    expect(handler.inApp).toHaveLength(1);
    expect(handler.emails[0]).toMatchObject({
      templateId: EmailTypeEnum.ACTION_CREATION_TO_INNOVATOR,
      notificationPreferenceType: 'ACTION',
      to: mockedInnovationOwner,
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        accessor_name: scenario.users.aliceQualifyingAccessor.name,
        unit_name: scenario.users.aliceQualifyingAccessor.organisations.aliceOrg.organisationUnits.aliceOrgUnit.name,
        action_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
          .setPathParams({
            innovationId: innovation.id,
            actionId: action.id
          })
          .buildUrl()
      }
    });
    expect(handler.emails[1]).toMatchObject({
      templateId: EmailTypeEnum.ACTION_CREATION_TO_INNOVATOR,
      notificationPreferenceType: 'ACTION',
      to: mockedInnovationCollaborator,
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        accessor_name: scenario.users.aliceQualifyingAccessor.name,
        unit_name: scenario.users.aliceQualifyingAccessor.organisations.aliceOrg.organisationUnits.aliceOrgUnit.name,
        action_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
          .setPathParams({
            innovationId: innovation.id,
            actionId: action.id
          })
          .buildUrl()
      }
    });
    expect(handler.inApp[0]).toMatchObject({
      innovationId: innovation.id,
      context: {
        type: NotificationContextTypeEnum.ACTION,
        detail: NotificationContextDetailEnum.ACTION_CREATION,
        id: action.id
      },
      userRoleIds: [
        scenario.users.johnInnovator.roles['innovatorRole']!.id,
        scenario.users.janeInnovator.roles['innovatorRole']!.id
      ],
      params: {
        section: action.section
      }
    });
  });

  it('Should fill in the unit name for action owned by an NA', async () => {
    const actionOwnerContext = testsHelper.getUserContext(scenario.users.paulNeedsAssessor, 'assessmentRole');

    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const action = innovation.actions[1]!; //action created by Paul (NA)

    //mock request user info
    jest.spyOn(DomainUsersService.prototype, 'getUserInfo').mockResolvedValue({
      displayName: scenario.users.paulNeedsAssessor.name
    } as any);

    // mock innovation
    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValue({
      name: innovation.name,
      ownerId: scenario.users.johnInnovator.id,
      ownerIdentityId: scenario.users.johnInnovator.identityId
    });

    // mock collaborators
    jest.spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators').mockResolvedValue([]);

    const mockedInnovationOwner = DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole');

    // mock recipients
    jest.spyOn(RecipientsService.prototype, 'getUsersRecipient').mockResolvedValue([mockedInnovationOwner]);

    // mock action
    jest.spyOn(RecipientsService.prototype, 'actionInfoWithOwner').mockResolvedValue({} as any);

    handler = new ActionCreationHandler(
      actionOwnerContext,
      {
        innovationId: innovation.id,
        action: {
          id: action.id,
          section: action.section
        }
      },
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toHaveLength(1);
    expect(handler.inApp).toHaveLength(1);
    expect(handler.emails[0]).toMatchObject({
      templateId: EmailTypeEnum.ACTION_CREATION_TO_INNOVATOR,
      notificationPreferenceType: 'ACTION',
      to: mockedInnovationOwner,
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        accessor_name: scenario.users.paulNeedsAssessor.name,
        unit_name: 'needs assessment',
        action_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
          .setPathParams({
            innovationId: innovation.id,
            actionId: action.id
          })
          .buildUrl()
      }
    });
    expect(handler.inApp[0]).toMatchObject({
      innovationId: innovation.id,
      context: {
        type: NotificationContextTypeEnum.ACTION,
        detail: NotificationContextDetailEnum.ACTION_CREATION,
        id: action.id
      },
      userRoleIds: [scenario.users.johnInnovator.roles['innovatorRole']!.id],
      params: {
        section: action.section
      }
    });
  });
});
