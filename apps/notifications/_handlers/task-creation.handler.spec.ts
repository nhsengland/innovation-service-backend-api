/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { BadRequestError, UserErrorsEnum } from '@notifications/shared/errors';
import { UrlModel } from '@notifications/shared/models';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV, EmailTypeEnum } from '../_config';
import { RecipientType, RecipientsService } from '../_services/recipients.service';
import { TaskCreationHandler } from './task-creation.handler';

describe('Notifications / _handlers / task-creation suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
  });

  describe.each([ServiceRoleEnum.INNOVATOR, ServiceRoleEnum.ACCESSOR])(
    'Handler called with user type %s',
    (userRoleType: ServiceRoleEnum) => {
      let handler: TaskCreationHandler;

      beforeAll(() => {
        const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
        const task = innovation.tasks.taskByAlice;

        let requestUser: CompleteScenarioType['users']['johnInnovator'] | CompleteScenarioType['users']['allMighty'];

        if (userRoleType === ServiceRoleEnum.INNOVATOR) {
          requestUser = scenario.users.johnInnovator;
        } else {
          requestUser = scenario.users.allMighty;
        }

        handler = new TaskCreationHandler(
          DTOsHelper.getUserRequestContext(requestUser),
          {
            innovationId: innovation.id,
            task: {
              id: task.id,
              section: task.section
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
    'Task created by %s',
    (userRoleType: ServiceRoleEnum) => {
      let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];

      let requestUser:
        | CompleteScenarioType['users']['aliceQualifyingAccessor']
        | CompleteScenarioType['users']['paulNeedsAssessor'];
      let task:
        | CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation']['tasks']['taskByAlice']
        | CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation']['tasks']['taskByPaul'];
      let unitName:
        | CompleteScenarioType['users']['aliceQualifyingAccessor']['organisations']['healthOrg']['organisationUnits']['healthOrgUnit']['name']
        | 'needs assessment';

      let handler: TaskCreationHandler;

      beforeAll(async () => {
        innovation = scenario.users.johnInnovator.innovations.johnInnovation;

        if (userRoleType === ServiceRoleEnum.QUALIFYING_ACCESSOR) {
          requestUser = scenario.users.aliceQualifyingAccessor;
          task = innovation.tasks.taskByAlice;
          unitName = requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit.name;
        } else {
          requestUser = scenario.users.paulNeedsAssessor;
          task = innovation.tasks.taskByPaul;
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

        // mock task
        jest.spyOn(RecipientsService.prototype, 'taskInfoWithOwner').mockResolvedValueOnce({
          ...(unitName !== 'needs assessment' && { organisationUnit: { name: unitName } })
        } as any);

        handler = new TaskCreationHandler(
          DTOsHelper.getUserRequestContext(requestUser),
          {
            innovationId: innovation.id,
            task: {
              id: task.id,
              section: task.section
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
          templateId: EmailTypeEnum.TASK_CREATION_TO_INNOVATOR,
          notificationPreferenceType: 'TASK',
          to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          params: {
            accessor_name: requestUser.name,
            unit_name: unitName,
            action_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/task-tracker/:taskId')
              .setPathParams({
                innovationId: innovation.id,
                taskId: task.id
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
          templateId: EmailTypeEnum.TASK_CREATION_TO_INNOVATOR,
          notificationPreferenceType: 'TASK',
          to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'),
          params: {
            accessor_name: requestUser.name,
            unit_name: unitName,
            action_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/task-tracker/:taskId')
              .setPathParams({
                innovationId: innovation.id,
                taskId: task.id
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
          type: NotificationContextTypeEnum.TASK,
          detail: NotificationContextDetailEnum.TASK_CREATION,
          id: task.id
        });
        expect(expectedInApp?.params).toMatchObject({
          section: task.section
        });
      });

      it('Should send an inApp to the innovation collaborators', () => {
        const expectedInApp = handler.inApp.find(inApp =>
          inApp.userRoleIds.includes(scenario.users.janeInnovator.roles.innovatorRole.id)
        );

        expect(expectedInApp).toBeDefined();
        expect(expectedInApp?.innovationId).toBe(innovation.id);
        expect(expectedInApp?.context).toMatchObject({
          type: NotificationContextTypeEnum.TASK,
          detail: NotificationContextDetailEnum.TASK_CREATION,
          id: task.id
        });
        expect(expectedInApp?.params).toMatchObject({
          section: task.section
        });
      });
    }
  );
});
