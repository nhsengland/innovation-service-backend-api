/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NotificationContextDetailEnum, NotificationContextTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { DomainUsersService } from '@notifications/shared/services';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { ENV, EmailTypeEnum } from '../_config';
import { RecipientsService } from '../_services/recipients.service';
import { ActionCreationHandler } from './action-creation.handler';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import type { TestUserType } from '@notifications/shared/tests/builders/user.builder';
import type { TestInnovationActionType } from '@notifications/shared/tests/builders/innovation-action.builder';

type ActionCreationHandlerData = {
  roleKey: string;
  requestUser: TestUserType;
  action: TestInnovationActionType;
  unitName: string;
};

describe('Notifications / _handlers / action-creation suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  describe('Should send an email to the innovation owner and collaborators', () => {
    const getAliceData = (): ActionCreationHandlerData => {
      return {
        roleKey: 'qaRole',
        requestUser: scenario.users.aliceQualifyingAccessor,
        action: scenario.users.johnInnovator.innovations.johnInnovation.actions.actionByAlice,
        unitName: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
      };
    };

    const getPaulData = (): ActionCreationHandlerData => {
      return {
        roleKey: 'assessmentRole',
        requestUser: scenario.users.paulNeedsAssessor,
        action: scenario.users.johnInnovator.innovations.johnInnovation.actions.actionByPaul,
        unitName: 'needs assessment'
      };
    };

    it.each([
      ['QA', getAliceData],
      ['NA', getPaulData]
    ])('Action created by %s', async (_, getFunc: () => ActionCreationHandlerData) => {
      const { roleKey, requestUser, action, unitName } = getFunc();
      const actionOwnerContext = DTOsHelper.getUserRequestContext(requestUser, roleKey);

      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

      //to be removed
      jest.spyOn(DomainUsersService.prototype, 'getUserInfo').mockResolvedValue({
        displayName: requestUser.name
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
        ...(unitName !== 'needs assessment' && { organisationUnit: { name: unitName } })
      } as any);

      const handler = new ActionCreationHandler(
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
      expect(handler.emails).toMatchObject([
        {
          templateId: EmailTypeEnum.ACTION_CREATION_TO_INNOVATOR,
          notificationPreferenceType: 'ACTION',
          to: mockedInnovationOwner,
          params: {
            // display_name: '', // This will be filled by the email-listener function.
            accessor_name: requestUser.name,
            unit_name: unitName,
            action_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
              .setPathParams({
                innovationId: innovation.id,
                actionId: action.id
              })
              .buildUrl()
          }
        },
        {
          templateId: EmailTypeEnum.ACTION_CREATION_TO_INNOVATOR,
          notificationPreferenceType: 'ACTION',
          to: mockedInnovationCollaborator,
          params: {
            // display_name: '', // This will be filled by the email-listener function.
            accessor_name: requestUser.name,
            unit_name: unitName,
            action_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
              .setPathParams({
                innovationId: innovation.id,
                actionId: action.id
              })
              .buildUrl()
          }
        }
      ]);
      expect(handler.inApp).toMatchObject([
        {
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
        }
      ]);
    });
  });
});
