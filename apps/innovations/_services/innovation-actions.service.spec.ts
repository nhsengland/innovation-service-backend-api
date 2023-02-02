/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TestDataType, TestsHelper } from '@innovations/shared/tests/tests.helper';
import { container } from '../_config';

import { InnovationActionEntity } from '@innovations/shared/entities';
import { ActivityEnum, ActivityTypeEnum, InnovationActionStatusEnum, InnovationSectionEnum, InnovationStatusEnum, NotificationContextTypeEnum, UserTypeEnum } from '@innovations/shared/enums';
import type { NotFoundError, UnprocessableEntityError } from '@innovations/shared/errors';
import { DomainInnovationsService, DomainUsersService, NOSQLConnectionService, NotifierService } from '@innovations/shared/services';
import { CacheService } from '@innovations/shared/services/storage/cache.service';
import { randNumber, randText, randUuid } from '@ngneat/falso';
import { randomUUID } from 'crypto';
import { cloneDeep } from 'lodash';
import type { EntityManager } from 'typeorm';
import { InnovationActionsServiceSymbol, InnovationActionsServiceType } from './interfaces';

describe('Innovation Actions Suite', () => {

  let sut: InnovationActionsServiceType;

  let testData: TestDataType;
  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<InnovationActionsServiceType>(InnovationActionsServiceSymbol);
    await TestsHelper.init();
    testData = TestsHelper.sampleData;
  });

  beforeEach(async () => {
    jest.spyOn(NOSQLConnectionService.prototype, 'init').mockResolvedValue();
    jest.spyOn(CacheService.prototype, 'init').mockReturnThis();
    em = await TestsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await TestsHelper.releaseQueryRunnerEntityManager(em);
  });

  describe('createAction', () => {
    it('should create an action', async () => {
      // arrange

      const accessor = testData.baseUsers.accessor;

      jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog').mockResolvedValue();
      jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

      const action = await sut.createAction(
        { id: accessor.id, identityId: accessor.identityId, type: accessor.type },
        testData.domainContexts.accessor,
        testData.innovation.id,
        {
          description: randText(),
          section: Object.values(InnovationSectionEnum)[randNumber({ min: 0, max: Object.values(InnovationSectionEnum).length - 1 })]!
        },
        em
      );

      // assert
      expect(action.id).toBeDefined();
    });

    it('should not create an action if organisation unit is not supporting innovation', async () => {
      // arrange
      const accessor = testData.baseUsers.accessor;
      const context = cloneDeep(testData.domainContexts.accessor);
      context.organisation!.organisationUnit!.id = randUuid();

      jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog').mockResolvedValue();
      jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

      // act
      let err: UnprocessableEntityError | null = null;
      try {
        await sut.createAction(
          { id: accessor.id, identityId: accessor.identityId, type: accessor.type },
          context,
          testData.innovation.id,
          {
            description: randText(),
            section: Object.values(InnovationSectionEnum)[randNumber({ min: 0, max: Object.values(InnovationSectionEnum).length - 1 })]!,
          },
          em
        );
      } catch (error) {
        err = error as UnprocessableEntityError;
      }

      // assert
      expect(err).toBeDefined();
      expect(err?.name).toBe('I.0040');
    });
  });

  describe('getActionsList', () => {
    beforeEach(() => {
      jest.spyOn(DomainInnovationsService.prototype, 'getUnreadNotifications').mockImplementation((_userId, contextIds) => {
        return Promise.resolve(contextIds.map((contextId) => ({
          contextId,
          contextType: NotificationContextTypeEnum.ACTION,
          id: randUuid(),
          params: randText(),
        })));
      });

      jest.spyOn(DomainUsersService.prototype, 'getUserInfo').mockResolvedValue(
        {
          displayName: 'qa name',
          type: testData.baseUsers.accessor.type,
        } as any
      );
    });

    it('should list all actions as an innovator for his innovation', async () => {

      const actions = await sut.getActionsList(
        testData.domainContexts.innovator,
        { innovationId: testData.innovation.id, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions).toBeDefined();
    });

    it('should list all actions created by NA as a NA', async () => {
      const innovation = testData.innovation;

      // Create other as QA/A
      await TestsHelper.TestDataBuilder
        .createAction(testData.baseUsers.accessor.id, (await innovation.sections)[0]!, (innovation.innovationSupports)[0]!)
        .setStatus(InnovationActionStatusEnum.REQUESTED)
        .build(em);

      // Change UserInfo for NA
      jest.spyOn(DomainUsersService.prototype, 'getUserInfo').mockResolvedValue(
        {
          displayName: "na name",
          type: testData.baseUsers.assessmentUser.type,
        } as any
      );

      // Create one as NA
      const naAction = await TestsHelper.TestDataBuilder
        .createAction(testData.baseUsers.assessmentUser.id, (await innovation.sections)[0]!)
        .setStatus(InnovationActionStatusEnum.REQUESTED)
        .build(em);

      const expected = {
        id: naAction.id,
        displayId: naAction.displayId,
        description: naAction.description,
        innovation: { id: innovation.id, name: innovation.name },
        status: naAction.status,
        section: naAction.innovationSection.section,
        createdAt: naAction.createdAt,
        updatedAt: naAction.updatedAt,
        updatedBy: { name: "na name", role: UserTypeEnum.ASSESSMENT },
        createdBy: {
          id: testData.baseUsers.assessmentUser.id,
          name: "na name",
          role: UserTypeEnum.ASSESSMENT,
        }
      };

      const actions = await sut.getActionsList(
        testData.domainContexts.assessmentUser,
        { fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(1);
      expect(actions.data).toEqual([expected]);
    });

    it('should list all actions created by NA and QA/A as a NA', async () => {
      const innovation = testData.innovation;

      // Create one as NA
      await TestsHelper.TestDataBuilder
        .createAction(testData.baseUsers.assessmentUser.id, (await innovation.sections)[0]!)
        .setStatus(InnovationActionStatusEnum.REQUESTED)
        .build(em);

      const expected = await em.createQueryBuilder(InnovationActionEntity, 'action').getCount();

      const actions = await sut.getActionsList(
        testData.domainContexts.assessmentUser,
        { allActions: true, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(expected);
    });

    it('should list all actions created by QA/A as a QA/A', async () => {
      const innovation = testData.innovation;

      const action = await em.createQueryBuilder(InnovationActionEntity, 'action')
        .innerJoinAndSelect('action.innovationSection', 'innovationSection')
        .innerJoinAndSelect('innovationSection.innovation', 'innovation')
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .getOne();

      // Create one as NA
      await TestsHelper.TestDataBuilder
        .createAction(testData.baseUsers.assessmentUser.id, (await innovation.sections)[0]!)
        .setStatus(InnovationActionStatusEnum.REQUESTED)
        .build(em);

      const expected = {
        id: action!.id,
        displayId: action!.displayId,
        description: action!.description,
        innovation: { id: innovation.id, name: innovation.name },
        status: action!.status,
        section: action!.innovationSection.section,
        createdAt: action!.createdAt,
        updatedAt: action!.updatedAt,
        updatedBy: { name: "qa name", role: UserTypeEnum.ACCESSOR },
        createdBy: {
          id: testData.baseUsers.accessor.id,
          name: "qa name",
          role: UserTypeEnum.ACCESSOR,
          organisationUnit: {
            id: innovation.innovationSupports[0]?.organisationUnit.id,
            acronym: innovation.innovationSupports[0]?.organisationUnit.acronym,
            name: innovation.innovationSupports[0]?.organisationUnit.name,
          },
        }
      };

      const actions = await sut.getActionsList(
        testData.domainContexts.accessor,
        { fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(1);
      expect(actions.data).toEqual([expected]);
    });

    it('should list all actions created by NA and QA/A as a QA/A', async () => {
      const innovation = testData.innovation;

      // Create one as NA
      await TestsHelper.TestDataBuilder
        .createAction(testData.baseUsers.assessmentUser.id, (await innovation.sections)[0]!)
        .setStatus(InnovationActionStatusEnum.REQUESTED)
        .build(em);

      const expected = await em.createQueryBuilder(InnovationActionEntity, 'action').getCount();

      const actions = await sut.getActionsList(
        testData.domainContexts.accessor,
        { allActions: true, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(expected);
    });

    it('should list all actions that match an innovation name', async () => {
      const innovation = testData.innovation;

      const action = await em.createQueryBuilder(InnovationActionEntity, 'action')
        .innerJoinAndSelect('action.innovationSection', 'innovationSection')
        .innerJoinAndSelect('innovationSection.innovation', 'innovation')
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .getOne();

      const actions = await sut.getActionsList(
        testData.domainContexts.accessor,
        { innovationName: innovation.name, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(1);
      expect(actions.data[0]).toHaveProperty('id', action!.id)
    });

    it('should list all actions from an innovation in status NEEDS_ASSESSMENT', async () => {
      const innovation = await TestsHelper.TestDataBuilder
        .createInnovation()
        .setOwner(testData.baseUsers.innovator)
        .setStatus(InnovationStatusEnum.NEEDS_ASSESSMENT)
        .withSections()
        .withAssessments(testData.baseUsers.assessmentUser)
        .build(em);

      const action = await TestsHelper.TestDataBuilder
        .createAction(testData.baseUsers.assessmentUser.id, (await innovation.sections)[0]!)
        .setStatus(InnovationActionStatusEnum.REQUESTED)
        .build(em);

      const actions = await sut.getActionsList(
        testData.domainContexts.assessmentUser,
        { innovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT], fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(1);
      expect(actions.data[0]).toHaveProperty('id', action!.id)
    });

    it('should list all actions that are for section CURRENT_CARE_PATHWAY', async () => {
      const innovation = await TestsHelper.TestDataBuilder
        .createInnovation()
        .setOwner(testData.baseUsers.innovator)
        .setStatus(InnovationStatusEnum.NEEDS_ASSESSMENT)
        .withSections()
        .withAssessments(testData.baseUsers.assessmentUser)
        .build(em);

      const section = (await innovation.sections)
        .find(section => section.section === InnovationSectionEnum.CURRENT_CARE_PATHWAY);

      const action = await TestsHelper.TestDataBuilder
        .createAction(testData.baseUsers.assessmentUser.id, section!)
        .setStatus(InnovationActionStatusEnum.REQUESTED)
        .build(em);

      const actions = await sut.getActionsList(
        testData.domainContexts.assessmentUser,
        { sections: [InnovationSectionEnum.CURRENT_CARE_PATHWAY], fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(1);
      expect(actions.data[0]).toHaveProperty('id', action!.id)
      expect(actions.data[0]).toHaveProperty('section', InnovationSectionEnum.CURRENT_CARE_PATHWAY)
    });

    it('should list all actions that are in COMPLETED status', async () => {
      const innovation = testData.innovation;

      const action = await TestsHelper.TestDataBuilder
        .createAction(testData.baseUsers.assessmentUser.id, (await innovation.sections)[0]!)
        .setStatus(InnovationActionStatusEnum.COMPLETED)
        .build(em);

      const actions = await sut.getActionsList(
        testData.domainContexts.assessmentUser,
        { status: [InnovationActionStatusEnum.COMPLETED], fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(1);
      expect(actions.data[0]).toHaveProperty('id', action!.id)
      expect(actions.data[0]).toHaveProperty('status', InnovationActionStatusEnum.COMPLETED);
    });

    it('should list all actions that are created by me as a NA', async () => {
      const innovation = testData.innovation;

      const action = await TestsHelper.TestDataBuilder
        .createAction(testData.baseUsers.assessmentUser.id, (await innovation.sections)[0]!)
        .setStatus(InnovationActionStatusEnum.REQUESTED)
        .build(em);

      const actions = await sut.getActionsList(
        testData.domainContexts.assessmentUser,
        { createdByMe: true, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(1);
      expect(actions.data[0]).toHaveProperty('id', action!.id)
      expect(actions.data[0]).toHaveProperty(['createdBy', 'id'], testData.baseUsers.assessmentUser.id);
    });

    it('should list all actions that are created by me as a QA/A', async () => {
      const innovation = testData.innovation;

      // Create one with NA to see if filter is really just getting the ones created by him
      await TestsHelper.TestDataBuilder
        .createAction(testData.baseUsers.assessmentUser.id, (await innovation.sections)[0]!)
        .setStatus(InnovationActionStatusEnum.REQUESTED)
        .build(em);

      const action = await em.createQueryBuilder(InnovationActionEntity, 'action')
        .where('action.created_by = :createdBy', { createdBy: testData.baseUsers.accessor.id })
        .getOne();

      const actions = await sut.getActionsList(
        testData.domainContexts.accessor,
        { createdByMe: true, fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(1);
      expect(actions.data[0]).toHaveProperty('id', action!.id)
      expect(actions.data[0]).toHaveProperty(['createdBy', 'id'], testData.baseUsers.accessor.id);
      expect(actions.data[0]).toHaveProperty(['createdBy', 'organisationUnit', 'id'], testData.domainContexts.accessor.organisation.organisationUnit.id);
    });

    it('should return no actions', async () => {

      const actions = await sut.getActionsList(
        testData.domainContexts.accessor,
        { innovationName: randText(), fields: [] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(actions.count).toBe(0);
      expect(actions.data).toHaveLength(0);
    });

    it('should list all actions as an innovator for his innovation with unread notifications', async () => {

      const randomSection = await testData.innovation.sections;
      const randomSupport = testData.innovation.innovationSupports;

      const action = await TestsHelper.TestDataBuilder.createAction(testData.baseUsers.accessor.id, randomSection[0]!, randomSupport[0]!)
        .build(em);

      const actions = await sut.getActionsList(
        testData.domainContexts.innovator,
        { innovationId: testData.innovation.id, fields: ['notifications'] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      const actual = actions.data.find(a => a.id === action.id);

      expect(actual).toBeDefined();
      expect(actual?.notifications).toBe(1);
    });
  });

  describe('getActionInfo', () => {

    it('should return information about an action created by QA/A', async () => {
      const innovation = testData.innovation;

      const newAction = await TestsHelper.TestDataBuilder
        .createAction(testData.baseUsers.accessor.id, (await innovation.sections)[0]!, (innovation.innovationSupports)[0]!)
        .setStatus(InnovationActionStatusEnum.REQUESTED)
        .build(em);

      jest.spyOn(DomainUsersService.prototype, 'getUserInfo').mockResolvedValue(
        {
          displayName: "first name",
          type: testData.baseUsers.accessor.type,
        } as any
      );

      const action = await sut.getActionInfo(
        newAction.id,
        em
      );

      expect(action).toMatchObject({
        id: newAction.id,
        displayId: newAction.displayId,
        status: InnovationActionStatusEnum.REQUESTED,
        section: (await innovation.sections)[0]!.section,
        description: newAction.description,
        createdAt: newAction.createdAt,
        updatedAt: newAction.updatedAt,
        updatedBy: { name: "first name", role: UserTypeEnum.ACCESSOR },
        createdBy: {
          id: testData.baseUsers.accessor.id,
          name: "first name",
          role: UserTypeEnum.ACCESSOR,
          organisationUnit: {
            id: newAction.innovationSupport.organisationUnit.id,
            name: newAction.innovationSupport.organisationUnit.name,
            acronym: newAction.innovationSupport.organisationUnit.acronym
          }
        },
      });
    });

    it('should return information about an action created by NA', async () => {
      const innovation = testData.innovation;

      const newAction = await TestsHelper.TestDataBuilder
        .createAction(testData.baseUsers.assessmentUser.id, (await innovation.sections)[0]!)
        .setStatus(InnovationActionStatusEnum.REQUESTED)
        .build(em);

      jest.spyOn(DomainUsersService.prototype, 'getUserInfo').mockResolvedValue(
        {
          displayName: "first name",
          type: testData.baseUsers.assessmentUser.type,
        } as any
      );

      const action = await sut.getActionInfo(
        newAction.id,
        em
      );

      expect(action).toMatchObject({
        id: newAction.id,
        displayId: newAction.displayId,
        status: InnovationActionStatusEnum.REQUESTED,
        section: (await innovation.sections)[0]!.section,
        description: newAction.description,
        createdAt: newAction.createdAt,
        updatedAt: newAction.updatedAt,
        updatedBy: { name: "first name", role: UserTypeEnum.ASSESSMENT },
        createdBy: {
          id: testData.baseUsers.assessmentUser.id,
          name: "first name",
          role: UserTypeEnum.ASSESSMENT
        },
      });
    });

    it('should return declineReason of an action in status DECLINED', async () => {
      const innovation = testData.innovation;

      const newAction = await TestsHelper.TestDataBuilder
        .createAction(testData.baseUsers.assessmentUser.id, (await innovation.sections)[0]!)
        .setStatus(InnovationActionStatusEnum.DECLINED)
        .build(em);

      const declineReason = randText();
      await TestsHelper.TestDataBuilder.addActivityLog(
        innovation,
        { userId: testData.baseUsers.assessmentUser.id, innovationId: innovation.id, domainContext: testData.domainContexts.assessmentUser, activity: ActivityEnum.ACTION_STATUS_DECLINED_UPDATE, activityType: ActivityTypeEnum.ACTIONS },
        {
          actionId: newAction.id,
          interveningUserId: newAction.createdBy || '',
          comment: { id: randomUUID(), value: declineReason }
        },
        em
      );

      jest.spyOn(DomainUsersService.prototype, 'getUserInfo').mockResolvedValue(
        {
          displayName: "first name",
          type: testData.baseUsers.assessmentUser.type,
        } as any
      );

      const action = await sut.getActionInfo(
        newAction.id,
        em
      );

      expect(action).toMatchObject({
        id: newAction.id,
        displayId: newAction.displayId,
        status: InnovationActionStatusEnum.DECLINED,
        section: (await innovation.sections)[0]!.section,
        description: newAction.description,
        createdAt: newAction.createdAt,
        updatedAt: newAction.updatedAt,
        updatedBy: { name: "first name", role: UserTypeEnum.ASSESSMENT },
        createdBy: {
          id: testData.baseUsers.assessmentUser.id,
          name: "first name",
          role: UserTypeEnum.ASSESSMENT
        },
        declineReason
      });
    });

    it('should return error when actionId doesn\'t exist', async () => {

      let err: NotFoundError | null = null;
      try {
        await sut.getActionInfo(
          randomUUID(),
          em
        );
      } catch (error) {
        err = error as NotFoundError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe('IA.0090');
    })
  });

});
