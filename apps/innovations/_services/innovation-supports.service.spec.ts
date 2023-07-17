/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { container } from '../_config';

import {
  InnovationActionEntity,
  InnovationSupportEntity,
  InnovationSupportLogEntity,
  InnovationThreadEntity
} from '@innovations/shared/entities';
import {
  InnovationActionStatusEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  NotificationContextTypeEnum
} from '@innovations/shared/enums';
import {
  InnovationErrorsEnum,
  NotFoundError,
  OrganisationErrorsEnum,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import { DomainInnovationsService, NotifierService } from '@innovations/shared/services';
import { TestsHelper } from '@innovations/shared/tests';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { randText, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import type { InnovationSupportsService } from './innovation-supports.service';
import { InnovationThreadsService } from './innovation-threads.service';
import SYMBOLS from './symbols';

describe('Innovations / _services / innovation-supports suite', () => {
  let sut: InnovationSupportsService;

  let em: EntityManager;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  // Setup global mocks for these tests
  const activityLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog');
  const supportLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addSupportLog');
  const notifierSendSpy = jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

  beforeAll(async () => {
    sut = container.get<InnovationSupportsService>(SYMBOLS.InnovationSupportsService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
    activityLogSpy.mockReset();
    supportLogSpy.mockReset();
    notifierSendSpy.mockReset();
  });

  describe('getInnovationSupportsList', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

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
              organisationUnitUserId:
                scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit
                  .organisationUnitUser.id,
              name: scenario.users.aliceQualifyingAccessor.name
            },
            {
              id: scenario.users.jamieMadroxAccessor.id,
              organisationUnitUserId:
                scenario.users.jamieMadroxAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit
                  .organisationUnitUser.id,
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
              organisationUnitUserId:
                scenario.users.samAccessor.organisations.medTechOrg.organisationUnits.medTechOrgUnit
                  .organisationUnitUser.id,
              name: scenario.users.samAccessor.name
            }
          ]
        }
      ]);
    });

    it(`should throw a not found error when the innovation doesn't exist`, async () => {
      await expect(() => sut.getInnovationSupportsList(randUuid(), { fields: [] }, em)).rejects.toThrowError(
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
            organisationUnitUserId:
              scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit
                .organisationUnitUser.id,
            name: scenario.users.aliceQualifyingAccessor.name
          },
          {
            id: scenario.users.jamieMadroxAccessor.id,
            organisationUnitUserId:
              scenario.users.jamieMadroxAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit
                .organisationUnitUser.id,
            name: scenario.users.jamieMadroxAccessor.name
          }
        ]
      });
    });

    it(`should throw a not found error if the support doesn't exist`, async () => {
      await expect(() => sut.getInnovationSupportInfo(randUuid(), em)).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND)
      );
    });
  });

  describe('createInnovationSupport', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('should create a support', async () => {
      const support = await sut.createInnovationSupport(
        DTOsHelper.getUserRequestContext(scenario.users.bartQualifyingAccessor),
        scenario.users.adamInnovator.innovations.adamInnovation.id,
        {
          status: InnovationSupportStatusEnum.ENGAGING,
          message: randText({ charCount: 10 }),
          accessors: [
            {
              id: scenario.users.jamieMadroxAccessor.id,
              organisationUnitUserId:
                scenario.users.jamieMadroxAccessor.organisations.healthOrg.organisationUnits.healthOrgAiUnit
                  .organisationUnitUser.id
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

    it('should throw an unprocessable entity error if the domain context has an invalid organisation unit id', async () => {
      await expect(() =>
        sut.createInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty),
          innovation.id,
          {
            status: InnovationSupportStatusEnum.ENGAGING,
            message: randText({ charCount: 10 })
          },
          em
        )
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_WITH_UNPROCESSABLE_ORGANISATION_UNIT)
      );
    });

    it(`should throw a not found error if the organisation unit doesn't exist`, async () => {
      const domainContext = DTOsHelper.getUserRequestContext(scenario.users.bartQualifyingAccessor);
      if (domainContext.organisation?.organisationUnit) {
        domainContext.organisation.organisationUnit.id = randUuid();
      }

      await expect(() =>
        sut.createInnovationSupport(
          domainContext,
          innovation.id,
          {
            status: InnovationSupportStatusEnum.ENGAGING,
            message: randText({ charCount: 10 })
          },
          em
        )
      ).rejects.toThrowError(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
    });

    it('should throw an unprocessable entity error if the support already exists', async () => {
      await expect(() =>
        sut.createInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          {
            status: InnovationSupportStatusEnum.ENGAGING,
            message: randText({ charCount: 10 })
          },
          em
        )
      ).rejects.toThrowError(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_ALREADY_EXISTS));
    });

    it('should throw an unprocessable entity error if the accessors argument exists and the status is not ENGAGING', async () => {
      await expect(() =>
        sut.createInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          {
            status: InnovationSupportStatusEnum.UNASSIGNED,
            message: randText({ charCount: 10 }),
            accessors: [
              {
                id: scenario.users.aliceQualifyingAccessor.id,
                organisationUnitUserId:
                  scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit
                    .organisationUnitUser.id
              }
            ]
          },
          em
        )
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_CANNOT_HAVE_ASSIGNED_ASSESSORS)
      );
    });
  });

  describe('updateSupportStatus', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it.each([
      InnovationSupportStatusEnum.COMPLETE,
      InnovationSupportStatusEnum.ENGAGING,
      InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED,
      InnovationSupportStatusEnum.NOT_YET,
      InnovationSupportStatusEnum.UNASSIGNED,
      InnovationSupportStatusEnum.UNSUITABLE,
      InnovationSupportStatusEnum.WAITING,
      InnovationSupportStatusEnum.WITHDRAWN
    ])('should update the support status to %s', async (status: InnovationSupportStatusEnum) => {
      const support = await sut.updateInnovationSupport(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id,
        innovation.supports.supportByHealthOrgUnit.id,
        {
          status: status,
          message: randText({ charCount: 10 })
        },
        em
      );

      expect(support).toMatchObject({
        id: support.id
      });

      expect(activityLogSpy).toHaveBeenCalled();
      expect(supportLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();

      const dbSupport = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .where('support.id = :supportId', { supportId: support.id })
        .getOne();

      expect(dbSupport?.status).toBe(status);
    });

    it('should add new assigned accessors when status is changed to ENGAGING', async () => {
      const support = await sut.updateInnovationSupport(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id,
        innovation.supports.supportByHealthOrgUnit.id,
        {
          status: InnovationSupportStatusEnum.ENGAGING,
          message: randText({ charCount: 10 }),
          accessors: [
            {
              id: scenario.users.ingridAccessor.id,
              organisationUnitUserId:
                scenario.users.ingridAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit
                  .organisationUnitUser.id
            }
          ]
        },
        em
      );

      expect(support).toMatchObject({
        id: support.id
      });

      const dbSupport = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .select(['support.id', 'orgUnitUser.id'])
        .innerJoin('support.organisationUnitUsers', 'orgUnitUser')
        .where('support.id = :supportId', { supportId: support.id })
        .getOne();

      expect(dbSupport?.organisationUnitUsers.map(u => u.id)).toContain(
        scenario.users.ingridAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.organisationUnitUser.id
      );
    });

    it.each([
      [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.COMPLETE],
      [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.NOT_YET],
      [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.UNASSIGNED],
      [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.UNSUITABLE],
      [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.WAITING],
      [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.WITHDRAWN],
      [InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED, InnovationSupportStatusEnum.COMPLETE],
      [InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED, InnovationSupportStatusEnum.NOT_YET],
      [InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED, InnovationSupportStatusEnum.UNASSIGNED],
      [InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED, InnovationSupportStatusEnum.UNSUITABLE],
      [InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED, InnovationSupportStatusEnum.WAITING],
      [InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED, InnovationSupportStatusEnum.WITHDRAWN]
    ])(
      'should clear any open actions when status is changed from %s to %s',
      async (previousStatus: InnovationSupportStatusEnum, newStatus: InnovationSupportStatusEnum) => {
        let scenarioSupport:
          | typeof innovation.supports.supportByHealthOrgUnit
          | typeof innovation.supports.supportByHealthOrgAiUnit = innovation.supports.supportByHealthOrgUnit;

        if (previousStatus === InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED) {
          scenarioSupport = innovation.supports.supportByHealthOrgAiUnit;
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

        const dbActions = await em
          .createQueryBuilder(InnovationActionEntity, 'action')
          .innerJoin('action.innovationSupport', 'support')
          .where('support.id = :supportId', { supportId: support.id })
          .andWhere('action.status IN (:...actionStatusActive)', {
            actionStatusActive: [InnovationActionStatusEnum.REQUESTED, InnovationActionStatusEnum.SUBMITTED]
          })
          .getCount();

        expect(dbActions).toBe(0);
      }
    );

    it.each([
      InnovationSupportStatusEnum.COMPLETE,
      InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED,
      InnovationSupportStatusEnum.NOT_YET,
      InnovationSupportStatusEnum.UNASSIGNED,
      InnovationSupportStatusEnum.UNSUITABLE,
      InnovationSupportStatusEnum.WAITING,
      InnovationSupportStatusEnum.WITHDRAWN
    ])(
      'should remove all assigned accessors when status is changed to %s',
      async (status: InnovationSupportStatusEnum) => {
        const support = await sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          innovation.supports.supportByHealthOrgUnit.id,
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
          .select(['support.id', 'orgUnitUser.id'])
          .leftJoin('support.organisationUnitUsers', 'orgUnitUser')
          .where('support.id = :supportId', { supportId: support.id })
          .getOne();

        expect(dbSupport?.organisationUnitUsers).toHaveLength(0);
      }
    );

    it(`should throw a not found error if the support doesn't exist`, async () => {
      await expect(() =>
        sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          randUuid(),
          {
            status: InnovationSupportStatusEnum.COMPLETE,
            message: randText({ charCount: 10 })
          },
          em
        )
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND));
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
        message: undefined
      });

      await expect(() =>
        sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          innovation.supports.supportByHealthOrgUnit.id,
          {
            status: InnovationSupportStatusEnum.COMPLETE,
            message: randText({ charCount: 10 })
          },
          em
        )
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_MESSAGE_NOT_FOUND));
    });
  });

  describe('createProgressUpdate', () => {
    const innovationId = scenario.users.johnInnovator.innovations.johnInnovation.id;

    it('should create a support summary when a unit is engaging', async () => {
      const domainContext = DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole');
      const data = { title: randText(), description: randText() };

      await sut.createProgressUpdate(domainContext, innovationId, data, em);

      const dbProgress = await em
        .createQueryBuilder(InnovationSupportLogEntity, 'log')
        .where('log.innovation_id = :innovationId', { innovationId })
        .andWhere('log.organisation_unit_id = :unitId', { unitId: domainContext.organisation?.organisationUnit?.id })
        .andWhere('log.description = :description', { description: data.description })
        .getOneOrFail();

      expect(dbProgress).toMatchObject({
        params: { title: data.title },
        description: data.description,
        type: InnovationSupportLogTypeEnum.PROGRESS_UPDATE
      });
    });

    it('should throw an UnprocessableEntityError when the unitId is not present in context', async () => {
      await expect(() =>
        sut.createProgressUpdate(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty),
          innovationId,
          { title: randText(), description: randText() },
          em
        )
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_WITH_UNPROCESSABLE_ORGANISATION_UNIT)
      );
    });

    it("should throw a NotFoundError when the support doesn't exist", async () => {
      await expect(() =>
        sut.createProgressUpdate(
          DTOsHelper.getUserRequestContext(scenario.users.samAccessor, 'accessorRole'),
          scenario.users.adamInnovator.innovations.adamInnovation.id,
          { title: randText(), description: randText() },
          em
        )
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND));
    });

    it('should throw an UnprocessableEntityError when the unit is not currently engaging', async () => {
      await em.update(
        InnovationSupportEntity,
        { id: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit.id },
        { status: InnovationSupportStatusEnum.NOT_YET }
      );

      await expect(() =>
        sut.createProgressUpdate(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole'),
          innovationId,
          { title: randText(), description: randText() },
          em
        )
      ).rejects.toThrowError(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_UNIT_NOT_ENGAGING));
    });
  });
});
