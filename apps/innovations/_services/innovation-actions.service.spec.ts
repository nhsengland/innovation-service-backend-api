/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { container } from '../_config';

import {
  ActivityLogEntity,
  InnovationActionEntity,
  InnovationEntity,
  InnovationThreadEntity,
  InnovationThreadMessageEntity,
  UserEntity
} from '@innovations/shared/entities';
import {
  ActivityEnum,
  ActivityTypeEnum,
  InnovationActionStatusEnum,
  InnovationStatusEnum,
  NotificationContextTypeEnum,
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
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import { DomainInnovationsService, NotifierService } from '@innovations/shared/services';
import { TestsHelper } from '@innovations/shared/tests';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { randNumber, randText, randUuid } from '@ngneat/falso';
import { EntityManager } from 'typeorm';
import type { InnovationActionsService } from './innovation-actions.service';
import { InnovationThreadsService } from './innovation-threads.service';
import SYMBOLS from './symbols';

describe('Innovation Actions Suite', () => {
  let sut: InnovationActionsService;

  let em: EntityManager;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  // Setup global mocks for these tests
  const activityLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog');
  const notifierSendSpy = jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

  beforeAll(async () => {
    sut = container.get<InnovationActionsService>(SYMBOLS.InnovationActionsService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
    activityLogSpy.mockReset();
    notifierSendSpy.mockReset();
  });

  describe('createAction', () => {
    const accessor = scenario.users.aliceQualifyingAccessor;
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('should create an action', async () => {
      const description = randText();
      const action = await sut.createAction(
        DTOsHelper.getUserRequestContext(accessor),
        innovation.id,
        {
          description,
          section: 'INNOVATION_DESCRIPTION'
        },
        em
      );

      // assert response
      expect(action).toMatchObject({
        id: expect.any(String)
      });

      // assert db
      const dbAction = await em
        .createQueryBuilder(InnovationActionEntity, 'action')
        .innerJoinAndSelect('action.createdByUserRole', 'createdByRole')
        .innerJoinAndSelect('action.updatedByUserRole', 'updatedByRole')
        .innerJoinAndSelect('action.innovationSection', 'innovationSection')
        .where('action.id = :actionId', { actionId: action.id })
        .getOneOrFail();

      expect(dbAction).toMatchObject({
        id: action.id,
        description,
        displayId: expect.any(String), // TODO: check displayId but this will hopefully change soon, if it doesn't put in a function to generate it
        status: InnovationActionStatusEnum.REQUESTED,
        innovationSection: { section: 'INNOVATION_DESCRIPTION' },
        createdBy: accessor.id,
        createdByUserRole: { id: accessor.roles.qaRole.id },
        updatedBy: accessor.id,
        updatedByUserRole: { id: accessor.roles.qaRole.id }
      });
    });

    it('should sent notification', async () => {
      const context = DTOsHelper.getUserRequestContext(accessor);
      const action = await sut.createAction(
        context,
        innovation.id,
        {
          description: randText(),
          section: 'INNOVATION_DESCRIPTION'
        },
        em
      );

      expect(notifierSendSpy).toHaveBeenCalledWith(context, NotifierTypeEnum.ACTION_CREATION, {
        innovationId: innovation.id,
        action: { id: action.id, section: 'INNOVATION_DESCRIPTION' }
      });
    });

    it('should add activity log', async () => {
      const context = DTOsHelper.getUserRequestContext(accessor);
      const description = randText();
      const action = await sut.createAction(
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
        { innovationId: innovation.id, activity: ActivityEnum.ACTION_CREATION, domainContext: context },
        {
          sectionId: 'INNOVATION_DESCRIPTION',
          actionId: action.id,
          comment: { value: description },
          role: context.currentRole.role
        }
      );
    });

    it.each([
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, DTOsHelper.getUserRequestContext(scenario.users.scottQualifyingAccessor)],
      [ServiceRoleEnum.ACCESSOR, DTOsHelper.getUserRequestContext(scenario.users.jamieMadroxAccessor, 'aiRole')]
    ])('as %s should not create an action if organisation unit is not supporting innovation', async (_role, user) => {
      await expect(() =>
        sut.createAction(
          user,
          scenario.users.adamInnovator.innovations.adamInnovation.id,
          {
            description: randText(),
            section: 'INNOVATION_DESCRIPTION'
          },
          em
        )
      ).rejects.toThrowError(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND));
    });

    it('as assessment should create an action without concern for support', async () => {
      const action = await sut.createAction(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        scenario.users.ottoOctaviusInnovator.innovations.brainComputerInterfaceInnovation.id,
        {
          description: randText(),
          section: 'INNOVATION_DESCRIPTION'
        },
        em
      );

      expect(action.id).toBeDefined();
    });

    it(`should not create an action for an innovation that doesn't exist`, async () => {
      await expect(() =>
        sut.createAction(DTOsHelper.getUserRequestContext(accessor), randUuid(), {
          description: randText(),
          section:
            CurrentCatalogTypes.InnovationSections[
              randNumber({ min: 0, max: CurrentCatalogTypes.InnovationSections.length - 1 })
            ]!
        })
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND));
    });

    it(`should not create an action for a section that doesn't exist`, async () => {
      await expect(() =>
        sut.createAction(
          DTOsHelper.getUserRequestContext(accessor),
          innovation.id,
          {
            description: randText(),
            section: randText() as CurrentCatalogTypes.InnovationSections
          },
          em
        )
      ).rejects.toThrowError(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SECTION_NOT_FOUND));
    });
  });

  describe('getActionsList', () => {
    // TODO
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const innovation2 = scenario.users.adamInnovator.innovations.adamInnovation;
    const allActions = [
      innovation.actions.actionByBart,
      innovation.actions.actionByPaul,
      innovation.actions.actionByAliceSubmitted,
      innovation.actions.actionByAlice,
      innovation2.actions.adamInnovationActionByPaul,
      innovation2.actions.adamInnovationCompletedActionByAlice
    ];

    const getUnreadNotificationsMock = jest
      .spyOn(DomainInnovationsService.prototype, 'getUnreadNotifications')
      .mockImplementation((_userId, contextIds) => {
        return Promise.resolve(
          contextIds.map(contextId => ({
            contextId,
            contextType: NotificationContextTypeEnum.ACTION,
            id: randUuid(),
            params: {}
          }))
        );
      });

    afterAll(() => {
      getUnreadNotificationsMock.mockRestore();
    });

    it('should list all actions as an innovator for his innovation', async () => {
      const actions = await sut.getActionsList(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        { innovationId: innovation.id, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 }
      );

      expect(actions).toBeDefined();
    });

    it('should list all actions created by NA as a NA', async () => {
      const naAction = innovation.actions.actionByPaul;
      const naAction2 = innovation2.actions.adamInnovationActionByPaul;

      const actions = await sut.getActionsList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(2);
      expect(actions.data).toEqual(
        expect.arrayContaining([
          {
            id: naAction.id,
            displayId: naAction.displayId,
            description: expect.any(String),
            innovation: { id: innovation.id, name: innovation.name },
            status: naAction.status,
            section: naAction.section,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            updatedBy: { name: scenario.users.paulNeedsAssessor.name, role: ServiceRoleEnum.ASSESSMENT },
            createdBy: {
              id: scenario.users.paulNeedsAssessor.id,
              name: scenario.users.paulNeedsAssessor.name,
              role: ServiceRoleEnum.ASSESSMENT
            }
          },
          {
            id: naAction2.id,
            displayId: naAction2.displayId,
            description: expect.any(String),
            innovation: { id: innovation2.id, name: innovation2.name },
            status: naAction2.status,
            section: naAction2.section,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            updatedBy: { name: scenario.users.seanNeedsAssessor.name, role: ServiceRoleEnum.ASSESSMENT },
            createdBy: {
              id: scenario.users.seanNeedsAssessor.id,
              name: scenario.users.seanNeedsAssessor.name,
              role: ServiceRoleEnum.ASSESSMENT
            }
          }
        ])
      );
    });

    it('should list all actions created by NA and QA/A as a NA', async () => {
      const actions = await sut.getActionsList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { allActions: true, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(allActions.length);
    });

    it('should list all actions created by QA/A as a QA/A', async () => {
      const action = innovation.actions.actionByAlice;
      const action2 = innovation2.actions.adamInnovationCompletedActionByAlice;
      const expected = [
        {
          id: action.id,
          displayId: action.displayId,
          description: expect.any(String),
          innovation: { id: innovation.id, name: innovation.name },
          status: action.status,
          section: action.section,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          updatedBy: { name: scenario.users.aliceQualifyingAccessor.name, role: ServiceRoleEnum.QUALIFYING_ACCESSOR },
          createdBy: {
            id: scenario.users.aliceQualifyingAccessor.id,
            name: scenario.users.aliceQualifyingAccessor.name,
            role: ServiceRoleEnum.QUALIFYING_ACCESSOR,
            organisationUnit: {
              id: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              acronym:
                scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym,
              name: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
            }
          }
        },
        {
          id: action2.id,
          displayId: action2.displayId,
          description: expect.any(String),
          innovation: { id: innovation2.id, name: innovation2.name },
          status: action2.status,
          section: action2.section,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          updatedBy: { name: scenario.users.aliceQualifyingAccessor.name, role: ServiceRoleEnum.QUALIFYING_ACCESSOR },
          createdBy: {
            id: scenario.users.aliceQualifyingAccessor.id,
            name: scenario.users.aliceQualifyingAccessor.name,
            role: ServiceRoleEnum.QUALIFYING_ACCESSOR,
            organisationUnit: {
              id: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              acronym:
                scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym,
              name: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
            }
          }
        }
      ];

      const actions = await sut.getActionsList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        { fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(4);
      expect(actions.data).toEqual(expect.arrayContaining(expected));
    });

    it('should list all actions created by NA and QA/A as a QA/A', async () => {
      const actions = await sut.getActionsList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        { allActions: true, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(allActions.length);
    });

    it('should list all actions that match an innovation name', async () => {
      const actions = await sut.getActionsList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { innovationName: innovation.name, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(1);
    });

    it('should list no actions that match an innovation name when no match', async () => {
      const actions = await sut.getActionsList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { innovationName: randText(), fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(0);
      expect(actions.data).toHaveLength(0);
    });

    it('should list all actions from an innovation in status NEEDS_ASSESSMENT', async () => {
      await em
        .getRepository(InnovationEntity)
        .update({ id: innovation.id }, { status: InnovationStatusEnum.NEEDS_ASSESSMENT });

      const actions = await sut.getActionsList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { innovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT], fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(1);
      expect(actions.data[0]).toHaveProperty('id', innovation.actions.actionByPaul.id);
    });

    it('should list all actions that are for section INNOVATION_DESCRIPTION', async () => {
      const action2 = scenario.users.adamInnovator.innovations.adamInnovation.actions.adamInnovationActionByPaul;
      const actions = await sut.getActionsList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { sections: ['INNOVATION_DESCRIPTION'], fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(2);
      expect(actions.data.filter(a => a.section === 'INNOVATION_DESCRIPTION').map(a => a.id)).toEqual(
        expect.arrayContaining([innovation.actions.actionByPaul.id, action2.id])
      );
    });

    it('should list all actions that are in COMPLETED status', async () => {
      const completedAction = innovation2.actions.adamInnovationCompletedActionByAlice;
      const actions = await sut.getActionsList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        { status: [InnovationActionStatusEnum.COMPLETED], fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(1);
      expect(actions.data).toMatchObject([
        {
          id: completedAction.id,
          status: InnovationActionStatusEnum.COMPLETED
        }
      ]);
    });

    it('should list all actions that are created by me as a NA', async () => {
      const expected = innovation.actions.actionByPaul;

      const actions = await sut.getActionsList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { createdByMe: true, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(1);
      expect(actions.data).toMatchObject([
        {
          id: expected.id,
          createdBy: { id: scenario.users.paulNeedsAssessor.id, role: ServiceRoleEnum.ASSESSMENT }
        }
      ]);
    });

    it('should list all actions that are created by me as a QA/A', async () => {
      const actions = await sut.getActionsList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        { createdByMe: true, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(3);
      expect(actions.data).toMatchObject([
        { createdBy: { id: scenario.users.aliceQualifyingAccessor.id, role: ServiceRoleEnum.QUALIFYING_ACCESSOR } },
        { createdBy: { id: scenario.users.aliceQualifyingAccessor.id, role: ServiceRoleEnum.QUALIFYING_ACCESSOR } },
        { createdBy: { id: scenario.users.aliceQualifyingAccessor.id, role: ServiceRoleEnum.QUALIFYING_ACCESSOR } }
      ]);
    });

    it('should list all actions that are created by me as a QA/A (none)', async () => {
      const actions = await sut.getActionsList(
        DTOsHelper.getUserRequestContext(scenario.users.jamieMadroxAccessor, 'healthAccessorRole'),
        { createdByMe: true, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );
      expect(actions.count).toBe(0);
      expect(actions.data).toHaveLength(0);
    });

    it('should list all actions as an innovator for his innovation with unread notifications', async () => {
      const actions = await sut.getActionsList(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        { innovationId: innovation.id, fields: ['notifications'] },
        { order: {}, skip: 0, take: 10 },
        em
      );

      expect(actions.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: innovation.actions.actionByBart.id,
            notifications: 1
          }),
          expect.objectContaining({
            id: innovation.actions.actionByPaul.id,
            notifications: 1
          }),
          expect.objectContaining({
            id: innovation.actions.actionByAliceSubmitted.id,
            notifications: 1
          }),
          expect.objectContaining({
            id: innovation.actions.actionByAlice.id,
            notifications: 1
          })
        ])
      );
    });

    it.each(['displayId', 'section', 'innovationName', 'createdAt', 'updatedAt', 'status'] as const)(
      'should list all actions sorted by %s ASC',
      async order => {
        // Update the dates to make sure they are different
        if (order === 'createdAt' || order === 'updatedAt') {
          await em.query(`
            UPDATE "innovation_action" SET "created_at" = DATEADD(day, (ABS(CHECKSUM(NEWID())) % 65530), 0), "updated_at" = DATEADD(day, (ABS(CHECKSUM(NEWID())) % 65530), 0);
          `);
        }

        const actions = await sut.getActionsList(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          { allActions: true, fields: [] },
          { order: { [order]: 'ASC' }, skip: 0, take: 10 },
          em
        );

        // This test could be improved if we improve the scenario, otherwise it will be to difficult with the current data
        expect(actions.count).toBe(allActions.length);
        const data = actions.data.map(a =>
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
      'should list all actions sorted by %s DESC',
      async order => {
        // Update the dates to make sure they are different
        if (order === 'createdAt' || order === 'updatedAt') {
          await em.query(`
            UPDATE "innovation_action" SET "created_at" = DATEADD(day, (ABS(CHECKSUM(NEWID())) % 65530), 0), "updated_at" = DATEADD(day, (ABS(CHECKSUM(NEWID())) % 65530), 0);
          `);
        }

        const actions = await sut.getActionsList(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          { allActions: true, fields: [] },
          { order: { [order]: 'DESC' }, skip: 0, take: 10 },
          em
        );

        // This test could be improved if we improve the scenario, otherwise it will be to difficult with the current data
        expect(actions.count).toBe(allActions.length);
        const data = actions.data.map(a =>
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
      const actions = await sut.getActionsList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { allActions: true, fields: [] },
        { order: { unknown: 'DESC' } as any, skip: 0, take: 10 },
        em
      );

      // This test could be improved if we improve the scenario, otherwise it will be to difficult with the current data
      expect(actions.count).toBe(allActions.length);
    });

    it('should return action even if created/updated by deleted user', async () => {
      await em
        .getRepository(UserEntity)
        .update({ id: scenario.users.aliceQualifyingAccessor.id }, { status: UserStatusEnum.DELETED });
      const actions = await sut.getActionsList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { allActions: true, fields: [] },
        { order: { createdAt: 'DESC' } as any, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(allActions.length);
      expect(actions.data).toEqual(
        expect.arrayContaining(
          allActions.map(a =>
            expect.objectContaining({
              id: a.id,
              createdBy: expect.objectContaining({
                name: [
                  scenario.users.johnInnovator.innovations.johnInnovation.actions.actionByAlice.id,
                  scenario.users.johnInnovator.innovations.johnInnovation.actions.actionByAliceSubmitted.id,
                  scenario.users.adamInnovator.innovations.adamInnovation.actions.adamInnovationCompletedActionByAlice
                    .id
                ].includes(a.id)
                  ? '[deleted account]'
                  : expect.not.stringMatching(/\[deleted account\]/)
              }),
              updatedBy: expect.objectContaining({
                name: [
                  scenario.users.johnInnovator.innovations.johnInnovation.actions.actionByAlice.id,
                  scenario.users.adamInnovator.innovations.adamInnovation.actions.adamInnovationCompletedActionByAlice
                    .id
                ].includes(a.id)
                  ? '[deleted account]'
                  : expect.not.stringMatching(/\[deleted account\]/)
              })
            })
          )
        )
      );
    });
  });

  describe('getActionInfo', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it.each([
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, innovation.actions.actionByAlice, scenario.users.aliceQualifyingAccessor],
      [ServiceRoleEnum.ASSESSMENT, innovation.actions.actionByPaul, scenario.users.paulNeedsAssessor]
    ])('should return information about an action created by %s', async (role, action, user) => {
      const res = await sut.getActionInfo(action.id, em);

      expect(res).toMatchObject({
        id: action.id,
        displayId: action.displayId,
        status: InnovationActionStatusEnum.REQUESTED,
        section: 'INNOVATION_DESCRIPTION',
        description: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        updatedBy: { name: user.name, role: role },
        createdBy: {
          id: user.id,
          name: user.name,
          ...(role !== ServiceRoleEnum.ASSESSMENT && {
            organisationUnit: {
              id: user.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              name: user.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              acronym: user.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
            }
          })
        }
      });
    });

    it('should return updatedBy isOwner is true if status is SUBMITTED by owner', async () => {
      const res = await sut.getActionInfo(innovation.actions.actionByAliceSubmitted.id, em);
      expect(res.updatedBy.isOwner).toBe(true);
    });

    it('should return updatedBy isOwner is false if status is SUBMITTED by other innovator', async () => {
      await em.getRepository(InnovationActionEntity).update(
        { id: innovation.actions.actionByAliceSubmitted.id },
        {
          updatedBy: scenario.users.adamInnovator.id,
          updatedByUserRole: { id: scenario.users.adamInnovator.roles.innovatorRole.id }
        }
      );
      const res = await sut.getActionInfo(innovation.actions.actionByAliceSubmitted.id, em);
      expect(res.updatedBy.isOwner).toBe(false);
    });

    it('should return declineReason of an action in status DECLINED', async () => {
      const action = innovation.actions.actionByPaul;
      await em.update(
        InnovationActionEntity,
        { id: action.id },
        { status: InnovationActionStatusEnum.DECLINED, updatedBy: scenario.users.johnInnovator.id }
      );

      const declineReason = randText();
      await em.getRepository(ActivityLogEntity).save({
        type: ActivityTypeEnum.INNOVATION_RECORD,
        activity: ActivityEnum.ACTION_STATUS_DECLINED_UPDATE,
        userRole: { id: scenario.users.johnInnovator.roles.innovatorRole.id },
        param: {
          comment: { value: declineReason },
          actionId: action.id
        },
        innovation: { id: innovation.id }
      });

      const res = await sut.getActionInfo(action.id, em);

      expect(res).toMatchObject({
        id: action.id,
        displayId: action.displayId,
        status: InnovationActionStatusEnum.DECLINED,
        section: 'INNOVATION_DESCRIPTION',
        description: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        updatedBy: { name: scenario.users.paulNeedsAssessor.name, role: ServiceRoleEnum.ASSESSMENT },
        createdBy: {
          id: scenario.users.paulNeedsAssessor.id,
          name: scenario.users.paulNeedsAssessor.name,
          role: ServiceRoleEnum.ASSESSMENT
        },
        declineReason
      });
    });

    it("shouldn't return declineReason of an action in status DECLINED but reason was not provided", async () => {
      const action = innovation.actions.actionByPaul;
      await em.update(
        InnovationActionEntity,
        { id: action.id },
        { status: InnovationActionStatusEnum.DECLINED, updatedBy: scenario.users.johnInnovator.id }
      );

      await em.getRepository(ActivityLogEntity).save({
        type: ActivityTypeEnum.INNOVATION_RECORD,
        activity: ActivityEnum.ACTION_STATUS_DECLINED_UPDATE,
        userRole: { id: scenario.users.johnInnovator.roles.innovatorRole.id },
        param: {
          actionId: action.id
        },
        innovation: { id: innovation.id }
      });

      const res = await sut.getActionInfo(action.id, em);

      expect(res.declineReason).toBeUndefined();
    });

    it("should return error when actionId doesn't exist", async () => {
      await expect(() => sut.getActionInfo(randUuid())).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND)
      );
    });
  });

  describe('updateActionAsAccessor', () => {
    const accessor = scenario.users.aliceQualifyingAccessor;
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const action = innovation.actions.actionByAlice;

    it('should update action from status REQUESTED to CANCELLED', async () => {
      await em.update(InnovationActionEntity, { id: action.id }, { status: InnovationActionStatusEnum.REQUESTED });

      const updateAction = await sut.updateActionAsAccessor(
        DTOsHelper.getUserRequestContext(accessor),
        innovation.id,
        action.id,
        {
          status: InnovationActionStatusEnum.CANCELLED
        },
        em
      );

      const dbAction = await em
        .createQueryBuilder(InnovationActionEntity, 'actions')
        .where('actions.id = :actionId', { actionId: updateAction.id })
        .getOne();

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
      expect(updateAction.id).toBe(action.id);
      expect(dbAction!.status).toBe(InnovationActionStatusEnum.CANCELLED);
    });

    it('should update action from status SUBMITTED to COMPLETED', async () => {
      await em.update(InnovationActionEntity, { id: action.id }, { status: InnovationActionStatusEnum.SUBMITTED });

      const updateAction = await sut.updateActionAsAccessor(
        DTOsHelper.getUserRequestContext(accessor),
        innovation.id,
        action.id,
        {
          status: InnovationActionStatusEnum.COMPLETED
        },
        em
      );

      const dbAction = await em
        .createQueryBuilder(InnovationActionEntity, 'actions')
        .where('actions.id = :actionId', { actionId: updateAction.id })
        .getOne();

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
      expect(updateAction.id).toBe(action.id);
      expect(dbAction!.status).toBe(InnovationActionStatusEnum.COMPLETED);
    });

    it('should update action from status SUBMITTED to REQUESTED', async () => {
      await em.update(InnovationActionEntity, { id: action.id }, { status: InnovationActionStatusEnum.SUBMITTED });

      const updateAction = await sut.updateActionAsAccessor(
        DTOsHelper.getUserRequestContext(accessor),
        innovation.id,
        action.id,
        {
          status: InnovationActionStatusEnum.REQUESTED
        },
        em
      );

      const dbAction = await em
        .createQueryBuilder(InnovationActionEntity, 'actions')
        .where('actions.id = :actionId', { actionId: updateAction.id })
        .getOne();

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
      expect(updateAction.id).toBe(action.id);
      expect(dbAction!.status).toBe(InnovationActionStatusEnum.REQUESTED);
    });

    it("should not update if action doesn't exist", async () => {
      await expect(() =>
        sut.updateActionAsAccessor(DTOsHelper.getUserRequestContext(accessor), innovation.id, randUuid(), {
          status: InnovationActionStatusEnum.REQUESTED
        })
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND));
    });

    it('should not be updated if the action is not in the SUBMITTED AND REQUESTED status', async () => {
      await em.update(
        InnovationActionEntity,
        { id: action.id },
        { status: InnovationActionStatusEnum.DECLINED, updatedBy: scenario.users.johnInnovator.id }
      );

      await expect(() =>
        sut.updateActionAsAccessor(
          DTOsHelper.getUserRequestContext(accessor),
          innovation.id,
          action.id,
          {
            status: InnovationActionStatusEnum.REQUESTED
          },
          em
        )
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTION_WITH_UNPROCESSABLE_STATUS)
      );
    });

    it('should not be updated if the action is in SUBMITTED status and the status that is being updated is not REQUESTED/COMPLETED', async () => {
      await em.update(
        InnovationActionEntity,
        { id: action.id },
        { status: InnovationActionStatusEnum.SUBMITTED, updatedBy: scenario.users.johnInnovator.id }
      );

      await expect(() =>
        sut.updateActionAsAccessor(
          DTOsHelper.getUserRequestContext(accessor),
          innovation.id,
          action.id,
          {
            status: InnovationActionStatusEnum.CANCELLED
          },
          em
        )
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTION_WITH_UNPROCESSABLE_STATUS)
      );
    });

    it('should not be update if the action is not created by someone on his organisation unit', async () => {
      const res = await sut.updateActionAsAccessor(
        DTOsHelper.getUserRequestContext(scenario.users.jamieMadroxAccessor, 'healthAccessorRole'),
        innovation.id,
        action.id,
        {
          status: InnovationActionStatusEnum.CANCELLED
        },
        em
      );

      expect(res.id).toBe(action.id);
    });

    it('should not be update if the action is not created by someone on his organisation unit', async () => {
      await expect(() =>
        sut.updateActionAsAccessor(
          DTOsHelper.getUserRequestContext(scenario.users.jamieMadroxAccessor, 'aiRole'),
          innovation.id,
          action.id,
          {
            status: InnovationActionStatusEnum.CANCELLED
          },
          em
        )
      ).rejects.toThrowError(new ForbiddenError(InnovationErrorsEnum.INNOVATION_ACTION_FROM_DIFFERENT_UNIT));
    });
  });

  describe('updateActionAsNeedsAccessor', () => {
    const na = scenario.users.paulNeedsAssessor;
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const action = innovation.actions.actionByPaul;

    it('should update action from status REQUESTED to CANCELLED', async () => {
      await em.update(InnovationActionEntity, { id: action.id }, { status: InnovationActionStatusEnum.REQUESTED });

      const updateAction = await sut.updateActionAsNeedsAccessor(
        DTOsHelper.getUserRequestContext(na),
        innovation.id,
        action.id,
        {
          status: InnovationActionStatusEnum.CANCELLED
        },
        em
      );

      const dbAction = await em
        .createQueryBuilder(InnovationActionEntity, 'actions')
        .where('actions.id = :actionId', { actionId: updateAction.id })
        .getOne();

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
      expect(updateAction.id).toBe(action.id);
      expect(dbAction!.status).toBe(InnovationActionStatusEnum.CANCELLED);
    });

    it('should update action from status SUBMITTED to COMPLETED', async () => {
      await em.update(InnovationActionEntity, { id: action.id }, { status: InnovationActionStatusEnum.SUBMITTED });

      const updateAction = await sut.updateActionAsNeedsAccessor(
        DTOsHelper.getUserRequestContext(na),
        innovation.id,
        action.id,
        {
          status: InnovationActionStatusEnum.COMPLETED
        },
        em
      );

      const dbAction = await em
        .createQueryBuilder(InnovationActionEntity, 'actions')
        .where('actions.id = :actionId', { actionId: updateAction.id })
        .getOne();

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
      expect(updateAction.id).toBe(action.id);
      expect(dbAction!.status).toBe(InnovationActionStatusEnum.COMPLETED);
    });

    it('should update action from status SUBMITTED to REQUESTED', async () => {
      await em.update(InnovationActionEntity, { id: action.id }, { status: InnovationActionStatusEnum.SUBMITTED });

      const updateAction = await sut.updateActionAsNeedsAccessor(
        DTOsHelper.getUserRequestContext(na),
        innovation.id,
        action.id,
        {
          status: InnovationActionStatusEnum.REQUESTED
        },
        em
      );

      const dbAction = await em
        .createQueryBuilder(InnovationActionEntity, 'actions')
        .where('actions.id = :actionId', { actionId: updateAction.id })
        .getOne();

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
      expect(updateAction.id).toBe(action.id);
      expect(dbAction!.status).toBe(InnovationActionStatusEnum.REQUESTED);
    });

    it('should update action from status REQUESTED to CANCELLED requested by other NA', async () => {
      await em.update(InnovationActionEntity, { id: action.id }, { status: InnovationActionStatusEnum.REQUESTED });

      const updateAction = await sut.updateActionAsNeedsAccessor(
        DTOsHelper.getUserRequestContext(scenario.users.seanNeedsAssessor),
        innovation.id,
        action.id,
        {
          status: InnovationActionStatusEnum.CANCELLED
        },
        em
      );

      const dbAction = await em
        .createQueryBuilder(InnovationActionEntity, 'actions')
        .where('actions.id = :actionId', { actionId: updateAction.id })
        .getOne();

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
      expect(updateAction.id).toBe(action.id);
      expect(dbAction!.status).toBe(InnovationActionStatusEnum.CANCELLED);
    });

    it("should not update if action doesn't exist", async () => {
      await expect(() =>
        sut.updateActionAsNeedsAccessor(DTOsHelper.getUserRequestContext(na), innovation.id, randUuid(), {
          status: InnovationActionStatusEnum.REQUESTED
        })
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND));
    });

    it('should not be updated if the action is not in the SUBMITTED AND REQUESTED status', async () => {
      await em.update(InnovationActionEntity, { id: action.id }, { status: InnovationActionStatusEnum.DECLINED });

      await expect(() =>
        sut.updateActionAsNeedsAccessor(
          DTOsHelper.getUserRequestContext(na),
          innovation.id,
          action.id,
          {
            status: InnovationActionStatusEnum.REQUESTED
          },
          em
        )
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTION_WITH_UNPROCESSABLE_STATUS)
      );
    });

    it('should not be updated if the action is in SUBMITTED status and the status that is being updated is not REQUESTED/COMPLETED', async () => {
      await em.update(InnovationActionEntity, { id: action.id }, { status: InnovationActionStatusEnum.SUBMITTED });

      await expect(() =>
        sut.updateActionAsNeedsAccessor(
          DTOsHelper.getUserRequestContext(na),
          innovation.id,
          action.id,
          {
            status: InnovationActionStatusEnum.CANCELLED
          },
          em
        )
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTION_WITH_UNPROCESSABLE_STATUS)
      );
    });

    it('should not update if action is from an QA/A', async () => {
      await expect(() =>
        sut.updateActionAsNeedsAccessor(
          DTOsHelper.getUserRequestContext(na),
          innovation.id,
          innovation.actions.actionByAlice.id,
          {
            status: InnovationActionStatusEnum.CANCELLED
          }
        )
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND));
    });
  });

  describe('updateActionAsInnovator', () => {
    const createThreadOrMessageSpy = jest
      .spyOn(InnovationThreadsService.prototype, 'createThreadOrMessage')
      .mockResolvedValue({
        thread: new InnovationThreadEntity(),
        message: new InnovationThreadMessageEntity()
      });

    afterEach(() => {
      createThreadOrMessageSpy.mockReset();
    });

    const innovator = scenario.users.johnInnovator;
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const naAction = innovation.actions.actionByPaul;
    const qaAction = innovation.actions.actionByAlice;

    it('should update action from status REQUESTED to DECLINED from a NA action', async () => {
      await em.update(InnovationActionEntity, { id: naAction.id }, { status: InnovationActionStatusEnum.REQUESTED });

      const updateAction = await sut.updateActionAsInnovator(
        DTOsHelper.getUserRequestContext(innovator),
        innovation.id,
        naAction.id,
        {
          status: InnovationActionStatusEnum.DECLINED,
          message: randText()
        },
        em
      );

      const dbAction = await em
        .createQueryBuilder(InnovationActionEntity, 'actions')
        .where('actions.id = :actionId', { actionId: updateAction.id })
        .getOne();

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
      expect(createThreadOrMessageSpy).toHaveBeenCalled();
      expect(updateAction.id).toBe(naAction.id);
      expect(dbAction!.status).toBe(InnovationActionStatusEnum.DECLINED);
    });

    it('should update action from status REQUESTED to DECLINED from a QA action', async () => {
      await em.update(InnovationActionEntity, { id: qaAction.id }, { status: InnovationActionStatusEnum.REQUESTED });

      const updateAction = await sut.updateActionAsInnovator(
        DTOsHelper.getUserRequestContext(innovator),
        innovation.id,
        qaAction.id,
        {
          status: InnovationActionStatusEnum.DECLINED,
          message: randText()
        },
        em
      );

      const dbAction = await em
        .createQueryBuilder(InnovationActionEntity, 'actions')
        .where('actions.id = :actionId', { actionId: updateAction.id })
        .getOne();

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
      expect(createThreadOrMessageSpy).toHaveBeenCalled();
      expect(updateAction.id).toBe(qaAction.id);
      expect(dbAction!.status).toBe(InnovationActionStatusEnum.DECLINED);
    });

    it("should not update if action doesn't exist", async () => {
      await expect(() =>
        sut.updateActionAsInnovator(DTOsHelper.getUserRequestContext(innovator), innovation.id, randUuid(), {
          status: InnovationActionStatusEnum.REQUESTED,
          message: randText()
        })
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND));
    });

    it('should not be updated if the action is not in the REQUESTED status', async () => {
      await em.update(InnovationActionEntity, { id: qaAction.id }, { status: InnovationActionStatusEnum.DECLINED });
      await expect(() =>
        sut.updateActionAsInnovator(
          DTOsHelper.getUserRequestContext(innovator),
          innovation.id,
          qaAction.id,
          {
            status: InnovationActionStatusEnum.REQUESTED,
            message: randText()
          },
          em
        )
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTION_WITH_UNPROCESSABLE_STATUS)
      );
    });
  });
});
