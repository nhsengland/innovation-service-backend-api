import * as crypto from 'crypto';
import { TranslationHelper } from '@notifications/shared/helpers';
import type { CompleteScenarioType } from '@notifications/shared/tests';
import { MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { TaskCreationHandler } from './task-creation.handler';
import { taskUrl } from '../../_helpers/url.helper';
import { ServiceRoleEnum } from '@notifications/shared/enums';

jest.mock('crypto');
const notificationId = '00001234-1234-1234-1234-123456789012';
jest.spyOn(crypto, 'randomUUID').mockImplementation(() => notificationId);

describe('Notifications / _handlers / task-creation suite', () => {
  const testsHelper = new TestsHelper();
  const scenario: CompleteScenarioType = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  describe('TA01_TASK_CREATION_TO_INNOVATOR', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const task = innovation.tasks.taskByAlice;
    it('Should send an email to the innovators (owner+collaborators)', async () => {
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
          notificationPreferenceType: 'TASK',
          to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          params: {
            innovation_name: innovation.name,
            unit_name: requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
            task_url: taskUrl(ServiceRoleEnum.INNOVATOR, innovation.id, task.id, notificationId)
          }
        },
        {
          templateId: 'TA01_TASK_CREATION_TO_INNOVATOR',
          notificationPreferenceType: 'TASK',
          to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'),
          params: {
            innovation_name: innovation.name,
            unit_name: requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
            task_url: taskUrl(ServiceRoleEnum.INNOVATOR, innovation.id, task.id, notificationId)
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
            type: 'TASK',
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
          },
          notificationId
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
      expect(handler.emails[0]?.params.unit_name).toBe(TranslationHelper.translate('TEAMS.ASSESSMENT'));
      expect(handler.inApp[0]?.params.unitName).toBe(TranslationHelper.translate('TEAMS.ASSESSMENT'));
    });
  });
});
