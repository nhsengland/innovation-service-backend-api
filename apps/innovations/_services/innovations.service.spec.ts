import { EntityManager } from 'typeorm';
import { TestsHelper } from '@innovations/shared/tests';
import SYMBOLS from './symbols';
import { container } from '../_config';
import {
  InnovationActionStatusEnum,
  InnovationExportRequestStatusEnum,
  InnovationSectionStatusEnum,
  InnovationStatusEnum,
  InnovationSupportStatusEnum
} from '@innovations/shared/enums/innovation.enums';
import { InnovationAssessmentBuilder } from '@innovations/shared/tests/builders/innovation-assessment.builder';
import {
  randCompanyName,
  randCountry,
  randCountryCode,
  randDomainName,
  randPastDate,
  randText,
  randUuid
} from '@ngneat/falso';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import {
  InnovationActionEntity,
  InnovationEntity,
  InnovationExportRequestEntity,
  InnovationSupportEntity,
  NotificationUserEntity
} from '@innovations/shared/entities';
import { DomainInnovationsService, NotifierService } from '@innovations/shared/services';
import {
  ForbiddenError,
  InnovationErrorsEnum,
  OrganisationErrorsEnum,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import { NotFoundError } from '@innovations/shared/errors';
import type { InnovationsService } from './innovations.service';
import { InnovationSectionBuilder } from '@innovations/shared/tests/builders/innovation-section.builder';
import { ActivityLogBuilder, TestActivityLogType } from '@innovations/shared/tests/builders/activity-log.builder';
import { ActivityEnum, ActivityTypeEnum, NotifierTypeEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import type { DomainContextType } from '@innovations/shared/types';

describe('Innovations / _services / innovations suite', () => {
  let sut: InnovationsService;

  let em: EntityManager;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const activityLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog');
  const notifierSendSpy = jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

  beforeAll(async () => {
    sut = container.get<InnovationsService>(SYMBOLS.InnovationsService);
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

  describe.skip('getInnovationsList', () => {
    //TODO
    it('should list innovations', async () => {});
  });

  describe.skip('getInnovationInfo', () => {
    //TODO
    it('should get innovation info', async () => {});
  });

  describe('getNeedsAssessmentOverdueInnovations', () => {
    it.each([InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT as const, InnovationStatusEnum.NEEDS_ASSESSMENT as const])(
      'should get the number of innovations with overdue assessments in status %s',
      async (
        innovationStatus: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT | InnovationStatusEnum.NEEDS_ASSESSMENT
      ) => {
        const innovation = scenario.users.johnInnovator.innovations.johnInnovationEmpty;

        //add an overdue assessment on johnInnovationEmpty
        await em
          .getRepository(InnovationEntity)
          .update({ id: innovation.id }, { submittedAt: randPastDate({ years: 2 }), status: innovationStatus });
        await new InnovationAssessmentBuilder(em)
          .setInnovation(innovation.id)
          .setNeedsAssessor(scenario.users.paulNeedsAssessor.id)
          .save();

        const countAssessments = await sut.getNeedsAssessmentOverdueInnovations(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          { innovationStatus: [innovationStatus], assignedToMe: false },
          em
        );

        expect(countAssessments).toBe(1);
      }
    );

    it('should get the number of innovations with overdue assessments that are assigned to me', async () => {
      const johnInnovation = scenario.users.johnInnovator.innovations.johnInnovationEmpty;
      const adamInnovation = scenario.users.adamInnovator.innovations.adamInnovationEmpty;

      //add an overdue assessment on johnInnovationEmpty assigned to paul
      await em
        .getRepository(InnovationEntity)
        .update(
          { id: johnInnovation.id },
          { submittedAt: randPastDate({ years: 2 }), status: InnovationStatusEnum.NEEDS_ASSESSMENT }
        );
      await new InnovationAssessmentBuilder(em)
        .setInnovation(johnInnovation.id)
        .setNeedsAssessor(scenario.users.paulNeedsAssessor.id)
        .save();

      //add an overdue assessment on adamInnovationEmpty not assigned to paul
      await em
        .getRepository(InnovationEntity)
        .update(
          { id: adamInnovation.id },
          { submittedAt: randPastDate({ years: 2 }), status: InnovationStatusEnum.NEEDS_ASSESSMENT }
        );
      await new InnovationAssessmentBuilder(em)
        .setInnovation(adamInnovation.id)
        .setNeedsAssessor(scenario.users.seanNeedsAssessor.id)
        .save();

      const countAssessments = await sut.getNeedsAssessmentOverdueInnovations(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { innovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT], assignedToMe: true },
        em
      );

      expect(countAssessments).toBe(1);
    });
  });

  describe('createInnovation', () => {
    it('should create an innovation', async () => {
      const result = await sut.createInnovation(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        {
          name: randCompanyName(),
          description: randText({ charCount: 10 }),
          countryName: randCountry(),
          postcode: randCountryCode(),
          website: randDomainName()
        },
        em
      );

      expect(result.id).toBeDefined();

      expect(activityLogSpy).toHaveBeenCalled();
    });

    it('should throw an error if the name is not unique', async () => {
      await expect(() =>
        sut.createInnovation(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          {
            name: scenario.users.johnInnovator.innovations.johnInnovation.name,
            description: randText({ charCount: 10 }),
            countryName: randCountry(),
            postcode: randCountryCode(),
            website: randDomainName()
          },
          em
        )
      ).rejects.toThrowError(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ALREADY_EXISTS));
    });
  });

  describe('getInnovationShares', () => {
    it('should get the organisations the innovation is shared with', async () => {
      const result = await sut.getInnovationShares(scenario.users.johnInnovator.innovations.johnInnovation.id, em);

      expect(result).toMatchObject([
        {
          organisation: {
            id: scenario.organisations.healthOrg.id,
            name: scenario.organisations.healthOrg.name,
            acronym: scenario.organisations.healthOrg.acronym
          }
        },
        {
          organisation: {
            id: scenario.organisations.medTechOrg.id,
            name: scenario.organisations.medTechOrg.name,
            acronym: scenario.organisations.medTechOrg.acronym
          }
        }
      ]);
    });

    it(`should throw an error if the innovation doesn't exist`, async () => {
      await expect(() => sut.getInnovationShares(randUuid(), em)).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND)
      );
    });
  });

  describe('updateInnovationShares', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('should update the organisations that the innovation is shared with', async () => {
      // remove all existing shares and add share with innovTechOrg
      await sut.updateInnovationShares(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        [scenario.organisations.innovTechOrg.id],
        em
      );

      const dbInnovation = await em
        .createQueryBuilder(InnovationEntity, 'innovation')
        .innerJoinAndSelect('innovation.organisationShares', 'organisationShares')
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .getOne();

      expect(dbInnovation?.organisationShares).toHaveLength(1);
      expect(dbInnovation?.organisationShares[0]?.id).toBe(scenario.organisations.innovTechOrg.id);

      expect(activityLogSpy).toHaveBeenCalled();
    });

    it('should set all open actions from removed organisations to DECLINED', async () => {
      // remove all existing shares and add share with innovTechOrg
      await sut.updateInnovationShares(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        [scenario.organisations.innovTechOrg.id],
        em
      );

      const dbActions = await em
        .createQueryBuilder(InnovationActionEntity, 'action')
        .where('action.innovation_support_id IN (:...innovationSupportIds)', {
          innovationSupportIds: [
            innovation.supports.supportByHealthOrgAiUnit.id,
            innovation.supports.supportByHealthOrgUnit.id,
            innovation.supports.supportByMedTechOrgUnit.id
          ]
        })
        .andWhere('action.status IN (:...actionStatus)', {
          actionStatus: [InnovationActionStatusEnum.REQUESTED, InnovationActionStatusEnum.SUBMITTED]
        })
        .getMany();

      expect(dbActions).toHaveLength(0);
    });

    it('should set all ongoing supports from removed organisations to UNASSIGNED', async () => {
      // remove all existing shares and add share with innovTechOrg
      await sut.updateInnovationShares(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        [scenario.organisations.innovTechOrg.id],
        em
      );

      const dbSupports = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .where('support.id IN (:...innovationSupportIds)', {
          innovationSupportIds: [
            innovation.supports.supportByHealthOrgAiUnit.id,
            innovation.supports.supportByHealthOrgUnit.id,
            innovation.supports.supportByMedTechOrgUnit.id
          ]
        })
        .withDeleted()
        .getMany();

      expect(dbSupports.map(s => s.status)).toMatchObject([
        InnovationSupportStatusEnum.UNASSIGNED,
        InnovationSupportStatusEnum.UNASSIGNED,
        InnovationSupportStatusEnum.UNASSIGNED
      ]);
    });

    it(`should throw an error if any of the provided organisations doesn't exist`, async () => {
      await expect(() =>
        sut.updateInnovationShares(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, [
          scenario.organisations.innovTechOrg.id,
          randUuid()
        ])
      ).rejects.toThrowError(new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATIONS_NOT_FOUND));
    });

    it(`should throw an error if the innovation doesn't exist`, async () => {
      await expect(() =>
        sut.updateInnovationShares(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), randUuid(), [
          scenario.organisations.innovTechOrg.id
        ])
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND));
    });
  });

  describe('submitInnovation', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovationEmpty;

    it('should submit the innovation for needs assessment', async () => {
      //prepare innovation status
      await em.getRepository(InnovationEntity).update({ id: innovation.id }, { status: InnovationStatusEnum.CREATED });
      await testsHelper.submitAllInnovationSections(innovation.id, em);

      const result = await sut.submitInnovation(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        em
      );

      const dbInnovation = await em
        .createQueryBuilder(InnovationEntity, 'innovation')
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .getOne();

      expect(dbInnovation?.status).toBe(InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT);
      expect(result).toMatchObject({ id: innovation.id, status: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT });

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
    });

    it(`should throw an error if the innovation doesn't exist`, async () => {
      await expect(() =>
        sut.submitInnovation(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), randUuid(), em)
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND));
    });

    it(`should throw an error if the innovation has no submitted sections`, async () => {
      //prepare innovation status
      await em.getRepository(InnovationEntity).update({ id: innovation.id }, { status: InnovationStatusEnum.CREATED });

      await expect(() =>
        sut.submitInnovation(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, em)
      ).rejects.toThrowError(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_NO_SECTIONS));
    });

    it(`should throw an error if the innovation has no submitted sections`, async () => {
      //prepare innovation status
      await em.getRepository(InnovationEntity).update({ id: innovation.id }, { status: InnovationStatusEnum.CREATED });
      //add submitted section to innovation
      await new InnovationSectionBuilder(em)
        .setInnovation(innovation.id)
        .setSection('INNOVATION_DESCRIPTION')
        .setStatus(InnovationSectionStatusEnum.SUBMITTED)
        .save();

      await expect(() =>
        sut.submitInnovation(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, em)
      ).rejects.toThrowError(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SECTIONS_INCOMPLETE));
    });
  });

  describe('withdrawInnovation', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovationEmpty;
    const reason = randText({ charCount: 10 });

    it('should withdraw the innovation', async () => {
      // mock domain service withdraw innovation
      const domainServiceWithdrawSpy = jest.spyOn(DomainInnovationsService.prototype, 'withdrawInnovations');
      const mockedAffectedUsers = [
        // NA
        {
          userId: scenario.users.paulNeedsAssessor.id,
          userType: scenario.users.paulNeedsAssessor.roles.assessmentRole.role
        },
        // collaborator
        {
          userId: scenario.users.janeInnovator.id,
          userType: scenario.users.janeInnovator.roles.innovatorRole.role
        },
        // QA
        {
          userId: scenario.users.aliceQualifyingAccessor.id,
          userType: scenario.users.aliceQualifyingAccessor.roles.qaRole.role,
          organisationId: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.id,
          organisationUnitId:
            scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id
        }
      ];

      domainServiceWithdrawSpy.mockResolvedValueOnce([
        {
          id: innovation.id,
          name: innovation.name,
          affectedUsers: mockedAffectedUsers
        }
      ]);

      const context = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator);

      const result = await sut.withdrawInnovation(context, innovation.id, reason, em);

      expect(result).toMatchObject({ id: innovation.id });

      expect(domainServiceWithdrawSpy).toHaveBeenCalledWith(
        { id: context.id, roleId: context.currentRole.id },
        [{ id: innovation.id, reason }],
        expect.any(EntityManager) // transaction
      );

      expect(notifierSendSpy).toHaveBeenCalledWith(context, NotifierTypeEnum.INNOVATION_WITHDRAWN, {
        innovation: {
          id: innovation.id,
          name: innovation.name,
          affectedUsers: mockedAffectedUsers
        }
      });
    });

    it(`should throw an error if the innovation doesn't exist`, async () => {
      await expect(() =>
        sut.withdrawInnovation(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), randUuid(), reason)
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND));
    });
  });

  describe('pauseInnovation', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const context = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator);
    const message = randText({ charCount: 10 });

    it('should pause the innovation', async () => {
      const result = await sut.pauseInnovation(context, innovation.id, { message: message }, em);

      const dbInnovation = await em
        .createQueryBuilder(InnovationEntity, 'innovation')
        .select(['innovation.status'])
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .getOne();

      expect(result).toMatchObject({ id: innovation.id });
      expect(dbInnovation?.status).toBe(InnovationStatusEnum.PAUSED);
    });

    it('should write to activity log', async () => {
      await sut.pauseInnovation(context, innovation.id, { message: message }, em);

      expect(activityLogSpy).toHaveBeenLastCalledWith(
        expect.any(EntityManager),
        { innovationId: innovation.id, activity: ActivityEnum.INNOVATION_PAUSE, domainContext: context },
        { message: message }
      );
    });

    it('should send notification', async () => {
      await sut.pauseInnovation(context, innovation.id, { message: message }, em);

      expect(notifierSendSpy).toHaveBeenLastCalledWith(context, NotifierTypeEnum.INNOVATION_STOP_SHARING, {
        innovationId: innovation.id,
        previousAssignedAccessors: expect.arrayContaining([
          {
            id: scenario.users.aliceQualifyingAccessor.id,
            organisationUnitId:
              scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
            userType: ServiceRoleEnum.QUALIFYING_ACCESSOR
          }
        ]),
        message: message
      });
    });

    it('should change status of open actions to DECLINED', async () => {
      const dbPreviouslyOpenActions = await em
        .createQueryBuilder(InnovationActionEntity, 'action')
        .select(['action.status', 'action.id'])
        .innerJoin('action.innovationSection', 'innovationSection')
        .innerJoin('innovationSection.innovation', 'innovation')
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .andWhere('action.status IN (:...openActionStatuses)', {
          openActionStatuses: [InnovationActionStatusEnum.REQUESTED, InnovationActionStatusEnum.SUBMITTED]
        })
        .getMany();

      await sut.pauseInnovation(context, innovation.id, { message: message }, em);

      const dbDeclinedActions = await em
        .createQueryBuilder(InnovationActionEntity, 'action')
        .select(['action.status'])
        .where('action.id IN (:...actionIds)', { actionIds: dbPreviouslyOpenActions.map(a => a.id) })
        .getMany();

      expect(dbDeclinedActions.filter(a => a.status !== InnovationActionStatusEnum.DECLINED)).toHaveLength(0);
    });

    it('should change all ongoing supports to UNASSIGNED', async () => {
      const dbPreviouslyOngoingSupports = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .select(['support.status', 'support.id'])
        .innerJoin('support.innovation', 'innovation')
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .andWhere('support.status = :supportStatus', { supportStatus: InnovationSupportStatusEnum.ENGAGING })
        .getMany();

      await sut.pauseInnovation(context, innovation.id, { message: message }, em);

      const dbSupports = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .select(['support.status'])
        .where('support.id IN (:...supportIds)', { supportIds: dbPreviouslyOngoingSupports.map(s => s.id) })
        .getMany();

      expect(dbSupports.filter(s => s.status !== InnovationSupportStatusEnum.UNASSIGNED)).toHaveLength(0);
    });

    it.each([InnovationExportRequestStatusEnum.PENDING, InnovationExportRequestStatusEnum.APPROVED])(
      'should reject all %s export requests',
      async status => {
        // ensure request is pending
        await em
          .getRepository(InnovationExportRequestEntity)
          .update({ id: innovation.exportRequests.requestByAlice.id }, { status: status });

        await sut.pauseInnovation(context, innovation.id, { message: message }, em);

        const dbRequest = await em
          .createQueryBuilder(InnovationExportRequestEntity, 'request')
          .select(['request.status'])
          .where('request.id = :requestId', { requestId: innovation.exportRequests.requestByAlice.id })
          .getOne();

        expect(dbRequest?.status).toBe(InnovationExportRequestStatusEnum.REJECTED);
      }
    );
  });

  describe('getInnovationActivitiesLog', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    let activityLogOld: TestActivityLogType;
    let activityLogNew: TestActivityLogType;

    beforeEach(async () => {
      activityLogOld = await new ActivityLogBuilder(em)
        .setType(ActivityTypeEnum.ACTIONS)
        .setActivity(ActivityEnum.ACTION_CREATION)
        .setInnovation(innovation.id)
        .setCreatedAt(new Date('10/10/2015'))
        .setCreatedBy(scenario.users.aliceQualifyingAccessor)
        .setInterveningUser(scenario.users.aliceQualifyingAccessor)
        .save();

      activityLogNew = await new ActivityLogBuilder(em)
        .setType(ActivityTypeEnum.NEEDS_ASSESSMENT)
        .setActivity(ActivityEnum.NEEDS_ASSESSMENT_COMPLETED)
        .setInnovation(innovation.id)
        .setCreatedAt(new Date('10/10/2022'))
        .setCreatedBy(scenario.users.paulNeedsAssessor)
        .setInterveningUser(scenario.users.paulNeedsAssessor)
        .save();
    });

    it('should return the activity log data of the innovation', async () => {
      const result = await sut.getInnovationActivitiesLog(
        innovation.id,
        {},
        {
          skip: 0,
          take: 10,
          order: { createdAt: 'DESC' }
        },
        em
      );

      expect(result).toMatchObject({
        count: 2,
        data: [
          {
            type: activityLogNew.type,
            activity: activityLogNew.activity,
            date: new Date(activityLogNew.createdAt),
            params: activityLogNew.param
          },
          {
            type: activityLogOld.type,
            activity: activityLogOld.activity,
            date: new Date(activityLogOld.createdAt),
            params: activityLogOld.param
          }
        ]
      });
    });

    it('should return the activity log data of the innovation ordered by ascending creation date', async () => {
      const result = await sut.getInnovationActivitiesLog(
        innovation.id,
        {},
        {
          skip: 0,
          take: 10,
          order: { createdAt: 'ASC' }
        },
        em
      );

      expect(result).toMatchObject({
        count: 2,
        data: [
          {
            type: activityLogOld.type,
            activity: activityLogOld.activity,
            date: new Date(activityLogOld.createdAt),
            params: activityLogOld.param
          },
          {
            type: activityLogNew.type,
            activity: activityLogNew.activity,
            date: new Date(activityLogNew.createdAt),
            params: activityLogNew.param
          }
        ]
      });
    });

    it('should return the activity log data of the innovation for the given activity type', async () => {
      const result = await sut.getInnovationActivitiesLog(
        innovation.id,
        {
          activityTypes: [ActivityTypeEnum.ACTIONS]
        },
        {
          skip: 0,
          take: 10,
          order: { createdAt: 'DESC' }
        },
        em
      );

      expect(result).toMatchObject({
        count: 1,
        data: [
          {
            type: activityLogOld.type,
            activity: activityLogOld.activity,
            date: new Date(activityLogOld.createdAt),
            params: activityLogOld.param
          }
        ]
      });
    });

    it('should return the activity log data of the innovation according to the given start date', async () => {
      const result = await sut.getInnovationActivitiesLog(
        innovation.id,
        {
          startDate: new Date('10/10/2020').toISOString()
        },
        {
          skip: 0,
          take: 10,
          order: { createdAt: 'DESC' }
        },
        em
      );

      expect(result).toMatchObject({
        count: 1,
        data: [
          {
            type: activityLogNew.type,
            activity: activityLogNew.activity,
            date: new Date(activityLogNew.createdAt),
            params: activityLogNew.param
          }
        ]
      });
    });

    it('should return the activity log data of the innovation according to the given end date', async () => {
      const result = await sut.getInnovationActivitiesLog(
        innovation.id,
        {
          endDate: new Date('10/10/2020').toISOString()
        },
        {
          skip: 0,
          take: 10,
          order: { createdAt: 'DESC' }
        },
        em
      );

      expect(result).toMatchObject({
        count: 1,
        data: [
          {
            type: activityLogOld.type,
            activity: activityLogOld.activity,
            date: new Date(activityLogOld.createdAt),
            params: activityLogOld.param
          }
        ]
      });
    });
  });

  describe('createInnovationRecordExportRequest', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const requestReason = randText({ charCount: 10 });

    it('should create an innovation record export request', async () => {
      const result = await sut.createInnovationRecordExportRequest(
        DTOsHelper.getUserRequestContext(scenario.users.bartQualifyingAccessor),
        scenario.users.bartQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
        innovation.id,
        { requestReason },
        em
      );

      expect(result.id).toBeDefined();
    });

    it('should send a notification', async () => {
      const context = DTOsHelper.getUserRequestContext(scenario.users.bartQualifyingAccessor);
      const result = await sut.createInnovationRecordExportRequest(
        context,
        scenario.users.bartQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
        innovation.id,
        { requestReason },
        em
      );

      expect(notifierSendSpy).toHaveBeenLastCalledWith(context, NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST, {
        innovationId: innovation.id,
        requestId: result.id
      });
    });

    it('should throw an error if the request already exists', async () => {
      await expect(() =>
        sut.createInnovationRecordExportRequest(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
          innovation.id,
          { requestReason },
          em
        )
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_EXPORT_REQUEST_ALREADY_EXISTS)
      );
    });
  });

  describe('updateInnovationRecordExportRequest', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const innovatorContext = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator);
    const accessorContext = DTOsHelper.getUserRequestContext(scenario.users.samAccessor);
    const qaContext = DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor);

    const rejectReason = randText({ charCount: 10 });

    it.each([
      [InnovationExportRequestStatusEnum.APPROVED, innovatorContext],
      [InnovationExportRequestStatusEnum.CANCELLED, qaContext],
      [InnovationExportRequestStatusEnum.REJECTED, innovatorContext]
    ])('should update an innovation record export request to %s', async (status, context) => {
      const result = await sut.updateInnovationRecordExportRequest(
        context,
        innovation.exportRequests.requestByAlice.id,
        { status, rejectReason: status === InnovationExportRequestStatusEnum.REJECTED ? rejectReason : null },
        em
      );

      const dbRequest = await em
        .createQueryBuilder(InnovationExportRequestEntity, 'request')
        .select(['request.status'])
        .where('request.id = :requestId', { requestId: innovation.exportRequests.requestByAlice.id })
        .getOne();

      expect(result).toMatchObject({ id: innovation.exportRequests.requestByAlice.id });
      expect(dbRequest?.status).toBe(status);
    });

    it('should send a notification', async () => {
      await sut.updateInnovationRecordExportRequest(
        innovatorContext,
        innovation.exportRequests.requestByAlice.id,
        { status: InnovationExportRequestStatusEnum.APPROVED, rejectReason: null },
        em
      );

      expect(notifierSendSpy).toHaveBeenCalledWith(
        innovatorContext,
        NotifierTypeEnum.INNOVATION_RECORD_EXPORT_FEEDBACK,
        {
          innovationId: innovation.id,
          requestId: innovation.exportRequests.requestByAlice.id
        }
      );
    });

    it.each([
      [ServiceRoleEnum.ACCESSOR, accessorContext],
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, qaContext]
    ])('should throw an error if the request user is %s has no organisation unit info', async (_role, context) => {
      await expect(() =>
        sut.updateInnovationRecordExportRequest(
          { ...context, organisation: undefined } as DomainContextType,
          innovation.exportRequests.requestByAlice.id,
          { status: InnovationExportRequestStatusEnum.CANCELLED, rejectReason: null }
        )
      ).rejects.toThrowError(new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
    });

    it(`should throw an error if the request doesn't exist`, async () => {
      await expect(() =>
        sut.updateInnovationRecordExportRequest(innovatorContext, randUuid(), {
          status: InnovationExportRequestStatusEnum.APPROVED,
          rejectReason: null
        })
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_EXPORT_REQUEST_NOT_FOUND));
    });

    it.each([
      [ServiceRoleEnum.ACCESSOR, accessorContext],
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, accessorContext]
    ])(
      `should throw an error if the request user is %s and the organisation unit info doesn't match the record info`,
      async (_role, context) => {
        await expect(() =>
          sut.updateInnovationRecordExportRequest(context, innovation.exportRequests.requestByAlice.id, {
            status: InnovationExportRequestStatusEnum.APPROVED,
            rejectReason: null
          })
        ).rejects.toThrowError(
          new ForbiddenError(InnovationErrorsEnum.INNOVATION_RECORD_EXPORT_REQUEST_FROM_DIFFERENT_UNIT)
        );
      }
    );

    it('should throw an error if no reject reason is provided when updating to REJECTED status', async () => {
      await expect(() =>
        sut.updateInnovationRecordExportRequest(innovatorContext, innovation.exportRequests.requestByAlice.id, {
          status: InnovationExportRequestStatusEnum.REJECTED,
          rejectReason: null
        })
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_RECORD_EXPORT_REQUEST_REJECT_REASON_REQUIRED)
      );
    });
  });

  describe.skip('getInnovationRecordExportRequests', () => {
    it('should get all export requests for the innovation', async () => {});
  });

  describe('getInnovationRecordExportRequestInfo', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it.each([
      [ServiceRoleEnum.INNOVATOR, scenario.users.johnInnovator, innovation.exportRequests.requestByAlice],
      [ServiceRoleEnum.ACCESSOR, scenario.users.samAccessor, innovation.exportRequests.requestBySam],
      [
        ServiceRoleEnum.QUALIFYING_ACCESSOR,
        scenario.users.aliceQualifyingAccessor,
        innovation.exportRequests.requestByAlice
      ]
    ])('should get the export request info as %s', async (role, user, request) => {
      const result = await sut.getInnovationRecordExportRequestInfo(
        DTOsHelper.getUserRequestContext(user),
        request.id,
        em
      );

      const dbRequest = await em
        .createQueryBuilder(InnovationExportRequestEntity, 'request')
        .where('request.id = :requestId', { requestId: request.id })
        .getOne();

      const requestCreator =
        role === ServiceRoleEnum.ACCESSOR
          ? {
              name: scenario.users.samAccessor.name,
              organisation: {
                id: scenario.users.samAccessor.organisations.medTechOrg.id,
                name: scenario.users.samAccessor.organisations.medTechOrg.name,
                acronym: scenario.users.samAccessor.organisations.medTechOrg.acronym,
                organisationUnit: {
                  id: scenario.users.samAccessor.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
                  name: scenario.users.samAccessor.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
                  acronym: scenario.users.samAccessor.organisations.medTechOrg.organisationUnits.medTechOrgUnit.acronym
                }
              }
            }
          : {
              name: scenario.users.aliceQualifyingAccessor.name,
              organisation: {
                id: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.id,
                name: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.name,
                acronym: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.acronym,
                organisationUnit: {
                  id: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
                  name: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit
                    .name,
                  acronym:
                    scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit
                      .acronym
                }
              }
            };

      expect(result).toMatchObject({
        id: request.id,
        status: request.status,
        requestReason: request.requestReason,
        rejectReason: request.rejectReason,
        createdAt: dbRequest?.createdAt,
        createdBy: {
          id: request.createdBy.id,
          name: requestCreator.name
        },
        organisation: requestCreator.organisation,
        expiresAt: undefined,
        isExportable: false,
        updatedAt: new Date(request.updatedAt)
      });
    });

    it.each([
      [ServiceRoleEnum.ACCESSOR, scenario.users.samAccessor],
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, scenario.users.aliceQualifyingAccessor]
    ])('should throw an error if the request user is %s and has no organisation unit info', async (_role, user) => {
      await expect(() =>
        sut.getInnovationRecordExportRequestInfo(
          { ...DTOsHelper.getUserRequestContext(user), organisation: undefined } as DomainContextType,
          innovation.exportRequests.requestByAlice.id,
          em
        )
      ).rejects.toThrowError(new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
    });

    it(`should throw an error if the request doesn't exist`, async () => {
      await expect(() =>
        sut.getInnovationRecordExportRequestInfo(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          randUuid(),
          em
        )
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_EXPORT_REQUEST_NOT_FOUND));
    });
  });

  describe('checkInnovationRecordExportRequest', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    it.each([
      [true, InnovationExportRequestStatusEnum.APPROVED],
      [false, InnovationExportRequestStatusEnum.CANCELLED],
      [false, InnovationExportRequestStatusEnum.PENDING],
      [false, InnovationExportRequestStatusEnum.REJECTED]
    ])('should return %s for a record in status %s', async (res, status) => {
      // prepare record status
      const request = scenario.users.johnInnovator.innovations.johnInnovation.exportRequests.requestByAlice;
      await em.getRepository(InnovationExportRequestEntity).update({ id: request.id }, { status: status });

      const result = await sut.checkInnovationRecordExportRequest(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        scenario.users.johnInnovator.innovations.johnInnovation.exportRequests.requestByAlice.id,
        em
      );

      expect(result).toMatchObject({ canExport: res });
    });

    it.each([
      [ServiceRoleEnum.ACCESSOR, scenario.users.samAccessor],
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, scenario.users.aliceQualifyingAccessor]
    ])('should throw an error if the request user is %s and has no organisation unit info', async (_role, user) => {
      await expect(() =>
        sut.checkInnovationRecordExportRequest(
          { ...DTOsHelper.getUserRequestContext(user), organisation: undefined } as DomainContextType,
          innovation.exportRequests.requestByAlice.id,
          em
        )
      ).rejects.toThrowError(new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
    });

    it(`should throw an error if the request doesn't exist`, async () => {
      await expect(() =>
        sut.checkInnovationRecordExportRequest(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          randUuid(),
          em
        )
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_EXPORT_REQUEST_NOT_FOUND));
    });
  });

  describe('dismissNotifications', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('should dismiss all unread notifications', async () => {
      await sut.dismissNotifications(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        {
          notificationIds: [],
          contextTypes: [],
          contextDetails: [],
          contextIds: []
        },
        em
      );

      const dbNotifications = await em
        .createQueryBuilder(NotificationUserEntity, 'notificationUser')
        .innerJoin('notificationUser.notification', 'notification')
        .where('notification.innovation_id = :innovationId', { innovationId: innovation.id })
        .getMany();

      expect(dbNotifications.filter(n => n.readAt === null)).toHaveLength(0);
    });

    it('should dismiss all unread notifications with given notificationIds', async () => {
      await sut.dismissNotifications(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, {
        notificationIds: [innovation.notifications.notificationFromSupport.id],
        contextTypes: [],
        contextDetails: [],
        contextIds: []
      });

      const dbNotification = await em
        .createQueryBuilder(NotificationUserEntity, 'notificationUser')
        .innerJoin('notificationUser.notification', 'notification')
        .where('notification.id = :notificationId', {
          notificationId: innovation.notifications.notificationFromSupport.id
        })
        .getOne();

      expect(dbNotification?.readAt).not.toBeNull();
    });

    it('should dismiss all unread notifications with given notification context types', async () => {
      await sut.dismissNotifications(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, {
        notificationIds: [],
        contextTypes: [innovation.notifications.notificationFromSupport.context.type],
        contextDetails: [],
        contextIds: []
      });

      const dbNotifications = await em
        .createQueryBuilder(NotificationUserEntity, 'notificationUser')
        .innerJoin('notificationUser.notification', 'notification')
        .where('notification.contextType = :notificationContextType', {
          notificationContextType: innovation.notifications.notificationFromSupport.context.type
        })
        .getMany();

      expect(dbNotifications.filter(n => n.readAt === null)).toHaveLength(0);
    });
  
    it('should dismiss all unread notifications with given notification context details', async () => {
      await sut.dismissNotifications(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, {
        notificationIds: [],
        contextTypes: [],
        contextDetails: [innovation.notifications.notificationFromSupport.context.detail],
        contextIds: []
      });

      const dbNotifications = await em
        .createQueryBuilder(NotificationUserEntity, 'notificationUser')
        .innerJoin('notificationUser.notification', 'notification')
        .where('notification.contextDetail = :notificationContextDetail', {
          notificationContextDetail: innovation.notifications.notificationFromSupport.context.detail
        })
        .getMany();

      expect(dbNotifications.filter(n => n.readAt === null)).toHaveLength(0);
    });

    it('should dismiss all unread notifications with given notification contextIds', async () => {
      await sut.dismissNotifications(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, {
        notificationIds: [],
        contextTypes: [],
        contextDetails: [],
        contextIds: [innovation.notifications.notificationFromSupport.context.id]
      });

      const dbNotifications = await em
        .createQueryBuilder(NotificationUserEntity, 'notificationUser')
        .innerJoin('notificationUser.notification', 'notification')
        .where('notification.contextId = :notificationContextId', {
          notificationContextId: innovation.notifications.notificationFromSupport.context.id
        })
        .getMany();

      expect(dbNotifications.filter(n => n.readAt === null)).toHaveLength(0);
    });
  });

  describe('getInnovationSubmissionsState', () => {
    it('should get the innovation submission state', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const result = await sut.getInnovationSubmissionsState(innovation.id, em);

      expect(result).toMatchObject({
        submittedAllSections: false,
        submittedForNeedsAssessment: true
      });
    });

    it(`should throw an error if the innovation doesn't exist`, async () => {
      await expect(() => sut.getInnovationSubmissionsState(randUuid(), em)).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND)
      );
    });
  });
});