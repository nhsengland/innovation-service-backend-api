import { randText } from '@ngneat/falso';
import {
  InnovationTaskStatusEnum,
  NotificationCategoryEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import type { DomainContextType } from '@notifications/shared/types';
import { ENV } from '../_config';
import { RecipientsService } from '../_services/recipients.service';
import { TaskUpdateHandler } from './task-update.handler';

describe.skip('Notifications / _handlers / task-update suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;
  let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
  let taskByQA: {
    task: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation']['tasks']['taskByAlice'];
    owner: CompleteScenarioType['users']['aliceQualifyingAccessor'];
  };
  let taskByNA: {
    task: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation']['tasks']['taskByPaul'];
    owner: CompleteScenarioType['users']['paulNeedsAssessor'];
  };

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    taskByQA = { task: innovation.tasks.taskByAlice, owner: scenario.users.aliceQualifyingAccessor };
    taskByNA = { task: innovation.tasks.taskByPaul, owner: scenario.users.paulNeedsAssessor };
  });

  describe.each([
    [
      ServiceRoleEnum.ACCESSOR as const,
      InnovationTaskStatusEnum.DONE,
      {
        toTaskOwner: 'TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT'
      }
    ],
    [
      ServiceRoleEnum.ACCESSOR as const,
      InnovationTaskStatusEnum.DECLINED,
      {
        toTaskOwner: 'TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT'
      }
    ],
    [
      ServiceRoleEnum.ASSESSMENT as const,
      InnovationTaskStatusEnum.DONE,
      {
        toTaskOwner: 'TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT'
      }
    ],
    [
      ServiceRoleEnum.ASSESSMENT as const,
      InnovationTaskStatusEnum.DECLINED,
      {
        toTaskOwner: 'TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT'
      }
    ]
  ])('Innovation owner updates task of %s to status %s', (taskOwnerRoleType, taskStatus, emailTemplates) => {
    let requestUser: DomainContextType;
    let handler: TaskUpdateHandler;

    let task: typeof taskByQA | typeof taskByNA;
    let taskOwnerRoleId: string;
    // let taskOwnerUnitName: string;
    let basePath: string;

    let declinedReason: string | undefined;

    beforeAll(async () => {
      // mock innovation info
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        name: innovation.name,
        ownerId: scenario.users.johnInnovator.id,
        ownerIdentityId: scenario.users.johnInnovator.identityId
      });
      // mock innovation owner info
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'));
      // mock request user info
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'));

      if (taskOwnerRoleType === ServiceRoleEnum.ACCESSOR) {
        task = taskByQA;
        taskOwnerRoleId = taskByQA.owner.roles.qaRole.id;
        // taskOwnerUnitName = taskByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.name;
        basePath = 'accessor';
      } else {
        task = taskByNA;
        taskOwnerRoleId = taskByNA.owner.roles.assessmentRole.id;
        // taskOwnerUnitName = 'needs assessment';
        basePath = 'assessment';
      }

      // mock task info
      jest.spyOn(RecipientsService.prototype, 'taskInfoWithOwner').mockResolvedValueOnce({
        id: task.task.id,
        displayId: task.task.displayId,
        status: taskStatus,
        owner: DTOsHelper.getRecipientUser(task.owner),
        ...(taskOwnerRoleType === ServiceRoleEnum.ACCESSOR && {
          organisationUnit: {
            id: taskByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
            name: taskByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
            acronym: taskByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
          }
        })
      });

      requestUser = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole');

      declinedReason = taskStatus === InnovationTaskStatusEnum.DECLINED ? randText({ charCount: 20 }) : undefined;

      handler = new TaskUpdateHandler(
        requestUser,
        {
          innovationId: innovation.id,
          task: { ...task.task, status: taskStatus },
          ...(declinedReason && { comment: declinedReason })
        },
        MocksHelper.mockContext()
      );

      await handler.run();
    });

    it('Should send email to task owner', () => {
      const expectedEmail = handler.emails.find(email => email.templateId === emailTemplates.toTaskOwner);

      expect(expectedEmail).toMatchObject({
        templateId: emailTemplates.toTaskOwner,
        notificationPreferenceType: NotificationCategoryEnum.TASK,
        to: DTOsHelper.getRecipientUser(task.owner),
        params: {
          innovator_name: scenario.users.johnInnovator.name,
          innovation_name: innovation.name,
          ...(declinedReason && {
            declined_TASK_reason: declinedReason
          }),
          action_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':basePath/innovations/:innovationId/tasks/:taskId')
            .setPathParams({
              basePath,
              innovationId: innovation.id,
              taskId: task.task.id
            })
            .buildUrl()
        }
      });
    });

    it('Should send inApp to task owner', () => {
      const expectedInApp = handler.inApp.find(inApp => inApp.userRoleIds.includes(taskOwnerRoleId));

      expect(expectedInApp).toMatchObject({
        innovationId: innovation.id,
        context: {
          type: NotificationContextTypeEnum.TASK,
          detail: NotificationContextDetailEnum.TASK_UPDATE,
          id: task.task.id
        },
        userRoleIds: [taskOwnerRoleId],
        params: {
          taskCode: task.task.displayId,
          taskStatus: taskStatus,
          section: task.task.section
        }
      });
    });

    it('Should send confirmation inApp to innovator', () => {
      const expectedInApp = handler.inApp.find(inApp => inApp.userRoleIds.includes(requestUser.currentRole.id));

      expect(expectedInApp).toMatchObject({
        innovationId: innovation.id,
        context: {
          type: NotificationContextTypeEnum.TASK,
          detail: NotificationContextDetailEnum.TASK_UPDATE,
          id: task.task.id
        },
        userRoleIds: [requestUser.currentRole.id],
        params: {
          taskCode: task.task.displayId,
          taskStatus: taskStatus,
          section: task.task.section
        }
      });
    });
  });

  describe.each([
    [ServiceRoleEnum.ACCESSOR as const, InnovationTaskStatusEnum.DONE],
    [ServiceRoleEnum.ACCESSOR as const, InnovationTaskStatusEnum.DECLINED],
    [ServiceRoleEnum.ASSESSMENT as const, InnovationTaskStatusEnum.DONE],
    [ServiceRoleEnum.ASSESSMENT as const, InnovationTaskStatusEnum.DECLINED]
  ])(
    'Innovation collaborator updates task of %s to status %s',
    (
      taskOwnerRoleType: ServiceRoleEnum.ACCESSOR | ServiceRoleEnum.ASSESSMENT,
      taskStatus: InnovationTaskStatusEnum
    ) => {
      let handler: TaskUpdateHandler;

      let task: typeof taskByQA | typeof taskByNA;
      let taskOwnerUnitName: string;

      let declinedReason: string | undefined;

      beforeAll(async () => {
        // mock innovation info
        jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
          name: innovation.name,
          ownerId: scenario.users.johnInnovator.id,
          ownerIdentityId: scenario.users.johnInnovator.identityId
        });
        // mock innovation owner info
        jest
          .spyOn(RecipientsService.prototype, 'getUsersRecipient')
          .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'));
        // mock request user info
        jest
          .spyOn(RecipientsService.prototype, 'getUsersRecipient')
          .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'));

        if (taskOwnerRoleType === ServiceRoleEnum.ACCESSOR) {
          task = taskByQA;
          taskOwnerUnitName = taskByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.name;
        } else {
          task = taskByNA;
          taskOwnerUnitName = 'needs assessment';
        }

        // mock task info
        jest.spyOn(RecipientsService.prototype, 'taskInfoWithOwner').mockResolvedValueOnce({
          id: task.task.id,
          displayId: task.task.displayId,
          status: taskStatus,
          owner: DTOsHelper.getRecipientUser(task.owner),
          ...(taskOwnerRoleType === ServiceRoleEnum.ACCESSOR && {
            organisationUnit: {
              id: taskByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              name: taskByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              acronym: taskByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
            }
          })
        });

        MocksHelper.mockIdentityServiceGetUserInfo(task.owner);

        MocksHelper.mockIdentityServiceGetUserInfo(scenario.users.janeInnovator);
        jest
          .spyOn(RecipientsService.prototype, 'usersIdentityInfo')
          .mockResolvedValueOnce(DTOsHelper.getIdentityUserInfo(task.owner));

        declinedReason = taskStatus === InnovationTaskStatusEnum.DECLINED ? randText({ charCount: 20 }) : undefined;

        const requestUser = DTOsHelper.getUserRequestContext(scenario.users.janeInnovator, 'innovatorRole');

        handler = new TaskUpdateHandler(
          requestUser,
          {
            innovationId: innovation.id,
            task: { ...task.task, status: taskStatus },
            ...(declinedReason && { comment: declinedReason })
          },
          MocksHelper.mockContext()
        );

        await handler.run();
      });

      it('Should send email to innovation owner', () => {
        const emailTemplate = 'TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS';
        const expectedEmail = handler.emails.find(email => email.templateId === emailTemplate);

        expect(expectedEmail).toMatchObject({
          templateId: emailTemplate,
          notificationPreferenceType: NotificationCategoryEnum.TASK,
          to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          params: {
            collaborator_name: scenario.users.janeInnovator.name,
            accessor_name: task.owner.name,
            unit_name: taskOwnerUnitName,
            action_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/tasks/:taskId')
              .setPathParams({
                innovationId: innovation.id,
                taskId: task.task.id
              })
              .buildUrl()
          }
        });
      });

      it('Should send confirmation inApp to innovation owner', () => {
        const expectedInApp = handler.inApp.find(inApp =>
          inApp.userRoleIds.includes(scenario.users.johnInnovator.roles.innovatorRole.id)
        );

        expect(expectedInApp).toMatchObject({
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.TASK,
            detail: NotificationContextDetailEnum.TASK_UPDATE,
            id: task.task.id
          },
          userRoleIds: [scenario.users.johnInnovator.roles.innovatorRole.id],
          params: {
            taskCode: task.task.displayId,
            taskStatus: taskStatus,
            section: task.task.section
          }
        });
      });
    }
  );

  describe.each([
    [ServiceRoleEnum.ACCESSOR as const, InnovationTaskStatusEnum.CANCELLED, 'TA05_TASK_CANCELLED_TO_INNOVATOR'],
    [ServiceRoleEnum.ACCESSOR as const, InnovationTaskStatusEnum.OPEN, 'TA06_TASK_REOPEN_TO_INNOVATOR'],
    [ServiceRoleEnum.ASSESSMENT as const, InnovationTaskStatusEnum.CANCELLED, 'TA05_TASK_CANCELLED_TO_INNOVATOR'],
    [ServiceRoleEnum.ASSESSMENT as const, InnovationTaskStatusEnum.OPEN, 'TA06_TASK_REOPEN_TO_INNOVATOR']
  ])('%s updates task to status %s', (requestUserRoleType, taskStatus, emailTemplate) => {
    let requestTestUser:
      | CompleteScenarioType['users']['aliceQualifyingAccessor']
      | CompleteScenarioType['users']['paulNeedsAssessor'];
    let handler: TaskUpdateHandler;

    let task: typeof taskByQA | typeof taskByNA;
    let requestUserUnitName: string;

    beforeAll(async () => {
      // mock innovation info
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        name: innovation.name,
        ownerId: scenario.users.johnInnovator.id,
        ownerIdentityId: scenario.users.johnInnovator.identityId
      });
      // mock innovation owner info
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'));
      if (requestUserRoleType === ServiceRoleEnum.ACCESSOR) {
        requestTestUser = scenario.users.aliceQualifyingAccessor;
        task = taskByQA;
        requestUserUnitName = taskByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.name;
      } else {
        requestTestUser = scenario.users.paulNeedsAssessor;
        task = taskByNA;
        requestUserUnitName = 'needs assessment';
      }

      MocksHelper.mockIdentityServiceGetUserInfo(requestTestUser);

      // mock task info
      jest.spyOn(RecipientsService.prototype, 'taskInfoWithOwner').mockResolvedValueOnce({
        id: task.task.id,
        displayId: task.task.displayId,
        status: taskStatus,
        owner: DTOsHelper.getRecipientUser(task.owner),
        ...(requestUserRoleType === ServiceRoleEnum.ACCESSOR && {
          organisationUnit: {
            id: taskByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
            name: taskByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
            acronym: taskByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
          }
        })
      });

      const requestUser = DTOsHelper.getUserRequestContext(requestTestUser);

      handler = new TaskUpdateHandler(
        requestUser,
        {
          innovationId: innovation.id,
          task: { ...task.task, status: taskStatus }
        },
        MocksHelper.mockContext()
      );

      await handler.run();
    });
    it('Should send email to innovation owner', () => {
      const expectedEmail = handler.emails.find(email => email.templateId === emailTemplate);

      expect(expectedEmail).toMatchObject({
        templateId: emailTemplate,
        notificationPreferenceType: NotificationCategoryEnum.TASK,
        to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
        params: {
          accessor_name: task.owner.name,
          unit_name: requestUserUnitName,
          action_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/tasks/:taskId')
            .setPathParams({
              innovationId: innovation.id,
              taskId: task.task.id
            })
            .buildUrl()
        }
      });
    });

    it('Should send inApp to innovation owner', () => {
      const expectedInApp = handler.inApp.find(inApp =>
        inApp.userRoleIds.includes(scenario.users.johnInnovator.roles.innovatorRole.id)
      );

      expect(expectedInApp).toMatchObject({
        innovationId: innovation.id,
        context: {
          type: NotificationContextTypeEnum.TASK,
          detail: NotificationContextDetailEnum.TASK_UPDATE,
          id: task.task.id
        },
        userRoleIds: [scenario.users.johnInnovator.roles.innovatorRole.id],
        params: {
          taskCode: task.task.displayId,
          taskStatus: taskStatus,
          section: task.task.section
        }
      });
    });
  });

  it('Should not send any email/inApp if the reques user has an invalid type', async () => {
    // mock innovation info
    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      name: innovation.name,
      ownerId: scenario.users.johnInnovator.id,
      ownerIdentityId: scenario.users.johnInnovator.identityId
    });
    // mock innovation owner info
    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'));
    const handler = new TaskUpdateHandler(
      DTOsHelper.getUserRequestContext(scenario.users.allMighty),
      {
        innovationId: innovation.id,
        task: {
          ...scenario.users.johnInnovator.innovations.johnInnovation.tasks.taskByAlice,
          status: InnovationTaskStatusEnum.CANCELLED
        }
      },
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toHaveLength(0);
    expect(handler.inApp).toHaveLength(0);
  });

  it('Should not send any email/inApp if the task is updated to an invalid status', async () => {
    // mock innovation info
    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      name: innovation.name,
      ownerId: scenario.users.johnInnovator.id,
      ownerIdentityId: scenario.users.johnInnovator.identityId
    });
    // mock innovation owner info
    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'));

    const handler = new TaskUpdateHandler(
      DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
      {
        innovationId: innovation.id,
        task: {
          ...scenario.users.johnInnovator.innovations.johnInnovation.tasks.taskByAlice,
          status: InnovationTaskStatusEnum.CANCELLED
        }
      },
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toHaveLength(0);
    expect(handler.inApp).toHaveLength(0);
  });
});
