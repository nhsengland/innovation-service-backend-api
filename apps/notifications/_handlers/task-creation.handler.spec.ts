/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NotificationCategoryEnum, NotificationContextTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV } from '../_config';
import { TaskCreationHandler } from './task-creation.handler';

describe('Notifications / _handlers / task-creation suite', () => {
  const testsHelper = new TestsHelper();
  const scenario: CompleteScenarioType = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await new TestsHelper().init();
  });

  describe('TA01_TASK_CREATION_TO_INNOVATOR', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const task = innovation.tasks.taskByAlice;
    it('Should send an email to the innovator (owner+collaborators)', async () => {
      const requestUser = scenario.users.aliceQualifyingAccessor;
      const handler = new TaskCreationHandler(
        DTOsHelper.getUserRequestContext(requestUser),
        {
          innovationId: innovation.id,
          task: { id: task.id }
        },
        MocksHelper.mockContext()
      );

      await handler.run();
      expect(handler.emails.length).toBe(2);
      expect(handler.emails).toEqual([
        {
          templateId: 'TA01_TASK_CREATION_TO_INNOVATOR',
          notificationPreferenceType: NotificationCategoryEnum.TASK,
          to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          params: {
            innovation_name: innovation.name,
            unit_name: requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
            task_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/tasks/:taskId')
              .setPathParams({
                innovationId: innovation.id,
                taskId: task.id
              })
              .buildUrl()
          }
        },
        {
          templateId: 'TA01_TASK_CREATION_TO_INNOVATOR',
          notificationPreferenceType: NotificationCategoryEnum.TASK,
          to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'),
          params: {
            innovation_name: innovation.name,
            unit_name: requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
            task_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/tasks/:taskId')
              .setPathParams({
                innovationId: innovation.id,
                taskId: task.id
              })
              .buildUrl()
          }
        }
      ]);
    });

    it('Should send an inApp to the innovators (owner+collaborators)', async () => {
      const requestUser = scenario.users.aliceQualifyingAccessor;
      const handler = new TaskCreationHandler(
        DTOsHelper.getUserRequestContext(requestUser),
        {
          innovationId: innovation.id,
          task: { id: task.id }
        },
        MocksHelper.mockContext()
      );

      await handler.run();
      expect(handler.inApp).toEqual([
        {
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.TASK,
            detail: 'TA01_TASK_CREATION_TO_INNOVATOR',
            id: task.id
          },
          userRoleIds: [
            scenario.users.johnInnovator.roles.innovatorRole.id,
            scenario.users.janeInnovator.roles.innovatorRole.id
          ],
          params: {
            innovationName: innovation.name,
            unitName: requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
            taskId: task.id
          }
        }
      ]);
    });

    it('Should use NA team name instead of unit when requested by NA', async () => {
      const requestUser = scenario.users.paulNeedsAssessor;
      const handler = new TaskCreationHandler(
        DTOsHelper.getUserRequestContext(requestUser),
        {
          innovationId: innovation.id,
          task: { id: task.id }
        },
        MocksHelper.mockContext()
      );

      await handler.run();
      expect(handler.emails[0]?.params.unit_name).toBe('needs assessment');
      expect(handler.inApp[0]?.params.unitName).toBe('needs assessment');
    });
  });
});
