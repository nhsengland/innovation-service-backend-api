import { InnovationTaskStatusEnum } from '@notifications/shared/enums';
import { TestsHelper } from '@notifications/shared/tests';

describe.skip('Notifications / _handlers / task-update suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await new TestsHelper().init();
  });

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  const task = innovation.tasks.taskByAlice;

  describe('Task updated by Innovator', () => {
    const requestUser = scenario.users.johnInnovator;

    describe('TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS', () => {
      it.each([InnovationTaskStatusEnum.DONE, InnovationTaskStatusEnum.DECLINED])(
        'should send an email to the innovator when a task is %s',
        async () => {
          fail('todo');
        }
      );

      it.each([InnovationTaskStatusEnum.DONE, InnovationTaskStatusEnum.DECLINED])(
        'should send an in-app to the innovator when a task is %s',
        async () => {
          fail('todo');
        }
      );
    });

    describe('TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT', () => {
      it('should send an email to the creator when a task is done', async () => {
        fail('todo');
      });

      it('should send an in-app to the creator when a task is done', async () => {
        fail('todo');
      });
    });

    describe('TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT', () => {
      it('should send an email to the creator when a task is declined', async () => {
        fail('todo');
      });

      it('should send an in-app to the creator when a task is declined', async () => {
        fail('todo');
      });
    });
  });

  describe('Task updated by Accessor/Assessor', () => {
    const requestUser = scenario.users.aliceQualifyingAccessor;

    describe('TA05_TASK_CANCELLED_TO_INNOVATOR', () => {
      it('should send an email to the innovators when a task is cancelled', async () => {
        fail('todo');
      });

      it('should send an in-app to the innovators when a task is cancelled', async () => {
        fail('todo');
      });
    });

    describe('TA06_TASK_REOPEN_TO_INNOVATOR', () => {
      it('should send an email to the innovators when a task is reopened', async () => {
        fail('todo');
      });

      it('should send an in-app to the innovators when a task is reopened', async () => {
        fail('todo');
      });
    });
  });
});
