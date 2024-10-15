import { container } from '../_config';

import {
  InnovationFileEntity,
  InnovationSupportEntity,
  InnovationSupportLogEntity,
  InnovationTaskEntity,
  InnovationThreadEntity,
  InnovationThreadMessageEntity
} from '@innovations/shared/entities';
import {
  InnovationFileContextTypeEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  NotifierTypeEnum
} from '@innovations/shared/enums';

import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  GenericErrorsEnum,
  InnovationErrorsEnum,
  NotFoundError,
  OrganisationErrorsEnum,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import { TranslationHelper } from '@innovations/shared/helpers';
import { DomainInnovationsService, NotifierService } from '@innovations/shared/services';
import { AuthErrorsEnum } from '@innovations/shared/services/auth/authorization-validation.model';
import { TestsHelper } from '@innovations/shared/tests';
import { InnovationSupportLogBuilder } from '@innovations/shared/tests/builders/innovation-support-log.builder';
import { InnovationSupportBuilder } from '@innovations/shared/tests/builders/innovation-support.builder';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { randFileExt, randFileName, randNumber, randPastDate, randText, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { InnovationFileService } from './innovation-file.service';
import type { InnovationSupportsService } from './innovation-supports.service';
import { InnovationThreadsService } from './innovation-threads.service';
import SYMBOLS from './symbols';
import { ValidationService } from './validation.service';

describe('Innovations / _services / innovation-supports suite', () => {
  let sut: InnovationSupportsService;

  let em: EntityManager;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  // Setup global mocks for these tests
  const activityLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog');
  const supportLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addSupportLog');
  const notifierSendSpy = jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);
  const notifierSendNotifyMeSpy = jest.spyOn(NotifierService.prototype, 'sendNotifyMe').mockResolvedValue(true);
  const threadMessageMock = jest.spyOn(InnovationThreadsService.prototype, 'createThreadMessage').mockResolvedValue({
    threadMessage: InnovationThreadMessageEntity.new({ id: randUuid() })
  });

  beforeAll(async () => {
    sut = container.get<InnovationSupportsService>(SYMBOLS.InnovationSupportsService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
    activityLogSpy.mockClear();
    supportLogSpy.mockClear();
    notifierSendSpy.mockClear();
    notifierSendNotifyMeSpy.mockClear();
    threadMessageMock.mockClear();
  });

  describe('getInnovationSupportsList', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

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

    it('should list all innovation supports', async () => {
      const supports = await sut.getInnovationSupportsList(innovation.id, { fields: [] }, em);

      expect(supports).toMatchObject([
        {
          id: innovation.supports.supportByHealthOrgUnit.id,
          status: innovation.supports.supportByHealthOrgUnit.status,
          organisation: {
            id: scenario.organisations.healthOrg.id,
            name: scenario.organisations.healthOrg.name,
            acronym: scenario.organisations.healthOrg.acronym,
            unit: {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
            }
          }
        },
        {
          id: innovation.supports.supportByHealthOrgAiUnit.id,
          status: innovation.supports.supportByHealthOrgAiUnit.status,
          organisation: {
            id: scenario.organisations.healthOrg.id,
            name: scenario.organisations.healthOrg.name,
            acronym: scenario.organisations.healthOrg.acronym,
            unit: {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.acronym
            }
          }
        },
        {
          id: innovation.supports.supportByMedTechOrgUnit.id,
          status: innovation.supports.supportByMedTechOrgUnit.status,
          organisation: {
            id: scenario.organisations.medTechOrg.id,
            name: scenario.organisations.medTechOrg.name,
            acronym: scenario.organisations.medTechOrg.acronym,
            unit: {
              id: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
              name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
              acronym: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.acronym
            }
          }
        }
      ]);
    });

    it('should list all innovation supports with engaging accessors', async () => {
      const supports = await sut.getInnovationSupportsList(innovation.id, { fields: ['engagingAccessors'] }, em);

      expect(supports).toMatchObject([
        {
          id: innovation.supports.supportByHealthOrgUnit.id,
          status: innovation.supports.supportByHealthOrgUnit.status,
          organisation: {
            id: scenario.organisations.healthOrg.id,
            name: scenario.organisations.healthOrg.name,
            acronym: scenario.organisations.healthOrg.acronym,
            unit: {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
            }
          },
          engagingAccessors: [
            {
              id: scenario.users.aliceQualifyingAccessor.id,
              userRoleId: scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
              name: scenario.users.aliceQualifyingAccessor.name
            },
            {
              id: scenario.users.jamieMadroxAccessor.id,
              userRoleId: scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id,
              name: scenario.users.jamieMadroxAccessor.name
            }
          ]
        },
        {
          id: innovation.supports.supportByHealthOrgAiUnit.id,
          status: innovation.supports.supportByHealthOrgAiUnit.status,
          organisation: {
            id: scenario.organisations.healthOrg.id,
            name: scenario.organisations.healthOrg.name,
            acronym: scenario.organisations.healthOrg.acronym,
            unit: {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.acronym
            }
          },
          engagingAccessors: []
        },
        {
          id: innovation.supports.supportByMedTechOrgUnit.id,
          status: innovation.supports.supportByMedTechOrgUnit.status,
          organisation: {
            id: scenario.organisations.medTechOrg.id,
            name: scenario.organisations.medTechOrg.name,
            acronym: scenario.organisations.medTechOrg.acronym,
            unit: {
              id: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
              name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
              acronym: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.acronym
            }
          },
          engagingAccessors: [
            {
              id: scenario.users.samAccessor.id,
              userRoleId: scenario.users.samAccessor.roles.accessorRole.id,
              name: scenario.users.samAccessor.name
            }
          ]
        }
      ]);
    });

    it(`should throw a not found error when the innovation doesn't exist`, async () => {
      await expect(() => sut.getInnovationSupportsList(randUuid(), { fields: [] }, em)).rejects.toThrow(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND)
      );
    });
  });

  describe('getInnovationSupportInfo', () => {
    it('should get the innovation support info', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const support = await sut.getInnovationSupportInfo(innovation.supports.supportByHealthOrgUnit.id, em);

      expect(support).toMatchObject({
        id: innovation.supports.supportByHealthOrgUnit.id,
        status: innovation.supports.supportByHealthOrgUnit.status,
        engagingAccessors: [
          {
            id: scenario.users.aliceQualifyingAccessor.id,
            userRoleId: scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
            name: scenario.users.aliceQualifyingAccessor.name
          },
          {
            id: scenario.users.jamieMadroxAccessor.id,
            userRoleId: scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id,
            name: scenario.users.jamieMadroxAccessor.name
          }
        ]
      });
    });

    it(`should throw a not found error if the support doesn't exist`, async () => {
      await expect(() => sut.getInnovationSupportInfo(randUuid(), em)).rejects.toThrow(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND)
      );
    });
  });

  describe('createInnovationSupport', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const organisationWithSupport = scenario.organisations.healthOrg.organisationUnits.healthOrgUnit;
    const organisationWithoutSupport = scenario.organisations.innovTechOrg.organisationUnits.innovTechOrgUnit;

    it('should create a new innovation support as suggested', async () => {
      const res = await sut.createInnovationSupport(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        innovation.id,
        organisationWithoutSupport.id,
        InnovationSupportStatusEnum.SUGGESTED,
        em
      );

      expect(res).toMatchObject({
        id: expect.any(String),
        createdBy: scenario.users.paulNeedsAssessor.id,
        updatedBy: scenario.users.paulNeedsAssessor.id,
        status: InnovationSupportStatusEnum.SUGGESTED,
        isMostRecent: true
      });

      const dbSupport = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .where('support.innovation.id = :innovationId', { innovationId: innovation.id })
        .andWhere('support.organisationUnit.id = :organisationUnitId', {
          organisationUnitId: organisationWithoutSupport.id
        })
        .getOne();

      expect(dbSupport).toMatchObject({
        id: expect.any(String),
        createdBy: scenario.users.paulNeedsAssessor.id,
        updatedBy: scenario.users.paulNeedsAssessor.id,
        status: InnovationSupportStatusEnum.SUGGESTED,
        isMostRecent: true
      });
    });

    it('should create a new innovation support if no active support', async () => {
      await em.update(
        InnovationSupportEntity,
        { id: innovation.supports.supportByHealthOrgUnit.id },
        { status: InnovationSupportStatusEnum.CLOSED }
      );

      const res = await sut.createInnovationSupport(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        innovation.id,
        organisationWithSupport.id,
        InnovationSupportStatusEnum.SUGGESTED,
        em
      );

      expect(res).toMatchObject({
        id: expect.any(String),
        createdBy: scenario.users.paulNeedsAssessor.id,
        updatedBy: scenario.users.paulNeedsAssessor.id,
        status: InnovationSupportStatusEnum.SUGGESTED,
        isMostRecent: true
      });
    });

    it('should fail if there is an active innovation support', async () => {
      await expect(
        sut.createInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          innovation.id,
          organisationWithSupport.id,
          InnovationSupportStatusEnum.SUGGESTED,
          em
        )
      ).rejects.toThrow(new ConflictError(InnovationErrorsEnum.INNOVATION_SUPPORT_ALREADY_EXISTS));
    });

    it("should fail if the innovation hasn't been shared with the organisation unit", async () => {
      await em.query('DELETE FROM innovation_share WHERE innovation_id = @0', [innovation.id]);

      await expect(
        sut.createInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          innovation.id,
          organisationWithSupport.id,
          InnovationSupportStatusEnum.SUGGESTED,
          em
        )
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND));
    });

    it('should mark other supports as not most recent', async () => {
      const previous = await em
        .getRepository(InnovationSupportEntity)
        .findOneBy({ innovation: { id: innovation.id }, isMostRecent: true });
      expect(previous?.isMostRecent).toBe(true);

      await em.update(
        InnovationSupportEntity,
        { id: innovation.supports.supportByHealthOrgUnit.id },
        { status: InnovationSupportStatusEnum.CLOSED }
      );

      await sut.createInnovationSupport(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        innovation.id,
        organisationWithSupport.id,
        InnovationSupportStatusEnum.SUGGESTED,
        em
      );

      const after = await em.getRepository(InnovationSupportEntity).findOneByOrFail({ id: previous?.id });
      expect(after?.isMostRecent).toBe(false);
    });
  });

  describe('createSuggestedSupports', () => {
    const na = scenario.users.paulNeedsAssessor;
    const naContext = DTOsHelper.getUserRequestContext(na);
    let previousCreateInnovationSupport: any;
    const createInnovationSupportSpy = jest.fn().mockImplementation(() => {});

    const innovationWithoutSupports = scenario.users.ottoOctaviusInnovator.innovations.brainComputerInterfaceInnovation;

    beforeEach(() => {
      createInnovationSupportSpy.mockClear();
    });

    beforeAll(() => {
      previousCreateInnovationSupport = sut.createInnovationSupport;
      sut.createInnovationSupport = createInnovationSupportSpy as any;
    });

    afterAll(() => {
      sut.createInnovationSupport = previousCreateInnovationSupport;
    });

    it('should create a new innovation support as suggested', async () => {
      await sut.createSuggestedSupports(
        naContext,
        innovationWithoutSupports.id,
        [
          scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
          scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.id
        ],
        em
      );

      expect(createInnovationSupportSpy).toHaveBeenCalledTimes(2);
      expect(createInnovationSupportSpy).toHaveBeenNthCalledWith(
        1,
        naContext,
        innovationWithoutSupports.id,
        scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
        InnovationSupportStatusEnum.SUGGESTED,
        em
      );
      expect(createInnovationSupportSpy).toHaveBeenNthCalledWith(
        2,
        naContext,
        innovationWithoutSupports.id,
        scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.id,
        InnovationSupportStatusEnum.SUGGESTED,
        em
      );
    });

    it('should ignore units that are not shared', async () => {
      await sut.createSuggestedSupports(
        naContext,
        innovationWithoutSupports.id,
        [scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id],
        em
      );

      expect(createInnovationSupportSpy).toHaveBeenCalledTimes(0);
    });

    it('should ignore units that are already supporting the innovation', async () => {
      await new InnovationSupportBuilder(em)
        .setInnovation(innovationWithoutSupports.id)
        .setMajorAssessment(innovationWithoutSupports.assessmentInProgress.id)
        .setStatus(InnovationSupportStatusEnum.ENGAGING)
        .setOrganisationUnit(scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id)
        .save();

      await sut.createSuggestedSupports(
        naContext,
        innovationWithoutSupports.id,
        [
          scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
          scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.id
        ],
        em
      );

      expect(createInnovationSupportSpy).toHaveBeenCalledTimes(1);
      expect(createInnovationSupportSpy).toHaveBeenNthCalledWith(
        1,
        naContext,
        innovationWithoutSupports.id,
        scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.id,
        InnovationSupportStatusEnum.SUGGESTED,
        em
      );
    });
  });

  describe('startInnovationSupport', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('should create and start a support if no support exists', async () => {
      const support = await sut.startInnovationSupport(
        DTOsHelper.getUserRequestContext(scenario.users.bartQualifyingAccessor),
        scenario.users.adamInnovator.innovations.adamInnovation.id,
        {
          status: InnovationSupportStatusEnum.ENGAGING,
          message: randText({ charCount: 10 }),
          accessors: [
            {
              id: scenario.users.jamieMadroxAccessor.id,
              userRoleId: scenario.users.jamieMadroxAccessor.roles.aiRole.id
            }
          ]
        },
        em
      );

      expect(support).toMatchObject({
        id: support.id
      });

      expect(activityLogSpy).toHaveBeenCalled();
      expect(supportLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
    });

    it('should create and start a support if no active support exists', async () => {
      await em.update(
        InnovationSupportEntity,
        { innovation: { id: scenario.users.johnInnovator.innovations.johnInnovation.id } },
        { status: InnovationSupportStatusEnum.CLOSED }
      );
      const support = await sut.startInnovationSupport(
        DTOsHelper.getUserRequestContext(scenario.users.bartQualifyingAccessor),
        scenario.users.johnInnovator.innovations.johnInnovation.id,
        {
          status: InnovationSupportStatusEnum.ENGAGING,
          message: randText({ charCount: 10 }),
          accessors: [
            {
              id: scenario.users.jamieMadroxAccessor.id,
              userRoleId: scenario.users.jamieMadroxAccessor.roles.aiRole.id
            }
          ]
        },
        em
      );

      expect(support).toMatchObject({
        id: support.id
      });
    });

    it('should start the innovation support if it was SUGGESTED', async () => {
      await em.update(
        InnovationSupportEntity,
        { innovation: { id: scenario.users.johnInnovator.innovations.johnInnovation.id } },
        { status: InnovationSupportStatusEnum.SUGGESTED }
      );
      const support = await sut.startInnovationSupport(
        DTOsHelper.getUserRequestContext(scenario.users.bartQualifyingAccessor),
        scenario.users.johnInnovator.innovations.johnInnovation.id,
        {
          status: InnovationSupportStatusEnum.ENGAGING,
          message: randText({ charCount: 10 }),
          accessors: [
            {
              id: scenario.users.jamieMadroxAccessor.id,
              userRoleId: scenario.users.jamieMadroxAccessor.roles.aiRole.id
            }
          ]
        },
        em
      );

      expect(support).toMatchObject({
        id: support.id
      });
    });

    it('should send the notifyMe', async () => {
      const context = DTOsHelper.getUserRequestContext(scenario.users.bartQualifyingAccessor);
      const innovation = scenario.users.adamInnovator.innovations.adamInnovation.id;
      const message = randText({ charCount: 10 });
      await sut.startInnovationSupport(
        context,
        innovation,
        {
          status: InnovationSupportStatusEnum.ENGAGING,
          message,
          accessors: [
            {
              id: scenario.users.jamieMadroxAccessor.id,
              userRoleId: scenario.users.jamieMadroxAccessor.roles.aiRole.id
            }
          ]
        },
        em
      );

      expect(notifierSendNotifyMeSpy).toHaveBeenCalledWith(context, innovation, 'SUPPORT_UPDATED', {
        status: InnovationSupportStatusEnum.ENGAGING,
        units: context.organisation?.organisationUnit?.id,
        message
      });
    });

    it('should throw an unprocessable entity error if the domain context has an invalid organisation unit id', async () => {
      await expect(() =>
        sut.startInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty),
          innovation.id,
          {
            status: InnovationSupportStatusEnum.ENGAGING,
            message: randText({ charCount: 10 })
          },
          em
        )
      ).rejects.toThrow(new ForbiddenError(AuthErrorsEnum.AUTH_USER_ROLE_NOT_ALLOWED));
    });

    it(`should throw a not found error if the organisation unit doesn't exist`, async () => {
      const domainContext = DTOsHelper.getUserRequestContext(scenario.users.bartQualifyingAccessor);
      if (domainContext.organisation?.organisationUnit) {
        domainContext.organisation.organisationUnit.id = randUuid();
      }

      await expect(() =>
        sut.startInnovationSupport(
          domainContext,
          innovation.id,
          {
            status: InnovationSupportStatusEnum.ENGAGING,
            message: randText({ charCount: 10 })
          },
          em
        )
      ).rejects.toThrow(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
    });

    it('should throw an unprocessable entity error if one active support already exists', async () => {
      await expect(() =>
        sut.startInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          {
            status: InnovationSupportStatusEnum.ENGAGING,
            message: randText({ charCount: 10 })
          },
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_ALREADY_EXISTS));
    });

    it('should throw an unprocessable entity error if the accessors argument exists and the status is not ENGAGING', async () => {
      await expect(() =>
        sut.startInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          {
            status: InnovationSupportStatusEnum.SUGGESTED,
            message: randText({ charCount: 10 }),
            accessors: [
              {
                id: scenario.users.aliceQualifyingAccessor.id,
                userRoleId: scenario.users.aliceQualifyingAccessor.roles.qaRole.id
              }
            ]
          },
          em
        )
      ).rejects.toThrow(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_CANNOT_HAVE_ASSIGNED_ASSESSORS)
      );
    });
  });

  describe('getSupportSummaryList', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('should return currently engaging units', async () => {
      const supportSummaryList = await sut.getSupportSummaryList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id
      );

      expect(supportSummaryList.ENGAGING).toMatchObject([
        {
          id: expect.any(String),
          name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
          support: {
            id: innovation.supports.supportByHealthOrgUnit.id,
            status: innovation.supports.supportByHealthOrgUnit.status,
            start: expect.any(Date)
          }
        },
        {
          id: expect.any(String),
          name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
          support: {
            id: innovation.supports.supportByMedTechOrgUnit.id,
            status: innovation.supports.supportByMedTechOrgUnit.status,
            start: expect.any(Date)
          }
        }
      ]);
      expect(
        supportSummaryList.ENGAGING.every(
          (s, i) => i === 0 || s.support.start! >= supportSummaryList.ENGAGING[i - 1]!.support.start!
        )
      ).toBeTruthy();
    });

    it('should return units that had been engaged', async () => {
      await em
        .getRepository(InnovationSupportEntity)
        .update({ id: innovation.supports.supportByHealthOrgUnit.id }, { status: InnovationSupportStatusEnum.CLOSED });

      const supportSummaryList = await sut.getSupportSummaryList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id,
        em
      );

      expect(supportSummaryList.BEEN_ENGAGED).toMatchObject([
        {
          id: expect.any(String),
          name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
          support: {
            id: innovation.supports.supportByHealthOrgUnit.id,
            status: InnovationSupportStatusEnum.CLOSED,
            start: expect.any(Date),
            end: expect.any(Date)
          }
        }
      ]);
    });

    it('should return suggested units', async () => {
      const innovTechHeavySupport = await new InnovationSupportBuilder(em)
        .setStatus(InnovationSupportStatusEnum.WAITING)
        .setInnovation(innovation.id)
        .setMajorAssessment(innovation.assessment.id)
        .setOrganisationUnit(scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.id)
        .save();
      const innovTechOrgUnitSupport = await new InnovationSupportBuilder(em)
        .setStatus(InnovationSupportStatusEnum.SUGGESTED)
        .setInnovation(innovation.id)
        .setMajorAssessment(innovation.assessment.id)
        .setOrganisationUnit(scenario.organisations.innovTechOrg.organisationUnits.innovTechOrgUnit.id)
        .save();
      const supportSummaryList = await sut.getSupportSummaryList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id,
        em
      );

      expect(supportSummaryList.SUGGESTED).toMatchObject([
        {
          id: expect.any(String),
          name: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.name,
          support: {
            id: innovation.supports.supportByHealthOrgAiUnit.id,
            status: InnovationSupportStatusEnum.WAITING,
            start: expect.any(Date)
          },
          organisation: {
            id: scenario.organisations.healthOrg.id,
            acronym: scenario.organisations.healthOrg.acronym
          }
        },
        {
          id: expect.any(String),
          name: scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.name,
          support: {
            id: innovTechHeavySupport.id,
            status: InnovationSupportStatusEnum.WAITING,
            start: expect.any(Date)
          },
          organisation: {
            id: scenario.organisations.innovTechOrg.id,
            acronym: scenario.organisations.innovTechOrg.acronym
          }
        },
        {
          id: expect.any(String),
          name: scenario.organisations.innovTechOrg.organisationUnits.innovTechOrgUnit.name,
          support: {
            id: innovTechOrgUnitSupport.id,
            status: innovTechOrgUnitSupport.status
          },
          organisation: {
            id: scenario.organisations.innovTechOrg.id,
            acronym: scenario.organisations.innovTechOrg.acronym
          }
        }
      ]);
    });

    it("should return everything empty for innovations that haven't been on NA", async () => {
      const supportSummaryList = await sut.getSupportSummaryList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        scenario.users.johnInnovator.innovations.johnInnovationEmpty.id,
        em
      );

      expect(supportSummaryList.ENGAGING).toHaveLength(0);
      expect(supportSummaryList.BEEN_ENGAGED).toHaveLength(0);
      expect(supportSummaryList.SUGGESTED).toHaveLength(0);
    });
  });

  describe('getInnovationUnitsSuggestions', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it("should return a list with 1 support suggestion in which the user's unit was suggested by QA Alice", async () => {
      const user_qa_lisa = scenario.users.lisaQualifyingAccessor;
      const suggestor_qa_alice = scenario.users.aliceQualifyingAccessor;
      const qaSuggestion1 = innovation.suggestions.aliceSuggestsHealthOrgAiUnit;

      const suggestions = await sut.getInnovationUnitsSuggestions(
        DTOsHelper.getUserRequestContext(user_qa_lisa),
        innovation.id
      );

      expect(suggestions).toMatchObject([
        {
          suggestionId: qaSuggestion1.suggestion.id,
          suggestorUnit: suggestor_qa_alice.roles.qaRole.organisationUnit?.name,
          thread: {
            id: qaSuggestion1.thread.id,
            message: qaSuggestion1.suggestion.description
          }
        }
      ]);
    });

    it("should return a list with 2 support suggestions in which the user's unit was suggested by QA Alice and Bart", async () => {
      const user_qa_scott = scenario.users.scottQualifyingAccessor;
      const suggestor_qa_alice = scenario.users.aliceQualifyingAccessor;
      const suggestor_qa_bart = scenario.users.bartQualifyingAccessor;
      const qaSuggestion1 = innovation.suggestions.aliceSuggestsMedTechOrgUnit;
      const qaSuggestion2 = innovation.suggestions.bartSuggestsMedTechOrgUnit;

      const suggestions = await sut.getInnovationUnitsSuggestions(
        DTOsHelper.getUserRequestContext(user_qa_scott),
        innovation.id
      );

      expect(suggestions).toMatchObject([
        {
          suggestionId: qaSuggestion1.suggestion.id,
          suggestorUnit: suggestor_qa_alice.roles.qaRole.organisationUnit?.name,
          thread: {
            id: qaSuggestion1.thread.id,
            message: qaSuggestion1.suggestion.description
          }
        },
        {
          suggestionId: qaSuggestion2.suggestion.id,
          suggestorUnit: suggestor_qa_bart.roles.qaRole.organisationUnit?.name,
          thread: {
            id: qaSuggestion2.thread.id,
            message: qaSuggestion2.suggestion.description
          }
        }
      ]);
    });
  });

  describe('getSupportSummaryUnitInfo', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('should return the unit information', async () => {
      const johnInnovator = scenario.users.johnInnovator;
      const jamieMadrox = scenario.users.jamieMadroxAccessor;
      const alice = scenario.users.aliceQualifyingAccessor;
      const paul = scenario.users.paulNeedsAssessor;
      // Suggested by NA
      const naSuggestion = await new InnovationSupportLogBuilder(em)
        .setInnovation(innovation.id)
        .setLogType(InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION)
        .setCreatedBy(paul, paul.roles.assessmentRole)
        .setSuggestedUnits([scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id])
        .save();

      // Suggested by QA
      const qaSuggestion = await new InnovationSupportLogBuilder(em)
        .setInnovation(innovation.id)
        .setLogType(InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION)
        .setCreatedBy(alice, alice.roles.qaRole)
        .setSupportStatus(InnovationSupportStatusEnum.ENGAGING)
        .setSuggestedUnits([scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id])
        .save();

      // Update status
      const statusUpdate = await new InnovationSupportLogBuilder(em)
        .setInnovation(innovation.id)
        .setLogType(InnovationSupportLogTypeEnum.STATUS_UPDATE)
        .setCreatedBy(jamieMadrox, jamieMadrox.roles.aiRole)
        .setSupportStatus(InnovationSupportStatusEnum.ENGAGING)
        .save();

      // Create Progress Update
      const progressUpdate = await new InnovationSupportLogBuilder(em)
        .setInnovation(innovation.id)
        .setLogType(InnovationSupportLogTypeEnum.PROGRESS_UPDATE)
        .setSupportStatus(InnovationSupportStatusEnum.ENGAGING)
        .setCreatedBy(jamieMadrox, jamieMadrox.roles.aiRole)
        .setParams({ title: randText() })
        .save();

      // Archive Innovation
      const archiveInnovationUpdate = await new InnovationSupportLogBuilder(em)
        .setInnovation(innovation.id)
        .setLogType(InnovationSupportLogTypeEnum.INNOVATION_ARCHIVED)
        .setSupportStatus(InnovationSupportStatusEnum.CLOSED)
        .setCreatedBy(johnInnovator, johnInnovator.roles.innovatorRole)
        .setOrganisationUnit(jamieMadrox.roles.aiRole.organisationUnit!.id)
        .save();

      // Innovator stop share Innovation
      const stopShareUpdate = await new InnovationSupportLogBuilder(em)
        .setInnovation(innovation.id)
        .setLogType(InnovationSupportLogTypeEnum.STOP_SHARE)
        .setSupportStatus(InnovationSupportStatusEnum.CLOSED)
        .setCreatedBy(johnInnovator, johnInnovator.roles.innovatorRole)
        .setOrganisationUnit(jamieMadrox.roles.aiRole.organisationUnit!.id)
        .save();

      const unitInfo = await sut.getSupportSummaryUnitInfo(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id,
        scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
        em
      );

      expect(unitInfo).toMatchObject(
        [
          {
            id: stopShareUpdate.id,
            createdAt: stopShareUpdate.createdAt,
            createdBy: { id: johnInnovator.id, name: johnInnovator.name, displayRole: 'Owner' },
            type: 'STOP_SHARE',
            params: { supportStatus: InnovationSupportStatusEnum.CLOSED }
          },
          {
            id: archiveInnovationUpdate.id,
            createdAt: archiveInnovationUpdate.createdAt,
            createdBy: { id: johnInnovator.id, name: johnInnovator.name, displayRole: 'Owner' },
            type: 'INNOVATION_ARCHIVED',
            params: {
              supportStatus: InnovationSupportStatusEnum.CLOSED,
              message: archiveInnovationUpdate.description
            }
          },
          {
            id: progressUpdate.id,
            createdAt: progressUpdate.createdAt,
            createdBy: {
              id: jamieMadrox.id,
              name: jamieMadrox.name,
              displayRole: TranslationHelper.translate(`SERVICE_ROLES.${jamieMadrox.roles.aiRole.role}`)
            },
            type: 'PROGRESS_UPDATE',
            params: {
              title: progressUpdate.params && 'title' in progressUpdate.params ? progressUpdate.params.title : '',
              message: progressUpdate.description
            }
          },
          {
            id: statusUpdate.id,
            createdAt: statusUpdate.createdAt,
            createdBy: {
              id: jamieMadrox.id,
              name: jamieMadrox.name,
              displayRole: TranslationHelper.translate(`SERVICE_ROLES.${jamieMadrox.roles.aiRole.role}`)
            },
            type: 'SUPPORT_UPDATE',
            params: { supportStatus: statusUpdate.innovationSupportStatus, message: statusUpdate.description }
          },
          {
            id: qaSuggestion.id,
            createdAt: qaSuggestion.createdAt,
            createdBy: {
              id: alice.id,
              name: alice.name,
              displayRole: TranslationHelper.translate(`SERVICE_ROLES.${alice.roles.qaRole.role}`)
            },
            type: 'SUGGESTED_ORGANISATION',
            params: {
              suggestedByName: alice.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              message: qaSuggestion.description
            }
          },
          {
            id: naSuggestion.id,
            createdAt: naSuggestion.createdAt,
            createdBy: {
              id: paul.id,
              name: paul.name,
              displayRole: TranslationHelper.translate(`SERVICE_ROLES.${paul.roles.assessmentRole.role}`)
            },
            type: 'SUGGESTED_ORGANISATION',
            params: {}
          }
        ].sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())
      );
      expect(unitInfo.every((s, i) => i === 0 || s.createdAt! <= unitInfo[i - 1]!.createdAt!)).toBeTruthy();
    });

    it("should throw NotFoundError when innovation doesn't exist", async () => {
      await expect(() =>
        sut.getSupportSummaryUnitInfo(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          randUuid(),
          scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
          em
        )
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND));
    });
  });

  describe('updateSupportStatus', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it.each([InnovationSupportStatusEnum.CLOSED, InnovationSupportStatusEnum.WAITING])(
      'should update the support status to %s',
      async (status: InnovationSupportStatusEnum) => {
        const support = await sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          innovation.supports.supportByHealthOrgUnit.id,
          { status: status, message: randText({ charCount: 10 }) },
          em
        );

        expect(support).toMatchObject({ id: support.id });

        expect(activityLogSpy).toHaveBeenCalled();
        expect(supportLogSpy).toHaveBeenCalled();
        expect(notifierSendSpy).toHaveBeenCalled();

        const dbSupport = await em
          .createQueryBuilder(InnovationSupportEntity, 'support')
          .where('support.id = :supportId', { supportId: support.id })
          .getOne();

        expect(dbSupport?.status).toBe(status);
      }
    );

    it('should add new assigned accessors when status is changed to ENGAGING', async () => {
      const support = await sut.updateInnovationSupport(
        DTOsHelper.getUserRequestContext(scenario.users.sarahQualifyingAccessor),
        innovation.id,
        innovation.supports.supportByHealthOrgAiUnit.id,
        {
          status: InnovationSupportStatusEnum.ENGAGING,
          message: randText({ charCount: 10 }),
          accessors: [
            {
              id: scenario.users.jamieMadroxAccessor.id,
              userRoleId: scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id
            }
          ]
        },
        em
      );

      expect(support).toMatchObject({ id: support.id });

      const dbSupport = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .select(['support.id', 'userRole.id'])
        .innerJoin('support.userRoles', 'userRole')
        .where('support.id = :supportId', { supportId: support.id })
        .getOne();

      expect(dbSupport?.userRoles.map(u => u.id)).toContain(
        scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id
      );

      const dbThread = await em
        .createQueryBuilder(InnovationThreadEntity, 'thread')
        .leftJoinAndSelect('thread.followers', 'followers')
        .where('thread.contextId = :contextId', { contextId: support.id })
        .getOne();

      expect(dbThread?.followers.map(f => f.id)).toContain(
        scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id
      );
    });

    it('should add new assigned accessors when status is changed to WAITING', async () => {
      const support = await sut.updateInnovationSupport(
        DTOsHelper.getUserRequestContext(scenario.users.sarahQualifyingAccessor),
        innovation.id,
        innovation.supports.supportByHealthOrgUnit.id,
        {
          status: InnovationSupportStatusEnum.WAITING,
          message: randText({ charCount: 10 }),
          accessors: [
            {
              id: scenario.users.aliceQualifyingAccessor.id,
              userRoleId: scenario.users.aliceQualifyingAccessor.roles.qaRole.id
            }
          ]
        },
        em
      );

      expect(support).toMatchObject({ id: support.id });

      const dbSupport = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .select(['support.id', 'userRole.id'])
        .innerJoin('support.userRoles', 'userRole')
        .where('support.id = :supportId', { supportId: support.id })
        .getOne();

      expect(dbSupport?.userRoles.map(u => u.id)).toContain(scenario.users.aliceQualifyingAccessor.roles.qaRole.id);

      const dbThread = await em
        .createQueryBuilder(InnovationThreadEntity, 'thread')
        .leftJoinAndSelect('thread.followers', 'followers')
        .where('thread.contextId = :contextId', { contextId: support.id })
        .getOne();

      expect(dbThread?.followers.map(f => f.id)).toContain(scenario.users.aliceQualifyingAccessor.roles.qaRole.id);
    });

    it.each([
      [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.CLOSED],
      [InnovationSupportStatusEnum.WAITING, InnovationSupportStatusEnum.UNSUITABLE]
    ])(
      'should clear any open tasks when status is changed from %s to %s',
      async (previousStatus: InnovationSupportStatusEnum, newStatus: InnovationSupportStatusEnum) => {
        const scenarioSupport = innovation.supports.supportByHealthOrgUnit;

        if (previousStatus === InnovationSupportStatusEnum.WAITING) {
          await em.update(
            InnovationSupportEntity,
            { id: scenarioSupport.id },
            { status: InnovationSupportStatusEnum.WAITING }
          );
        }

        const support = await sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          scenarioSupport.id,
          {
            status: newStatus,
            message: randText({ charCount: 10 })
          },
          em
        );

        expect(support).toMatchObject({
          id: support.id
        });

        const dbTasks = await em
          .createQueryBuilder(InnovationTaskEntity, 'task')
          .innerJoin('task.innovationSupport', 'support')
          .where('support.id = :supportId', { supportId: support.id })
          .andWhere('task.status IN (:...taskStatusActive)', {
            taskStatusActive: [InnovationTaskStatusEnum.OPEN]
          })
          .getCount();

        expect(dbTasks).toBe(0);
      }
    );

    it.each([
      [innovation.supports.supportByHealthOrgUnit.id, InnovationSupportStatusEnum.CLOSED],
      [innovation.supports.supportByHealthOrgAiUnit.id, InnovationSupportStatusEnum.UNSUITABLE]
    ])(
      'should remove all assigned accessors when status is changed to %s',
      async (supportId: string, status: InnovationSupportStatusEnum) => {
        const support = await sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          supportId,
          {
            status: status,
            message: randText({ charCount: 10 })
          },
          em
        );

        expect(support).toMatchObject({
          id: support.id
        });

        const dbSupport = await em
          .createQueryBuilder(InnovationSupportEntity, 'support')
          .select(['support.id', 'userRole.id'])
          .leftJoin('support.userRoles', 'userRole')
          .where('support.id = :supportId', { supportId: support.id })
          .getOne();

        expect(dbSupport?.userRoles).toHaveLength(0);
      }
    );

    it.each([
      [innovation.supports.supportByHealthOrgUnit.id, InnovationSupportStatusEnum.CLOSED],
      [innovation.supports.supportByHealthOrgAiUnit.id, InnovationSupportStatusEnum.UNSUITABLE]
    ])(
      'should update finishedAt when status is changed to %s',
      async (supportId: string, status: InnovationSupportStatusEnum) => {
        const support = await sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          supportId,
          {
            status: status,
            message: randText({ charCount: 10 })
          },
          em
        );

        expect(support).toMatchObject({
          id: support.id
        });

        const dbSupport = await em
          .createQueryBuilder(InnovationSupportEntity, 'support')
          .select(['support.finishedAt'])
          .where('support.id = :supportId', { supportId: support.id })
          .getOne();

        expect(dbSupport?.finishedAt).toStrictEqual(expect.any(Date));
      }
    );

    it.each([
      [innovation.supports.supportByHealthOrgUnit.id, InnovationSupportStatusEnum.WAITING],
      [innovation.supports.supportByHealthOrgAiUnit.id, InnovationSupportStatusEnum.ENGAGING]
    ])(
      "shouldn't update finishedAt when status is changed to %s",
      async (supportId: string, status: InnovationSupportStatusEnum) => {
        const support = await sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          supportId,
          {
            status: status,
            message: randText({ charCount: 10 })
          },
          em
        );

        expect(support).toMatchObject({
          id: support.id
        });

        const dbSupport = await em
          .createQueryBuilder(InnovationSupportEntity, 'support')
          .select(['support.finishedAt'])
          .where('support.id = :supportId', { supportId: support.id })
          .getOne();

        expect(dbSupport?.finishedAt).toBeUndefined();
      }
    );

    it.each([
      InnovationSupportStatusEnum.SUGGESTED,
      InnovationSupportStatusEnum.CLOSED,
      InnovationSupportStatusEnum.UNSUITABLE
    ])('should not allow update if status is %s', async (status: InnovationSupportStatusEnum) => {
      await em.update(InnovationSupportEntity, { id: innovation.supports.supportByHealthOrgUnit.id }, { status });
      await expect(
        sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          innovation.supports.supportByHealthOrgUnit.id,
          {
            status: status,
            message: randText({ charCount: 10 })
          },
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_UPDATE_INACTIVE));
    });

    it('should send a notifyMe when status is changed', async () => {
      const context = DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor);
      const message = randText({ charCount: 10 });
      await sut.updateInnovationSupport(
        context,
        innovation.id,
        innovation.supports.supportByHealthOrgUnit.id,
        { status: InnovationSupportStatusEnum.CLOSED, message },
        em
      );

      expect(notifierSendNotifyMeSpy).toHaveBeenCalledWith(context, innovation.id, 'SUPPORT_UPDATED', {
        status: InnovationSupportStatusEnum.CLOSED,
        units: context.organisation?.organisationUnit?.id,
        message
      });
    });

    it(`should throw a not found error if the support doesn't exist`, async () => {
      await expect(() =>
        sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          randUuid(),
          {
            status: InnovationSupportStatusEnum.CLOSED,
            message: randText({ charCount: 10 })
          },
          em
        )
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND));
    });

    it(`should throw a not found error if the thread creation fails`, async () => {
      const dbThread = await em
        .createQueryBuilder(InnovationThreadEntity, 'thread')
        .where('thread.id = :threadId', {
          threadId: scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByAliceQA.id
        })
        .getOne();

      jest.spyOn(InnovationThreadsService.prototype, 'createThreadOrMessage').mockResolvedValue({
        thread: dbThread!,
        message: undefined as any
      });

      await expect(() =>
        sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          innovation.supports.supportByHealthOrgUnit.id,
          {
            status: InnovationSupportStatusEnum.CLOSED,
            message: randText({ charCount: 10 })
          },
          em
        )
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_MESSAGE_NOT_FOUND));
    });

    it(`should throw a UnprocessableEntityError when trying to update to SUGGESTED`, async () => {
      await expect(() =>
        sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          innovation.supports.supportByHealthOrgUnit.id,
          { status: InnovationSupportStatusEnum.SUGGESTED, message: randText({ charCount: 10 }) },
          em
        )
      ).rejects.toThrow(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_UPDATE_WITH_UNPROCESSABLE_STATUS)
      );
    });
  });

  describe('updateInnovationSupportAccessors', () => {
    const user = scenario.users.aliceQualifyingAccessor;
    const context = DTOsHelper.getUserRequestContext(user, 'qaRole');
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const support = innovation.supports.supportByHealthOrgUnit;
    const newAccessors = [
      {
        id: scenario.users.ingridAccessor.id,
        userRoleId: scenario.users.ingridAccessor.roles.accessorRole.id
      }
    ];
    const message = randText();

    it('should update to new accessors', async () => {
      await sut.updateInnovationSupportAccessors(
        context,
        innovation.id,
        support.id,
        { accessors: newAccessors, message },
        em
      );
      const supportRoles = (
        await em
          .createQueryBuilder(InnovationSupportEntity, 'support')
          .leftJoinAndSelect('support.userRoles', 'userRoles')
          .where('support.id = :supportId', { supportId: support.id })
          .getOneOrFail()
      ).userRoles;

      expect(supportRoles).toHaveLength(1);
      expect(supportRoles[0]!.id).toBe(scenario.users.ingridAccessor.roles.accessorRole.id);
    });

    it('should add a message to the thread if one provided', async () => {
      await sut.updateInnovationSupportAccessors(
        context,
        innovation.id,
        support.id,
        { accessors: newAccessors, message: 'Test message' },
        em
      );

      expect(threadMessageMock).toHaveBeenCalledTimes(1);
      expect(threadMessageMock).toHaveBeenCalledWith(
        context,
        innovation.threads.threadByAliceQA.id,
        'Test message',
        false,
        false,
        undefined,
        em
      );
    });

    it('should send a notification when changing the assigned', async () => {
      await sut.updateInnovationSupportAccessors(
        context,
        innovation.id,
        support.id,
        { accessors: newAccessors, message: message },
        em
      );

      expect(notifierSendSpy).toHaveBeenCalledTimes(1);
      expect(notifierSendSpy).toHaveBeenCalledWith(context, NotifierTypeEnum.SUPPORT_NEW_ASSIGN_ACCESSORS, {
        innovationId: innovation.id,
        supportId: support.id,
        threadId: innovation.threads.threadByAliceQA.id,
        message,
        newAssignedAccessorsRoleIds: newAccessors.map(a => a.userRoleId),
        removedAssignedAccessorsRoleIds: [
          scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
          scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id
        ],
        changedStatus: false
      });
    });

    it('should not send a notification nor update thread if no thread found (fix old supports #156480)', async () => {
      await em.update(InnovationThreadEntity, { contextId: support.id }, { contextId: null });
      await sut.updateInnovationSupportAccessors(
        context,
        innovation.id,
        support.id,
        { accessors: newAccessors, message: message },
        em
      );

      expect(notifierSendSpy).toHaveBeenCalledTimes(0);
      expect(threadMessageMock).toHaveBeenCalledTimes(0);
    });

    it('should fail with not found if support not found', async () => {
      await expect(
        sut.updateInnovationSupportAccessors(
          context,
          innovation.id,
          randUuid(),
          { accessors: newAccessors, message },
          em
        )
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND));
    });

    it('should fail with unprocessable if innovation status not engaging or waiting', async () => {
      await em.update(InnovationSupportEntity, { id: support.id }, { status: InnovationSupportStatusEnum.CLOSED });
      await expect(
        sut.updateInnovationSupportAccessors(
          context,
          innovation.id,
          support.id,
          { accessors: newAccessors, message },
          em
        )
      ).rejects.toThrow(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_UPDATE_WITH_UNPROCESSABLE_STATUS)
      );
    });

    it('should fail with unprocessable if accessors is empty', async () => {
      await expect(
        sut.updateInnovationSupportAccessors(context, innovation.id, support.id, { accessors: [], message })
      ).rejects.toThrow(new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD));
    });
  });

  describe('createProgressUpdate', () => {
    const user = scenario.users.aliceQualifyingAccessor;
    const innovationId = scenario.users.johnInnovator.innovations.johnInnovation.id;
    const support = scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit;

    const today = new Date();

    it('should create a support summary without a file for a unit with started support', async () => {
      const domainContext = DTOsHelper.getUserRequestContext(user, 'qaRole');
      const data: Parameters<InnovationSupportsService['createProgressUpdate']>[2] = {
        description: randText(),
        title: randText(),
        createdAt: today
      };
      const dbProgressId = randUuid();

      supportLogSpy.mockResolvedValueOnce({ id: dbProgressId });

      await em.getRepository(InnovationSupportEntity).update({ id: support.id }, { startedAt: today });

      await sut.createProgressUpdate(domainContext, innovationId, data, em);

      const fileExists = await em
        .createQueryBuilder(InnovationFileEntity, 'file')
        .where('file.contextId = :contextId', { contextId: dbProgressId })
        .andWhere('file.contextType = :contextType', {
          contextType: InnovationFileContextTypeEnum.INNOVATION_PROGRESS_UPDATE
        })
        .andWhere('file.innovation = :innovationId', { innovationId })
        .getCount();

      expect(supportLogSpy).toHaveBeenCalledWith(
        em,
        { id: domainContext.id, roleId: domainContext.currentRole.id },
        innovationId,
        {
          type: InnovationSupportLogTypeEnum.PROGRESS_UPDATE,
          description: data.description,
          supportStatus: support.status,
          unitId: domainContext.organisation?.organisationUnit?.id,
          params: { title: data.title }
        }
      );
      expect(fileExists).toBe(0);
    });

    it('should create a support summary with a file for a unit with started support', async () => {
      const domainContext = DTOsHelper.getUserRequestContext(user, 'qaRole');
      const dbProgressId = randUuid();
      const data: Parameters<InnovationSupportsService['createProgressUpdate']>[2] = {
        description: randText(),
        document: {
          name: randFileName(),
          file: {
            id: randUuid(),
            name: randFileName(),
            size: randNumber(),
            extension: randFileExt()
          }
        },
        title: randText(),
        createdAt: today
      };

      supportLogSpy.mockResolvedValueOnce({ id: dbProgressId });

      await em.getRepository(InnovationSupportEntity).update({ id: support.id }, { startedAt: today });

      await sut.createProgressUpdate(domainContext, innovationId, data, em);

      const fileExists = await em
        .createQueryBuilder(InnovationFileEntity, 'file')
        .where('file.contextId = :contextId', { contextId: dbProgressId })
        .andWhere('file.contextType = :contextType', {
          contextType: InnovationFileContextTypeEnum.INNOVATION_PROGRESS_UPDATE
        })
        .andWhere('file.innovation = :innovationId', { innovationId })
        .getCount();

      expect(supportLogSpy).toHaveBeenCalledWith(
        em,
        { id: domainContext.id, roleId: domainContext.currentRole.id },
        innovationId,
        {
          type: InnovationSupportLogTypeEnum.PROGRESS_UPDATE,
          description: data.description,
          supportStatus: support.status,
          unitId: domainContext.organisation?.organisationUnit?.id,
          params: { title: data.title }
        }
      );
      expect(fileExists).toBe(1);
    });

    it('should send a notifyMe when progress update is created', async () => {
      const context = DTOsHelper.getUserRequestContext(user);
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

      await em.getRepository(InnovationSupportEntity).update({ id: support.id }, { startedAt: today });

      await sut.createProgressUpdate(
        context,
        innovation.id,
        { description: randText(), title: randText(), createdAt: today },
        em
      );

      expect(notifierSendNotifyMeSpy).toHaveBeenCalledWith(context, innovation.id, 'PROGRESS_UPDATE_CREATED', {
        units: context.organisation?.organisationUnit?.id
      });
    });

    it('should throw an NotFoundError when the unitId is not present in context', async () => {
      await expect(() =>
        sut.createProgressUpdate(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty),
          innovationId,
          { description: randText(), title: randText(), createdAt: new Date() },
          em
        )
      ).rejects.toThrow(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
    });

    it("should throw a NotFoundError when the support doesn't exist", async () => {
      await expect(() =>
        sut.createProgressUpdate(
          DTOsHelper.getUserRequestContext(scenario.users.samAccessor, 'accessorRole'),
          scenario.users.adamInnovator.innovations.adamInnovation.id,
          { description: randText(), title: randText(), createdAt: new Date() },
          em
        )
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND));
    });

    it('should throw an UnprocessableEntityError when the unit has not yet started support with innovation', async () => {
      await em.update(InnovationSupportEntity, { id: support.id }, { status: InnovationSupportStatusEnum.WAITING });

      await expect(() =>
        sut.createProgressUpdate(
          DTOsHelper.getUserRequestContext(user, 'qaRole'),
          innovationId,
          { description: randText(), title: randText(), createdAt: new Date() },
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_UNIT_NOT_STARTED));
    });

    describe('create past progress update', () => {
      const mock = jest.spyOn(ValidationService.prototype, 'checkIfSupportHadAlreadyStartedAtDate');

      afterAll(() => mock.mockRestore());

      it('should create a progress update in the past', async () => {
        mock.mockResolvedValueOnce({ rule: 'checkIfSupportHadAlreadyStartedAtDate', valid: true });

        const pastDate = randPastDate();
        pastDate.setHours(0, 0, 0, 0);
        const pastDatePlusOneDay = new Date(pastDate);
        pastDatePlusOneDay.setDate(pastDatePlusOneDay.getDate() + 1);

        await em.update(InnovationSupportEntity, { id: support.id }, { startedAt: pastDate });

        await sut.createProgressUpdate(
          DTOsHelper.getUserRequestContext(user, 'qaRole'),
          innovationId,
          { description: randText(), title: randText(), createdAt: pastDatePlusOneDay },
          em
        );

        await em
          .createQueryBuilder(InnovationSupportLogEntity, 'log')
          .where('log.createdAt <= :createdAt', { createdAt: pastDatePlusOneDay })
          .getOneOrFail();
      });

      it('should throw an UnprocessableEntityError if the date is invalid', async () => {
        mock.mockResolvedValueOnce({ rule: 'checkIfSupportHadAlreadyStartedAtDate', valid: false });
        await expect(() =>
          sut.createProgressUpdate(
            DTOsHelper.getUserRequestContext(user, 'qaRole'),
            innovationId,
            { description: randText(), title: randText(), createdAt: randPastDate() },
            em
          )
        ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_UNIT_NOT_STARTED));
      });
    });
  });

  describe('deleteProgressUpdate', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const fileServiceDeleteSpy = jest.spyOn(InnovationFileService.prototype, 'deleteFile').mockResolvedValue();

    it('should delete a progress update without a file', async () => {
      const domainContext = DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole');
      const progressUpdate = innovation.progressUpdates.progressUpdateByAlice;

      await sut.deleteProgressUpdate(domainContext, innovation.id, progressUpdate.id, em);

      const dbProgress = await em
        .createQueryBuilder(InnovationSupportLogEntity, 'log')
        .withDeleted()
        .where('log.id = :progressId', { progressId: progressUpdate.id })
        .getOneOrFail();

      expect(dbProgress).toMatchObject({
        deletedAt: expect.any(Date),
        updatedBy: domainContext.id
      });
      expect(fileServiceDeleteSpy).toBeCalledTimes(0);
    });

    it('should delete a progress update and the associated file', async () => {
      const domainContext = DTOsHelper.getUserRequestContext(scenario.users.ingridAccessor, 'accessorRole');
      const progressUpdate = innovation.progressUpdates.progressUpdateByIngridWithFile;

      await sut.deleteProgressUpdate(domainContext, innovation.id, progressUpdate.id, em);

      const dbProgress = await em
        .createQueryBuilder(InnovationSupportLogEntity, 'log')
        .withDeleted()
        .where('log.id = :progressId', { progressId: progressUpdate.id })
        .getOneOrFail();

      expect(dbProgress).toMatchObject({
        deletedAt: expect.any(Date),
        updatedBy: domainContext.id
      });
      expect(fileServiceDeleteSpy).toBeCalledTimes(1);
    });

    it("should throw error NotFoundError if the progress update doesn't exist", async () => {
      await expect(() =>
        sut.deleteProgressUpdate(
          DTOsHelper.getUserRequestContext(scenario.users.ingridAccessor, 'accessorRole'),
          innovation.id,
          randUuid(),
          em
        )
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_SUMMARY_PROGRESS_UPDATE_NOT_FOUND));
    });

    it('should throw error UnprocessableEntityError if the progress update was created by other unit', async () => {
      await expect(() =>
        sut.deleteProgressUpdate(
          DTOsHelper.getUserRequestContext(scenario.users.jamieMadroxAccessor, 'aiRole'),
          innovation.id,
          innovation.progressUpdates.progressUpdateByAlice.id,
          em
        )
      ).rejects.toThrow(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_SUMMARY_PROGRESS_DELETE_MUST_BE_FROM_UNIT)
      );
    });
  });

  describe('getValidSupportStatuses', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const support = innovation.supports.supportByHealthOrgUnit;

    it.each([
      [
        InnovationSupportStatusEnum.SUGGESTED,
        [
          InnovationSupportStatusEnum.ENGAGING,
          InnovationSupportStatusEnum.WAITING,
          InnovationSupportStatusEnum.UNSUITABLE
        ]
      ],
      [
        InnovationSupportStatusEnum.WAITING,
        [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.UNSUITABLE]
      ],
      [InnovationSupportStatusEnum.UNSUITABLE, []],
      [InnovationSupportStatusEnum.ENGAGING, [InnovationSupportStatusEnum.WAITING, InnovationSupportStatusEnum.CLOSED]]
    ])(
      'when status is %s and wasEngaged=%s it should return %s',
      async (currentStatus: InnovationSupportStatusEnum, expected: InnovationSupportStatusEnum[]) => {
        const supportId = support.id;
        await em.getRepository(InnovationSupportEntity).update({ id: supportId }, { status: currentStatus });

        const validSupportStatuses = await sut.getValidSupportStatuses(
          innovation.id,
          supportId === support.id
            ? scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
            : scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
          em
        );

        expect(validSupportStatuses).toMatchObject(expected);
      }
    );

    it.each([
      [
        [
          InnovationSupportStatusEnum.UNSUITABLE,
          InnovationSupportStatusEnum.WAITING,
          InnovationSupportStatusEnum.ENGAGING
        ]
      ]
    ])("should return %s if support doesn't exist", async (expected: InnovationSupportStatusEnum[]) => {
      const validSupportStatuses = await sut.getValidSupportStatuses(innovation.id, randUuid(), em);
      expect(validSupportStatuses).toEqual(expect.arrayContaining(expected));
    });
  });
});
