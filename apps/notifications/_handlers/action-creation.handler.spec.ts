/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { ENV, EmailTypeEnum } from '../_config';
import { RecipientType, RecipientsService } from '../_services/recipients.service';
import { ActionCreationHandler } from './action-creation.handler';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { BadRequestError, UserErrorsEnum } from '@notifications/shared/errors';

describe('Notifications / _handlers / action-creation suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
  });

  describe.each([ServiceRoleEnum.INNOVATOR, ServiceRoleEnum.ACCESSOR])(
    'Handler called with user type %s',
    (userRoleType: ServiceRoleEnum) => {
      let handler: ActionCreationHandler;

      beforeAll(() => {
        const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
        const action = innovation.actions.actionByAlice;

        let requestUser: CompleteScenarioType['users']['johnInnovator'] | CompleteScenarioType['users']['allMighty'];

        if (userRoleType === ServiceRoleEnum.INNOVATOR) {
          requestUser = scenario.users.johnInnovator;
        } else {
          requestUser = scenario.users.allMighty;
        }

        handler = new ActionCreationHandler(
          DTOsHelper.getUserRequestContext(requestUser),
          {
            innovationId: innovation.id,
            action: {
              id: action.id,
              section: action.section
            }
          },
          MocksHelper.mockContext()
        );
      });

      it('Should throw an invalid user type error', async () => {
        await expect(() => handler.run()).rejects.toThrowError(new BadRequestError(UserErrorsEnum.USER_TYPE_INVALID));
      });
    }
  );

  describe.each([ServiceRoleEnum.QUALIFYING_ACCESSOR, ServiceRoleEnum.ASSESSMENT])(
    'Action created by %s',
    (userRoleType: ServiceRoleEnum) => {
      let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];

      let requestUser:
        | CompleteScenarioType['users']['aliceQualifyingAccessor']
        | CompleteScenarioType['users']['paulNeedsAssessor'];
      let action:
        | CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation']['actions']['actionByAlice']
        | CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation']['actions']['actionByPaul'];
      let unitName:
        | CompleteScenarioType['users']['aliceQualifyingAccessor']['organisations']['healthOrg']['organisationUnits']['healthOrgUnit']['name']
        | 'needs assessment';

      let handler: ActionCreationHandler;

      beforeAll(async () => {
        innovation = scenario.users.johnInnovator.innovations.johnInnovation;

        if (userRoleType === ServiceRoleEnum.QUALIFYING_ACCESSOR) {
          requestUser = scenario.users.aliceQualifyingAccessor;
          action = innovation.actions.actionByAlice;
          unitName = requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit.name;
        } else {
          requestUser = scenario.users.paulNeedsAssessor;
          action = innovation.actions.actionByPaul;
          unitName = 'needs assessment';
        }
        // mock innovation
        jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
          name: innovation.name,
          ownerId: scenario.users.johnInnovator.id,
          ownerIdentityId: scenario.users.johnInnovator.identityId
        });

        // mock collaborators
        jest.spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators').mockResolvedValueOnce([]);

        const mockedInnovationOwner = DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole');
        const mockedInnovationCollaborator = DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole');

        // mock recipients
        jest
          .spyOn(RecipientsService.prototype, 'getUsersRecipient')
          .mockResolvedValueOnce([mockedInnovationOwner, mockedInnovationCollaborator]);

        // mock action
        jest.spyOn(RecipientsService.prototype, 'actionInfoWithOwner').mockResolvedValueOnce({
          ...(unitName !== 'needs assessment' && { organisationUnit: { name: unitName } })
        } as any);

        handler = new ActionCreationHandler(
          DTOsHelper.getUserRequestContext(requestUser),
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
      });

      it('Should send an email to the innovation owner', () => {
        const expectedEmail = handler.emails.find(
          email =>
            (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId ===
            scenario.users.johnInnovator.roles.innovatorRole.id
        );

        expect(expectedEmail).toMatchObject({
          templateId: EmailTypeEnum.ACTION_CREATION_TO_INNOVATOR,
          notificationPreferenceType: 'ACTION',
          to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          params: {
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
        });
      });

      it('Should send an email to the innovation collaborators', () => {
        const expectedEmail = handler.emails.find(
          email =>
            (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId ===
            scenario.users.janeInnovator.roles.innovatorRole.id
        );

        expect(expectedEmail).toMatchObject({
          templateId: EmailTypeEnum.ACTION_CREATION_TO_INNOVATOR,
          notificationPreferenceType: 'ACTION',
          to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'),
          params: {
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
        });
      });

      it('Should send an inApp to the innovation owner', () => {
        const expectedInApp = handler.inApp.find(inApp =>
          inApp.userRoleIds.includes(scenario.users.johnInnovator.roles.innovatorRole.id)
        );

        expect(expectedInApp).toBeDefined();
        expect(expectedInApp?.innovationId).toBe(innovation.id);
        expect(expectedInApp?.context).toMatchObject({
          type: NotificationContextTypeEnum.ACTION,
          detail: NotificationContextDetailEnum.ACTION_CREATION,
          id: action.id
        });
        expect(expectedInApp?.params).toMatchObject({
          section: action.section
        });
      });

      it('Should send an inApp to the innovation collaborators', () => {
        const expectedInApp = handler.inApp.find(inApp =>
          inApp.userRoleIds.includes(scenario.users.janeInnovator.roles.innovatorRole.id)
        );

        expect(expectedInApp).toBeDefined();
        expect(expectedInApp?.innovationId).toBe(innovation.id);
        expect(expectedInApp?.context).toMatchObject({
          type: NotificationContextTypeEnum.ACTION,
          detail: NotificationContextDetailEnum.ACTION_CREATION,
          id: action.id
        });
        expect(expectedInApp?.params).toMatchObject({
          section: action.section
        });
      });
    }
  );
});
