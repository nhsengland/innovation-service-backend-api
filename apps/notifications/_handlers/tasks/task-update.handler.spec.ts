import { randText } from '@ngneat/falso';
import { InnovationTaskStatusEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { randomUUID } from 'crypto';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { taskUrl, threadUrl } from '../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { TaskUpdateHandler } from './task-update.handler';

describe('Notifications / _handlers / task-update suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  const task = innovation.tasks.taskByAlice;
  const message = randText();
  const messageId = randomUUID();
  const threadId = randomUUID();

  describe('Task updated by Innovator', () => {
    const requestUser = scenario.users.johnInnovator;

    describe('TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS', () => {
      it.each([InnovationTaskStatusEnum.DONE, InnovationTaskStatusEnum.DECLINED])(
        'should send an email to the innovators when a task is %s',
        async status => {
          await testEmails(TaskUpdateHandler, 'TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS', {
            notificationPreferenceType: 'TASK',
            requestUser: DTOsHelper.getUserRequestContext(requestUser),
            inputData: {
              innovationId: innovation.id,
              task: { id: task.id, status: status },
              message,
              messageId,
              threadId
            },
            recipients: [
              DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
              DTOsHelper.getRecipientUser(scenario.users.janeInnovator)
            ],
            outputData: {
              innovation_name: innovation.name,
              innovator_name: scenario.users.johnInnovator.name,
              task_status: status === InnovationTaskStatusEnum.DONE ? 'done' : 'declined',
              message_url: threadUrl(ServiceRoleEnum.INNOVATOR, innovation.id, threadId)
            }
          });
        }
      );

      it.each([InnovationTaskStatusEnum.DONE, InnovationTaskStatusEnum.DECLINED])(
        'should send an in-app to the innovator when a task is %s',
        async status => {
          await testInApps(TaskUpdateHandler, 'TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS', {
            innovationId: innovation.id,
            context: { id: task.id, type: 'TASK' },
            requestUser: DTOsHelper.getUserRequestContext(requestUser),
            inputData: {
              innovationId: innovation.id,
              task: { id: task.id, status: status },
              message,
              messageId,
              threadId
            },
            recipients: [
              DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
              DTOsHelper.getRecipientUser(scenario.users.janeInnovator)
            ],
            outputData: {
              requestUserName: scenario.users.johnInnovator.name,
              innovationName: innovation.name,
              status: status,
              messageId: messageId,
              threadId: threadId
            }
          });
        }
      );
    });

    describe('TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT', () => {
      it('should send an email to the creator when a task is done', async () => {
        await testEmails(TaskUpdateHandler, 'TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT', {
          notificationPreferenceType: 'TASK',
          requestUser: DTOsHelper.getUserRequestContext(requestUser),
          inputData: {
            innovationId: innovation.id,
            task: { id: task.id, status: InnovationTaskStatusEnum.DONE },
            message,
            messageId,
            threadId
          },
          recipients: [DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)],
          outputData: {
            innovation_name: innovation.name,
            innovator_name: scenario.users.johnInnovator.name,
            message: message,
            message_url: threadUrl(ServiceRoleEnum.QUALIFYING_ACCESSOR, innovation.id, threadId),
            task_url: taskUrl(ServiceRoleEnum.QUALIFYING_ACCESSOR, innovation.id, task.id)
          }
        });
      });

      it('should send an in-app to the creator when a task is done', async () => {
        await testInApps(TaskUpdateHandler, 'TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT', {
          innovationId: innovation.id,
          context: { id: task.id, type: 'TASK' },
          requestUser: DTOsHelper.getUserRequestContext(requestUser),
          inputData: {
            innovationId: innovation.id,
            task: { id: task.id, status: InnovationTaskStatusEnum.DONE },
            message,
            messageId,
            threadId
          },
          recipients: [DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)],
          outputData: {
            requestUserName: scenario.users.johnInnovator.name,
            innovationName: innovation.name,
            status: InnovationTaskStatusEnum.DONE,
            messageId: messageId,
            threadId: threadId
          }
        });
      });
    });

    describe('TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT', () => {
      it('should send an email to the creator when a task is declined', async () => {
        await testEmails(TaskUpdateHandler, 'TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT', {
          notificationPreferenceType: 'TASK',
          requestUser: DTOsHelper.getUserRequestContext(requestUser),
          inputData: {
            innovationId: innovation.id,
            task: { id: task.id, status: InnovationTaskStatusEnum.DECLINED },
            message,
            messageId,
            threadId
          },
          recipients: [DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)],
          outputData: {
            innovation_name: innovation.name,
            innovator_name: scenario.users.johnInnovator.name,
            message: message,
            message_url: threadUrl(ServiceRoleEnum.QUALIFYING_ACCESSOR, innovation.id, threadId)
          }
        });
      });

      it('should send an in-app to the creator when a task is declined', async () => {
        await testInApps(TaskUpdateHandler, 'TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT', {
          innovationId: innovation.id,
          context: { id: task.id, type: 'TASK' },
          requestUser: DTOsHelper.getUserRequestContext(requestUser),
          inputData: {
            innovationId: innovation.id,
            task: { id: task.id, status: InnovationTaskStatusEnum.DECLINED },
            message,
            messageId,
            threadId
          },
          recipients: [DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)],
          outputData: {
            requestUserName: scenario.users.johnInnovator.name,
            innovationName: innovation.name,
            status: InnovationTaskStatusEnum.DECLINED,
            messageId: messageId,
            threadId: threadId
          }
        });
      });
    });
  });

  describe('Task updated by Accessor/Assessor', () => {
    const requestUser = scenario.users.aliceQualifyingAccessor;

    describe('TA05_TASK_CANCELLED_TO_INNOVATOR', () => {
      it('should send an email to the innovators when a task is cancelled', async () => {
        await testEmails(TaskUpdateHandler, 'TA05_TASK_CANCELLED_TO_INNOVATOR', {
          notificationPreferenceType: 'TASK',
          requestUser: DTOsHelper.getUserRequestContext(requestUser),
          inputData: {
            innovationId: innovation.id,
            task: { id: task.id, status: InnovationTaskStatusEnum.CANCELLED },
            message,
            messageId,
            threadId
          },
          recipients: [
            DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
            DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole')
          ],
          outputData: {
            accessor_name: scenario.users.aliceQualifyingAccessor.name,
            unit_name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
            innovation_name: innovation.name,
            message: message,
            message_url: threadUrl(ServiceRoleEnum.INNOVATOR, innovation.id, threadId)
          }
        });
      });

      it('should send an in-app to the innovators when a task is cancelled', async () => {
        await testInApps(TaskUpdateHandler, 'TA05_TASK_CANCELLED_TO_INNOVATOR', {
          innovationId: innovation.id,
          context: { id: task.id, type: 'TASK' },
          requestUser: DTOsHelper.getUserRequestContext(requestUser),
          inputData: {
            innovationId: innovation.id,
            task: { id: task.id, status: InnovationTaskStatusEnum.CANCELLED },
            message,
            messageId,
            threadId
          },
          recipients: [
            DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
            DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole')
          ],
          outputData: {
            requestUserName: scenario.users.aliceQualifyingAccessor.name,
            unitName: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
            innovationName: innovation.name,
            messageId: messageId,
            threadId: threadId
          }
        });
      });
    });

    describe('TA06_TASK_REOPEN_TO_INNOVATOR', () => {
      it('should send an email to the innovators when a task is reopened', async () => {
        await testEmails(TaskUpdateHandler, 'TA06_TASK_REOPEN_TO_INNOVATOR', {
          notificationPreferenceType: 'TASK',
          requestUser: DTOsHelper.getUserRequestContext(requestUser),
          inputData: {
            innovationId: innovation.id,
            task: { id: task.id, status: InnovationTaskStatusEnum.OPEN },
            message,
            messageId,
            threadId
          },
          recipients: [
            DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
            DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole')
          ],
          outputData: {
            accessor_name: scenario.users.aliceQualifyingAccessor.name,
            unit_name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
            innovation_name: innovation.name,
            message: message,
            message_url: threadUrl(ServiceRoleEnum.INNOVATOR, innovation.id, threadId)
          }
        });
      });

      it('should send an in-app to the innovators when a task is reopened', async () => {
        await testInApps(TaskUpdateHandler, 'TA06_TASK_REOPEN_TO_INNOVATOR', {
          innovationId: innovation.id,
          context: {
            type: 'TASK',
            id: task.id
          },
          requestUser: DTOsHelper.getUserRequestContext(requestUser),
          inputData: {
            innovationId: innovation.id,
            task: { id: task.id, status: InnovationTaskStatusEnum.OPEN },
            message,
            messageId,
            threadId
          },
          recipients: [
            DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
            DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole')
          ],
          outputData: {
            requestUserName: scenario.users.aliceQualifyingAccessor.name,
            unitName: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
            innovationName: innovation.name,
            messageId: messageId,
            threadId: threadId
          }
        });
      });
    });
  });
});
