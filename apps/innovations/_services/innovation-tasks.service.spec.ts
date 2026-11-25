import { container } from '../_config';

import {
  InnovationEntity,
  InnovationTaskEntity,
  InnovationThreadEntity,
  UserEntity
} from '@innovations/shared/entities';
import {
  ActivityEnum,
  InnovationStatusEnum,
  InnovationTaskStatusEnum,
  NotifierTypeEnum,
  ServiceRoleEnum,
  UserStatusEnum
} from '@innovations/shared/enums';
import {
  ForbiddenError,
  InnovationErrorsEnum,
  NotFoundError,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import { TranslationHelper } from '@innovations/shared/helpers';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import { DomainInnovationsService, NotifierService } from '@innovations/shared/services';
import { TestsHelper } from '@innovations/shared/tests';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { randNumber, randText, randUuid } from '@ngneat/falso';
import { EntityManager, IsNull } from 'typeorm';
import { InnovationTasksService } from './innovation-tasks.service';
import { InnovationThreadsService } from './innovation-threads.service';
import SYMBOLS from './symbols';

describe('Innovation Tasks Suite', () => {
  let sut: InnovationTasksService;

  let em: EntityManager;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  // Setup global mocks for these tests
  const activityLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog');
  const notifierSendSpy = jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

  // Only spying the methods but not the implementation since there's an interdependency between the two
  const createThreadOrMessageSpy = jest.spyOn(InnovationThreadsService.prototype, 'createThreadOrMessage');
  const createThreadMessage = jest.spyOn(InnovationThreadsService.prototype, 'createThreadMessage');
  const linkMessageSpy = jest.spyOn(InnovationTasksService.prototype as any, 'linkMessage');

  beforeAll(async () => {
    sut = container.get<InnovationTasksService>(SYMBOLS.InnovationTasksService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
    activityLogSpy.mockClear();
    notifierSendSpy.mockClear();
    createThreadOrMessageSpy.mockClear();
    createThreadMessage.mockClear();
    linkMessageSpy.mockClear();
  });

  describe('createTask', () => {
    const accessor = scenario.users.aliceQualifyingAccessor;
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('should create a task', async () => {
      const description = randText();
      const task = await sut.createTask(
        DTOsHelper.getUserRequestContext(accessor),
        innovation.id,
        {
          description,
          section: 'INNOVATION_DESCRIPTION'
        },
        em
      );

      // assert response
      expect(task).toMatchObject({
        id: expect.any(String)
      });

      // assert db
      const dbTask = await em
        .createQueryBuilder(InnovationTaskEntity, 'task')
        .innerJoinAndSelect('task.createdByUserRole', 'createdByRole')
        .innerJoinAndSelect('task.updatedByUserRole', 'updatedByRole')
        .innerJoinAndSelect('task.innovationSection', 'innovationSection')
        .where('task.id = :taskId', { taskId: task.id })
        .getOneOrFail();

      expect(dbTask).toMatchObject({
        id: task.id,
        displayId: expect.any(String), // TODO: check displayId but this will hopefully change soon, if it doesn't put in a function to generate it
        status: InnovationTaskStatusEnum.OPEN,
        innovationSection: { section: 'INNOVATION_DESCRIPTION' },
        createdBy: accessor.id,
        createdByUserRole: { id: accessor.roles.qaRole.id },
        updatedBy: accessor.id,
        updatedByUserRole: { id: accessor.roles.qaRole.id }
      });
    });

    it('should sent notification', async () => {
      const context = DTOsHelper.getUserRequestContext(accessor);
      const task = await sut.createTask(
        context,
        innovation.id,
        {
          description: randText(),
          section: 'INNOVATION_DESCRIPTION'
        },
        em
      );

      expect(notifierSendSpy).toHaveBeenCalledWith(context, NotifierTypeEnum.TASK_CREATION, {
        innovationId: innovation.id,
        task: { id: task.id }
      });
    });

    it('should add activity log', async () => {
      const context = DTOsHelper.getUserRequestContext(accessor);
      const description = randText();
      const task = await sut.createTask(
        context,
        innovation.id,
        {
          description,
          section: 'INNOVATION_DESCRIPTION'
        },
        em
      );

      expect(activityLogSpy).toHaveBeenCalledWith(
        expect.any(EntityManager),
        { innovationId: innovation.id, activity: ActivityEnum.TASK_CREATION, domainContext: context },
        {
          sectionId: 'INNOVATION_DESCRIPTION',
          taskId: task.id,
          comment: { value: description },
          role: context.currentRole.role
        }
      );
    });

    it('should create thread and message', async () => {
      const context = DTOsHelper.getUserRequestContext(accessor);
      const description = randText();
      const task = await sut.createTask(
        context,
        innovation.id,
        {
          description,
          section: 'INNOVATION_DESCRIPTION'
        },
        em
      );

      // TODO this can be improved when we link the message to the task
      const thread = await em
        .createQueryBuilder(InnovationThreadEntity, 'thread')
        .innerJoinAndSelect('thread.messages', 'message')
        .where('thread.contextId = :taskId', { taskId: task.id })
        .getMany();
      expect(thread).toHaveLength(1);
      expect(await thread[0]?.messages).toHaveLength(1);

      const link = await em.query('SELECT * FROM innovation_task_message WHERE innovation_task_id = @0', [task.id]);
      expect(link).toHaveLength(1);
    });

    it.each([
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, DTOsHelper.getUserRequestContext(scenario.users.scottQualifyingAccessor)],
      [ServiceRoleEnum.ACCESSOR, DTOsHelper.getUserRequestContext(scenario.users.jamieMadroxAccessor, 'aiRole')]
    ])('as %s should not create a task if organisation unit is not supporting innovation', async (_role, user) => {
      await expect(() =>
        sut.createTask(
          user,
          scenario.users.adamInnovator.innovations.adamInnovation.id,
          {
            description: randText(),
            section: 'INNOVATION_DESCRIPTION'
          },
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND));
    });

    it('as assessment should create a task without concern for support', async () => {
      const task = await sut.createTask(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        scenario.users.ottoOctaviusInnovator.innovations.brainComputerInterfaceInnovation.id,
        {
          description: randText(),
          section: 'INNOVATION_DESCRIPTION'
        },
        em
      );

      expect(task.id).toBeDefined();
    });

    it(`should not create a task for an innovation that doesn't exist`, async () => {
      await expect(() =>
        sut.createTask(
          DTOsHelper.getUserRequestContext(accessor),
          randUuid(),
          {
            description: randText(),
            section:
              CurrentCatalogTypes.InnovationSections[
                randNumber({ min: 0, max: CurrentCatalogTypes.InnovationSections.length - 1 })
              ]!
          },
          em
        )
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND));
    });

    it(`should not create a task for a section that doesn't exist`, async () => {
      await expect(() =>
        sut.createTask(
          DTOsHelper.getUserRequestContext(accessor),
          innovation.id,
          {
            description: randText(),
            section: randText() as CurrentCatalogTypes.InnovationSections
          },
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SECTION_NOT_FOUND));
    });
  });

  describe('getTasksList', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const innovation2 = scenario.users.adamInnovator.innovations.adamInnovation;
    const allTasks = [
      innovation.tasks.taskByBart,
      innovation.tasks.taskByPaul,
      innovation.tasks.taskByAliceOpen,
      innovation.tasks.taskByAlice,
      innovation2.tasks.adamInnovationTaskBySean,
      innovation2.tasks.adamInnovationDoneTask
    ];

    const getUnreadNotificationsMock = jest
      .spyOn(DomainInnovationsService.prototype, 'getUnreadNotifications')
      .mockImplementation((_userId, contextIds) => {
        return Promise.resolve(
          contextIds.map(contextId => ({
            contextId,
            contextType: 'TASK',
            id: randUuid(),
            params: {}
          }))
        );
      });

    afterAll(() => {
      getUnreadNotificationsMock.mockRestore();
    });

    it('should list all tasks as an innovator for his innovation', async () => {
      const tasks = await sut.getTasksList(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        { innovationId: innovation.id, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(tasks).toBeDefined();
    });

    it('should list all tasks created by NA as a NA', async () => {
      const naTask = innovation.tasks.taskByPaul;
      const naTask2 = innovation2.tasks.adamInnovationTaskBySean;

      const tasks = await sut.getTasksList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { createdByMyUnit: true, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(tasks.count).toBe(2);
      expect(tasks.data).toMatchObject([
        {
          id: naTask2.id,
          displayId: naTask2.displayId,
          innovation: { id: innovation2.id, name: innovation2.name },
          status: naTask2.status,
          section: naTask2.section,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          updatedBy: {
            name: scenario.users.seanNeedsAssessor.name,
            displayTag: TranslationHelper.translate('TEAMS.ASSESSMENT')
          },
          createdBy: {
            name: scenario.users.seanNeedsAssessor.name,
            displayTag: TranslationHelper.translate('TEAMS.ASSESSMENT')
          },
          sameOrganisation: true
        },
        {
          id: naTask.id,
          displayId: naTask.displayId,
          innovation: { id: innovation.id, name: innovation.name },
          status: naTask.status,
          section: naTask.section,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          updatedBy: {
            name: scenario.users.paulNeedsAssessor.name,
            displayTag: TranslationHelper.translate('TEAMS.ASSESSMENT')
          },
          createdBy: {
            name: scenario.users.paulNeedsAssessor.name,
            displayTag: TranslationHelper.translate('TEAMS.ASSESSMENT')
          },
          sameOrganisation: true
        }
      ]);
    });

    it('should list all tasks created by NA and QA/A as a NA', async () => {
      const tasks = await sut.getTasksList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(tasks.count).toBe(allTasks.length);
    });

    it('should list all tasks created by QA/A as a QA/A', async () => {
      const task = innovation.tasks.taskByAlice;
      const task2 = innovation2.tasks.adamInnovationDoneTask;
      const task3 = innovation.tasks.taskByAliceOpen;
      const expected = [
        {
          id: task.id,
          displayId: task.displayId,
          innovation: { id: innovation.id, name: innovation.name },
          status: task.status,
          section: task.section,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          updatedBy: {
            name: scenario.users.aliceQualifyingAccessor.name,
            displayTag:
              scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
          },
          createdBy: {
            name: scenario.users.aliceQualifyingAccessor.name,
            displayTag:
              scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
          },
          sameOrganisation: true
        },
        {
          id: task2.id,
          displayId: task2.displayId,
          innovation: { id: innovation2.id, name: innovation2.name },
          status: task2.status,
          section: task2.section,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          updatedBy: { name: scenario.users.adamInnovator.name, displayTag: 'Owner' },
          createdBy: {
            name: scenario.users.aliceQualifyingAccessor.name,
            displayTag:
              scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
          },
          sameOrganisation: true
        },
        {
          id: task3.id,
          displayId: task3.displayId,
          innovation: { id: innovation.id, name: innovation.name },
          status: task3.status,
          section: task3.section,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          updatedBy: {
            name: scenario.users.johnInnovator.name,
            displayTag: 'Owner'
          },
          createdBy: {
            name: scenario.users.aliceQualifyingAccessor.name,
            displayTag:
              scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
          },
          sameOrganisation: true
        }
      ];

      const tasks = await sut.getTasksList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        { createdByMyUnit: true, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(tasks.count).toBe(3);
      expect(tasks.data.length).toBe(expected.length);
      for (const expectedTask of expected) {
        expect(tasks.data).toContainEqual(expect.objectContaining(expectedTask));
      }
    });

    it('should list all tasks created by NA and QA/A as a QA/A', async () => {
      const tasks = await sut.getTasksList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        { fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(tasks.count).toBe(allTasks.length);
    });

    it('should list all tasks that match an innovation name', async () => {
      const tasks = await sut.getTasksList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { createdByMyUnit: true, innovationName: innovation.name, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      // Test was picking more than 1 innovation sometimes, so fetching from the db to make sure there are no repeated names
      const dbTasks = await em.getRepository(InnovationTaskEntity).find({
        where: { innovationSection: { innovation: { name: innovation.name } }, innovationSupport: { id: IsNull() } } // the condition has more than this complexity but this is enough to pinpoint the scenario
      });
      expect(tasks.count).toBe(dbTasks.length);
    });

    it('should list no tasks that match an innovation name when no match', async () => {
      const tasks = await sut.getTasksList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { createdByMyUnit: true, innovationName: randText(), fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(tasks.count).toBe(0);
      expect(tasks.data).toHaveLength(0);
    });

    it('should list all tasks from an innovation in status NEEDS_ASSESSMENT', async () => {
      await em
        .getRepository(InnovationEntity)
        .update({ id: innovation.id }, { status: InnovationStatusEnum.NEEDS_ASSESSMENT });

      const tasks = await sut.getTasksList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { createdByMyUnit: true, innovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT], fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(tasks.count).toBe(1);
      expect(tasks.data[0]).toHaveProperty('id', innovation.tasks.taskByPaul.id);
    });

    it('should list all tasks that are for section INNOVATION_DESCRIPTION', async () => {
      const task2 = scenario.users.adamInnovator.innovations.adamInnovation.tasks.adamInnovationTaskBySean;
      const tasks = await sut.getTasksList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { createdByMyUnit: true, sections: ['INNOVATION_DESCRIPTION'], fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(tasks.count).toBe(2);
      expect(tasks.data.filter(a => a.section === 'INNOVATION_DESCRIPTION').map(a => a.id)).toEqual(
        expect.arrayContaining([innovation.tasks.taskByPaul.id, task2.id])
      );
    });

    it('should list all tasks that are in COMPLETED status', async () => {
      const tasks = await sut.getTasksList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        { status: [InnovationTaskStatusEnum.DONE], fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(tasks.count).toBe(2);
      expect(tasks.data).toMatchObject([
        {
          id: innovation2.tasks.adamInnovationDoneTask.id,
          status: InnovationTaskStatusEnum.DONE
        },
        {
          id: innovation.tasks.taskByAlice.id,
          status: InnovationTaskStatusEnum.DONE
        }
      ]);
    });

    it('should list all tasks that are created by me as a NA', async () => {
      const expected = innovation.tasks.taskByPaul;

      const tasks = await sut.getTasksList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { createdByMe: true, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(tasks.count).toBe(1);
      expect(tasks.data).toMatchObject([
        {
          id: expected.id,
          createdBy: {
            name: scenario.users.paulNeedsAssessor.name,
            displayTag: TranslationHelper.translate('TEAMS.ASSESSMENT')
          }
        }
      ]);
    });

    it('should list all tasks that are created by me as a QA/A', async () => {
      const tasks = await sut.getTasksList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        { createdByMe: true, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(tasks.count).toBe(3);
      expect(tasks.data).toMatchObject([
        {
          createdBy: {
            name: scenario.users.aliceQualifyingAccessor.name,
            displayTag:
              scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
          }
        },
        {
          createdBy: {
            name: scenario.users.aliceQualifyingAccessor.name,
            displayTag:
              scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
          }
        },
        {
          createdBy: {
            name: scenario.users.aliceQualifyingAccessor.name,
            displayTag:
              scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
          }
        }
      ]);
    });

    it('should list all tasks that are created by me as a QA/A (none)', async () => {
      const tasks = await sut.getTasksList(
        DTOsHelper.getUserRequestContext(scenario.users.jamieMadroxAccessor, 'healthAccessorRole'),
        { createdByMe: true, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );
      expect(tasks.count).toBe(0);
      expect(tasks.data).toHaveLength(0);
    });

    it('should list all tasks as an innovator for his innovation with unread notifications', async () => {
      const tasks = await sut.getTasksList(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        { innovationId: innovation.id, fields: ['notifications'] },
        { order: {}, skip: 0, take: 10 },
        em
      );

      expect(tasks.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: innovation.tasks.taskByBart.id,
            notifications: 1
          }),
          expect.objectContaining({
            id: innovation.tasks.taskByPaul.id,
            notifications: 1
          }),
          expect.objectContaining({
            id: innovation.tasks.taskByAliceOpen.id,
            notifications: 1
          }),
          expect.objectContaining({
            id: innovation.tasks.taskByAlice.id,
            notifications: 1
          })
        ])
      );
    });

    it.each(['displayId', 'section', 'innovationName', 'createdAt', 'updatedAt', 'status'] as const)(
      'should list all tasks sorted by %s ASC',
      async order => {
        // Update the dates to make sure they are different
        if (order === 'createdAt' || order === 'updatedAt') {
          await em.query(`
            UPDATE "innovation_task" SET "created_at" = DATEADD(day, (ABS(CHECKSUM(NEWID())) % 65530), 0), "updated_at" = DATEADD(day, (ABS(CHECKSUM(NEWID())) % 65530), 0);
          `);
        }

        const tasks = await sut.getTasksList(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          { fields: [] },
          { order: { [order]: 'ASC' }, skip: 0, take: 10 },
          em
        );

        // This test could be improved if we improve the scenario, otherwise it will be to difficult with the current data
        expect(tasks.count).toBe(allTasks.length);
        const data = tasks.data.map(a =>
          order === 'innovationName'
            ? a.innovation.name
            : order === 'createdAt' || order === 'updatedAt'
              ? a[order].toISOString()
              : a[order]
        );
        expect(data).toEqual([...data].sort());
      }
    );

    it.each(['displayId', 'section', 'innovationName', 'createdAt', 'updatedAt', 'status'] as const)(
      'should list all tasks sorted by %s DESC',
      async order => {
        // Update the dates to make sure they are different
        if (order === 'createdAt' || order === 'updatedAt') {
          await em.query(`
            UPDATE "innovation_task" SET "created_at" = DATEADD(day, (ABS(CHECKSUM(NEWID())) % 65530), 0), "updated_at" = DATEADD(day, (ABS(CHECKSUM(NEWID())) % 65530), 0);
          `);
        }

        const tasks = await sut.getTasksList(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          { fields: [] },
          { order: { [order]: 'DESC' }, skip: 0, take: 10 },
          em
        );

        // This test could be improved if we improve the scenario, otherwise it will be to difficult with the current data
        expect(tasks.count).toBe(allTasks.length);
        const data = tasks.data.map(a =>
          order === 'innovationName'
            ? a.innovation.name
            : order === 'createdAt' || order === 'updatedAt'
              ? a[order].toISOString()
              : a[order]
        );
        expect(data).toEqual([...data].sort().reverse());
      }
    );

    it('should order by createdAt if unknown order provided (should not happen)', async () => {
      const tasks = await sut.getTasksList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { fields: [] },
        { order: { unknown: 'DESC' } as any, skip: 0, take: 10 },
        em
      );

      // This test could be improved if we improve the scenario, otherwise it will be to difficult with the current data
      expect(tasks.count).toBe(allTasks.length);
    });

    it('should return task even if created/updated by deleted user', async () => {
      await em
        .getRepository(UserEntity)
        .update({ id: scenario.users.aliceQualifyingAccessor.id }, { status: UserStatusEnum.DELETED });
      const tasks = await sut.getTasksList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { fields: [] },
        { order: { createdAt: 'DESC' } as any, skip: 0, take: 10 },
        em
      );

      expect(tasks.count).toBe(allTasks.length);
      expect(tasks.data).toEqual(
        expect.arrayContaining(
          allTasks.map(a =>
            expect.objectContaining({
              id: a.id,
              createdBy: expect.objectContaining({
                name: [
                  scenario.users.johnInnovator.innovations.johnInnovation.tasks.taskByAlice.id,
                  scenario.users.johnInnovator.innovations.johnInnovation.tasks.taskByAliceOpen.id,
                  scenario.users.adamInnovator.innovations.adamInnovation.tasks.adamInnovationDoneTask.id
                ].includes(a.id)
                  ? '[deleted user]'
                  : expect.not.stringMatching(/\[deleted user\]/)
              }),
              updatedBy: expect.objectContaining({
                name: [scenario.users.johnInnovator.innovations.johnInnovation.tasks.taskByAlice.id].includes(a.id)
                  ? '[deleted user]'
                  : expect.not.stringMatching(/\[deleted user\]/)
              })
            })
          )
        )
      );
    });
  });

  describe('getTaskInfo', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it.each([
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, innovation.tasks.taskByAlice, scenario.users.aliceQualifyingAccessor],
      [ServiceRoleEnum.ASSESSMENT, innovation.tasks.taskByPaul, scenario.users.paulNeedsAssessor]
    ])('should return information about a task created by %s', async (role, task, user) => {
      const res = await sut.getTaskInfo(DTOsHelper.getUserRequestContext(user), task.id, em);
      const displayTag =
        role === ServiceRoleEnum.ASSESSMENT
          ? TranslationHelper.translate('TEAMS.ASSESSMENT')
          : scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name;

      expect(res).toMatchObject({
        id: task.id,
        displayId: task.displayId,
        status: task.status,
        section: 'INNOVATION_DESCRIPTION',
        descriptions: [
          {
            createdAt: expect.any(Date),
            description: expect.any(String),
            displayTag: displayTag,
            name: user.name
          }
        ],
        sameOrganisation: true,
        threadId: expect.any(String), // not persisting the thread id in the scenario
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        updatedBy: {
          name: user.name,
          displayTag: displayTag
        },
        createdBy: {
          name: user.name,
          displayTag: displayTag
        }
      });
    });

    it('should return updatedBy Owner if status is SUBMITTED by owner', async () => {
      const res = await sut.getTaskInfo(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.tasks.taskByAliceOpen.id,
        em
      );
      expect(res.updatedBy.displayTag).toBe('Owner');
    });

    it('should return updatedBy Collaborator if status is SUBMITTED by other innovator', async () => {
      await em.getRepository(InnovationTaskEntity).update(
        { id: innovation.tasks.taskByAliceOpen.id },
        {
          updatedBy: scenario.users.adamInnovator.id,
          updatedByUserRole: { id: scenario.users.adamInnovator.roles.innovatorRole.id }
        }
      );
      const res = await sut.getTaskInfo(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.tasks.taskByAliceOpen.id,
        em
      );
      expect(res.updatedBy.displayTag).toBe('Collaborator');
    });

    it("should return error when taskId doesn't exist", async () => {
      await expect(() =>
        sut.getTaskInfo(DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor), randUuid())
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_TASK_NOT_FOUND));
    });
  });

  describe('updateTaskAsAccessor', () => {
    const accessor = scenario.users.aliceQualifyingAccessor;
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const task = innovation.tasks.taskByAliceOpen;

    it('should update task from status OPEN to CANCELLED', async () => {
      await em.update(InnovationTaskEntity, { id: task.id }, { status: InnovationTaskStatusEnum.OPEN });

      const updateTask = await sut.updateTaskAsAccessor(
        DTOsHelper.getUserRequestContext(accessor),
        innovation.id,
        task.id,
        {
          status: InnovationTaskStatusEnum.CANCELLED,
          message: randText()
        },
        em
      );

      const dbtask = await em
        .createQueryBuilder(InnovationTaskEntity, 'tasks')
        .where('tasks.id = :taskId', { taskId: updateTask.id })
        .getOne();

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
      expect(updateTask.id).toBe(task.id);
      expect(dbtask!.status).toBe(InnovationTaskStatusEnum.CANCELLED);

      expect(linkMessageSpy).toHaveBeenCalled();
    });

    it('should update task from status DONE to OPEN', async () => {
      await em.update(InnovationTaskEntity, { id: task.id }, { status: InnovationTaskStatusEnum.DONE });

      const updateTask = await sut.updateTaskAsAccessor(
        DTOsHelper.getUserRequestContext(accessor),
        innovation.id,
        task.id,
        {
          status: InnovationTaskStatusEnum.OPEN,
          message: randText()
        },
        em
      );

      const dbTask = await em
        .createQueryBuilder(InnovationTaskEntity, 'tasks')
        .where('tasks.id = :taskId', { taskId: updateTask.id })
        .getOne();

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
      expect(updateTask.id).toBe(task.id);
      expect(dbTask!.status).toBe(InnovationTaskStatusEnum.OPEN);

      expect(linkMessageSpy).toHaveBeenCalled();
    });

    it("should not update if task doesn't exist", async () => {
      await expect(() =>
        sut.updateTaskAsAccessor(DTOsHelper.getUserRequestContext(accessor), innovation.id, randUuid(), {
          status: InnovationTaskStatusEnum.OPEN,
          message: randText()
        })
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_TASK_NOT_FOUND));
    });

    it('should update if the task is created by someone on his organisation unit', async () => {
      const res = await sut.updateTaskAsAccessor(
        DTOsHelper.getUserRequestContext(scenario.users.jamieMadroxAccessor, 'healthAccessorRole'),
        innovation.id,
        task.id,
        {
          status: InnovationTaskStatusEnum.CANCELLED,
          message: randText()
        },
        em
      );

      expect(res.id).toBe(task.id);
    });

    it('should not be update if the task is not created by someone on his organisation unit', async () => {
      await expect(() =>
        sut.updateTaskAsAccessor(
          DTOsHelper.getUserRequestContext(scenario.users.jamieMadroxAccessor, 'aiRole'),
          innovation.id,
          task.id,
          {
            status: InnovationTaskStatusEnum.CANCELLED,
            message: randText()
          },
          em
        )
      ).rejects.toThrow(new ForbiddenError(InnovationErrorsEnum.INNOVATION_TASK_FROM_DIFFERENT_UNIT));
    });
  });

  describe('updateTaskAsNeedsAccessor', () => {
    const na = scenario.users.paulNeedsAssessor;
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const task = innovation.tasks.taskByPaul;

    it('should update task from status OPEN to CANCELLED', async () => {
      await em.update(InnovationTaskEntity, { id: task.id }, { status: InnovationTaskStatusEnum.OPEN });

      const updateTask = await sut.updateTaskAsNeedsAccessor(
        DTOsHelper.getUserRequestContext(na),
        innovation.id,
        task.id,
        {
          status: InnovationTaskStatusEnum.CANCELLED,
          message: randText()
        },
        em
      );

      const dbTask = await em
        .createQueryBuilder(InnovationTaskEntity, 'tasks')
        .where('tasks.id = :taskId', { taskId: updateTask.id })
        .getOne();

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
      expect(updateTask.id).toBe(task.id);
      expect(dbTask!.status).toBe(InnovationTaskStatusEnum.CANCELLED);

      expect(linkMessageSpy).toHaveBeenCalled();
    });

    it('should update task from status DONE to OPEN', async () => {
      await em.update(InnovationTaskEntity, { id: task.id }, { status: InnovationTaskStatusEnum.DONE });

      const updateTask = await sut.updateTaskAsNeedsAccessor(
        DTOsHelper.getUserRequestContext(na),
        innovation.id,
        task.id,
        {
          status: InnovationTaskStatusEnum.OPEN,
          message: randText()
        },
        em
      );

      const dbTask = await em
        .createQueryBuilder(InnovationTaskEntity, 'tasks')
        .where('tasks.id = :taskId', { taskId: updateTask.id })
        .getOne();

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
      expect(updateTask.id).toBe(task.id);
      expect(dbTask!.status).toBe(InnovationTaskStatusEnum.OPEN);

      expect(linkMessageSpy).toHaveBeenCalled();
    });

    it('should update task from status OPEN to CANCELLED OPEN by other NA', async () => {
      await em.update(InnovationTaskEntity, { id: task.id }, { status: InnovationTaskStatusEnum.OPEN });

      const updateTask = await sut.updateTaskAsNeedsAccessor(
        DTOsHelper.getUserRequestContext(scenario.users.seanNeedsAssessor),
        innovation.id,
        task.id,
        {
          status: InnovationTaskStatusEnum.CANCELLED,
          message: randText()
        },
        em
      );

      const dbTask = await em
        .createQueryBuilder(InnovationTaskEntity, 'tasks')
        .where('tasks.id = :taskId', { taskId: updateTask.id })
        .getOne();

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
      expect(updateTask.id).toBe(task.id);
      expect(dbTask!.status).toBe(InnovationTaskStatusEnum.CANCELLED);
    });

    it("should not update if task doesn't exist", async () => {
      await expect(() =>
        sut.updateTaskAsNeedsAccessor(DTOsHelper.getUserRequestContext(na), innovation.id, randUuid(), {
          status: InnovationTaskStatusEnum.OPEN,
          message: randText()
        })
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_TASK_NOT_FOUND));
    });

    it('should not be updated if the task is in DONE status and the status that is being updated is not OPEN', async () => {
      await em.update(InnovationTaskEntity, { id: task.id }, { status: InnovationTaskStatusEnum.DONE });

      await expect(() =>
        sut.updateTaskAsNeedsAccessor(
          DTOsHelper.getUserRequestContext(na),
          innovation.id,
          task.id,
          {
            status: InnovationTaskStatusEnum.CANCELLED,
            message: randText()
          },
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TASK_WITH_UNPROCESSABLE_STATUS));
    });

    it('should not update if task is from an QA/A', async () => {
      await expect(() =>
        sut.updateTaskAsNeedsAccessor(
          DTOsHelper.getUserRequestContext(na),
          innovation.id,
          innovation.tasks.taskByAlice.id,
          {
            status: InnovationTaskStatusEnum.CANCELLED,
            message: randText()
          }
        )
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_TASK_NOT_FOUND));
    });
  });

  describe('updateTaskAsInnovator', () => {
    const innovator = scenario.users.johnInnovator;
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const naTask = innovation.tasks.taskByPaul;
    const qaTask = innovation.tasks.taskByAlice;

    it('should update task from status OPEN to DECLINED from a NA task', async () => {
      await em.update(InnovationTaskEntity, { id: naTask.id }, { status: InnovationTaskStatusEnum.OPEN });

      const updateTask = await sut.updateTaskAsInnovator(
        DTOsHelper.getUserRequestContext(innovator),
        innovation.id,
        naTask.id,
        {
          status: InnovationTaskStatusEnum.DECLINED,
          message: randText()
        },
        em
      );

      const dbTask = await em
        .createQueryBuilder(InnovationTaskEntity, 'tasks')
        .where('tasks.id = :taskId', { taskId: updateTask.id })
        .getOne();

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
      expect(createThreadMessage).toHaveBeenCalled();
      expect(updateTask.id).toBe(naTask.id);
      expect(dbTask!.status).toBe(InnovationTaskStatusEnum.DECLINED);

      expect(linkMessageSpy).toHaveBeenCalled();
    });

    it('should update task from status OPEN to DECLINED from a QA task', async () => {
      await em.update(InnovationTaskEntity, { id: qaTask.id }, { status: InnovationTaskStatusEnum.OPEN });

      const updateTask = await sut.updateTaskAsInnovator(
        DTOsHelper.getUserRequestContext(innovator),
        innovation.id,
        qaTask.id,
        {
          status: InnovationTaskStatusEnum.DECLINED,
          message: randText()
        },
        em
      );

      const dbTask = await em
        .createQueryBuilder(InnovationTaskEntity, 'tasks')
        .where('tasks.id = :taskId', { taskId: updateTask.id })
        .getOne();

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
      expect(createThreadMessage).toHaveBeenCalled();
      expect(updateTask.id).toBe(qaTask.id);
      expect(dbTask!.status).toBe(InnovationTaskStatusEnum.DECLINED);

      expect(linkMessageSpy).toHaveBeenCalled();
    });

    it("should not update if task doesn't exist", async () => {
      await expect(() =>
        sut.updateTaskAsInnovator(DTOsHelper.getUserRequestContext(innovator), innovation.id, randUuid(), {
          status: InnovationTaskStatusEnum.OPEN,
          message: randText()
        })
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_TASK_NOT_FOUND));
    });

    it('should not be updated if the task is not in the DONE status', async () => {
      await em.update(InnovationTaskEntity, { id: qaTask.id }, { status: InnovationTaskStatusEnum.DECLINED });
      await expect(() =>
        sut.updateTaskAsInnovator(
          DTOsHelper.getUserRequestContext(innovator),
          innovation.id,
          qaTask.id,
          {
            status: InnovationTaskStatusEnum.DONE,
            message: randText()
          },
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TASK_WITH_UNPROCESSABLE_STATUS));
    });
  });

  describe('getSaveTaskSubject', () => {
    const displayId = `T${randNumber()}`;
    it.each([
      ['INNOVATION_DESCRIPTION' as const, `Task (${displayId}) update section 1.1 (Description of innovation)`],
      [
        'UNDERSTANDING_OF_NEEDS' as const,
        `Task (${displayId}) update section 2.1 (Detailed understanding of needs and benefits)`
      ],
      ['EVIDENCE_OF_EFFECTIVENESS' as const, `Task (${displayId}) update section 2.2 (Evidence of impact and benefit)`],
      ['MARKET_RESEARCH' as const, `Task (${displayId}) update section 3.1 (Market research)`],
      ['CURRENT_CARE_PATHWAY' as const, `Task (${displayId}) update section 3.2 (Current care pathway)`],
      ['TESTING_WITH_USERS' as const, `Task (${displayId}) update section 4.1 (Testing with users)`],
      [
        'REGULATIONS_AND_STANDARDS' as const,
        `Task (${displayId}) update section 5.1 (Regulatory approvals, standards and certifications)`
      ],
      ['INTELLECTUAL_PROPERTY' as const, `Task (${displayId}) update section 5.2 (Intellectual property)`],
      ['REVENUE_MODEL' as const, `Task (${displayId}) update section 6.1 (Revenue model)`],
      ['COST_OF_INNOVATION' as const, `Task (${displayId}) update section 7.1 (Cost of your innovation)`],
      ['DEPLOYMENT' as const, `Task (${displayId}) update section 8.1 (Deployment)`]
    ])('should return the correct subject for %s', async (section, expected) => {
      const res = sut['getSaveTaskSubject'](displayId, section as any);
      expect(res).toBe(expected);
    });
  });
});
