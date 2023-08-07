import { container } from '../_config';

import { InnovationExportRequestEntity } from '@innovations/shared/entities';
import { InnovationExportRequestStatusEnum } from '@innovations/shared/enums';
import {
  ForbiddenError,
  InnovationErrorsEnum,
  NotFoundError,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import { TranslationHelper } from '@innovations/shared/helpers';
import { TestsHelper } from '@innovations/shared/tests';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import type { DomainContextType } from '@innovations/shared/types';
import { randText, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import type { InnovationExportRequestService } from './innovation-export-request.service';
import SYMBOLS from './symbols';

describe('Innovations / _services / innovation export request suite', () => {
  let sut: InnovationExportRequestService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<InnovationExportRequestService>(SYMBOLS.InnovationExportRequestService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('createExportRequest', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it.each([
      ['QA', DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole')],
      ['A', DTOsHelper.getUserRequestContext(scenario.users.ingridAccessor, 'accessorRole')],
      ['NA', DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor, 'assessmentRole')]
    ])('should create a export request as a %s', async (_role: string, domainContext: DomainContextType) => {
      const data = { requestReason: randText() };

      await sut.createExportRequest(domainContext, innovation.id, data, em);

      const dbRequest = await em
        .createQueryBuilder(InnovationExportRequestEntity, 'request')
        .select(['request.id', 'request.requestReason', 'request.status', 'userRole.id'])
        .innerJoin('request.createdByUserRole', 'userRole')
        .where('request.requestReason = :requestReason', { requestReason: data.requestReason })
        .andWhere('request.created_by_user_role_id = :roleId', { roleId: domainContext.currentRole.id })
        .getOneOrFail();

      expect(dbRequest).toMatchObject({
        id: expect.any(String),
        requestReason: data.requestReason,
        status: InnovationExportRequestStatusEnum.PENDING,
        createdByUserRole: { id: domainContext.currentRole.id }
      });
    });
  });

  describe('getExportRequestInfo', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const aliceRequest = innovation.exportRequests.requestByAlice;
    const paulRequest = innovation.exportRequests.requestByPaulRejected;

    it.each([
      [DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole')],
      [DTOsHelper.getUserRequestContext(scenario.users.ingridAccessor, 'accessorRole')],
      [DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole')]
    ])(
      'should return the information of a export request when created by the same unit',
      async (domainContext: DomainContextType) => {
        const createdByUser = scenario.users.aliceQualifyingAccessor;

        const request = await sut.getExportRequestInfo(domainContext, aliceRequest.id, em);

        expect(request).toMatchObject({
          id: aliceRequest.id,
          requestReason: aliceRequest.requestReason,
          status: aliceRequest.status,
          createdAt: expect.any(Date),
          createdBy: {
            name: createdByUser.name,
            displayRole: TranslationHelper.translate('SERVICE_ROLES.QUALIFYING_ACCESSOR'),
            displayTeam: createdByUser.organisations.healthOrg.organisationUnits.healthOrgUnit.name
          },
          updatedAt: expect.any(Date),
          updatedBy: { name: createdByUser.name }
        });
      }
    );

    it.each([
      [DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor, 'assessmentRole')],
      [DTOsHelper.getUserRequestContext(scenario.users.seanNeedsAssessor, 'assessmentRole')],
      [DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole')]
    ])(
      'should return the information of a export request when created by the NA team',
      async (domainContext: DomainContextType) => {
        const createdByUser = scenario.users.paulNeedsAssessor;

        const request = await sut.getExportRequestInfo(domainContext, paulRequest.id, em);

        expect(request).toMatchObject({
          id: paulRequest.id,
          requestReason: paulRequest.requestReason,
          rejectReason: paulRequest.rejectReason,
          status: paulRequest.status,
          createdAt: expect.any(Date),
          createdBy: {
            name: createdByUser.name,
            displayRole: TranslationHelper.translate('SERVICE_ROLES.ASSESSMENT'),
            displayTeam: TranslationHelper.translate('TEAMS.ASSESSMENT')
          },
          updatedAt: expect.any(Date),
          updatedBy: { name: createdByUser.name }
        });
      }
    );

    it("should return NotFoundError if the export request doesn't exist", async () => {
      await expect(() =>
        sut.getExportRequestInfo(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole'),
          randUuid(),
          em
        )
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_EXPORT_REQUEST_NOT_FOUND));
    });

    it.each([
      [DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor, 'assessmentRole'), aliceRequest.id],
      [DTOsHelper.getUserRequestContext(scenario.users.samAccessor, 'accessorRole'), aliceRequest.id],
      [DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole'), paulRequest.id]
    ])(
      'should return NotFoundError if the export request is from a different team',
      async (domainContext: DomainContextType, requestId: string) => {
        await expect(() => sut.getExportRequestInfo(domainContext, requestId, em)).rejects.toThrowError(
          new NotFoundError(InnovationErrorsEnum.INNOVATION_EXPORT_REQUEST_NOT_FOUND)
        );
      }
    );
  });

  describe('getExportRequestList', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const aliceRequest = innovation.exportRequests.requestByAlice;
    const ingridRequest = innovation.exportRequests.requestByIngrid;
    const paulRequest = innovation.exportRequests.requestByPaulRejected;
    const paulPendingRequest = innovation.exportRequests.requestByPaulPending;

    it('should return the all PENDING requests related to the unit', async () => {
      const result = await sut.getExportRequestList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        innovation.id,
        {
          statuses: [InnovationExportRequestStatusEnum.PENDING]
        },
        { order: { createdAt: 'ASC' }, take: 20, skip: 0 },
        em
      );

      expect(result.count).toBe(2);
      expect(result.data).toMatchObject([
        {
          id: aliceRequest.id,
          status: aliceRequest.status,
          createdBy: {
            name: scenario.users.aliceQualifyingAccessor.name,
            displayRole: TranslationHelper.translate('SERVICE_ROLES.QUALIFYING_ACCESSOR'),
            displayTeam:
              scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
          },
          createdAt: expect.any(Date)
        },
        {
          id: ingridRequest.id,
          status: ingridRequest.status,
          createdBy: {
            name: scenario.users.ingridAccessor.name,
            displayRole: TranslationHelper.translate('SERVICE_ROLES.ACCESSOR'),
            displayTeam: scenario.users.ingridAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
          },
          createdAt: expect.any(Date)
        }
      ]);
      expect(result.data.every((s, i) => i === 0 || s.createdAt! >= result.data[i - 1]!.createdAt!)).toBeTruthy();
    });

    it('should return the all the requests related to the NA team', async () => {
      const result = await sut.getExportRequestList(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor, 'assessmentRole'),
        innovation.id,
        {},
        { order: { createdAt: 'ASC' }, take: 20, skip: 0 },
        em
      );

      expect(result.count).toBe(2);
      expect(result.data).toMatchObject([
        {
          id: paulRequest.id,
          status: paulRequest.status,
          createdBy: {
            name: scenario.users.paulNeedsAssessor.name,
            displayRole: TranslationHelper.translate('SERVICE_ROLES.ASSESSMENT'),
            displayTeam: TranslationHelper.translate('TEAMS.ASSESSMENT')
          },
          createdAt: expect.any(Date)
        },
        {
          id: paulPendingRequest.id,
          status: paulPendingRequest.status,
          createdBy: {
            name: scenario.users.paulNeedsAssessor.name,
            displayRole: TranslationHelper.translate('SERVICE_ROLES.ASSESSMENT'),
            displayTeam: TranslationHelper.translate('TEAMS.ASSESSMENT')
          },
          createdAt: expect.any(Date)
        }
      ]);
    });

    it.each([
      [2, DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor, 'assessmentRole')],
      [1, DTOsHelper.getUserRequestContext(scenario.users.samAccessor, 'accessorRole')],
      [2, DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole')],
      [0, DTOsHelper.getUserRequestContext(scenario.users.bartQualifyingAccessor, 'qaRole')],
      [5, DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole')]
    ])('should return %s results', async (count: number, domainContext: DomainContextType) => {
      const result = await sut.getExportRequestList(
        domainContext,
        innovation.id,
        {},
        { order: { createdAt: 'ASC' }, take: 1, skip: 0 },
        em
      );
      expect(result.count).toBe(count);
    });
  });

  describe('updateExportRequest', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const pendingAliceRequest = innovation.exportRequests.requestByAlice;
    const pendingPaulRequest = innovation.exportRequests.requestByPaulPending;
    const rejectedPaulRequest = innovation.exportRequests.requestByPaulRejected;

    const johnContext = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole');
    const aliceContext = DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole');
    const paulContext = DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor, 'assessmentRole');

    it.each([
      [InnovationExportRequestStatusEnum.APPROVED, 'innovator', johnContext, pendingAliceRequest.id],
      [InnovationExportRequestStatusEnum.REJECTED, 'innovator', johnContext, pendingAliceRequest.id],
      [InnovationExportRequestStatusEnum.CANCELLED, 'QA', aliceContext, pendingAliceRequest.id],
      [InnovationExportRequestStatusEnum.APPROVED, 'innovator', johnContext, pendingPaulRequest.id],
      [InnovationExportRequestStatusEnum.REJECTED, 'innovator', johnContext, pendingPaulRequest.id],
      [InnovationExportRequestStatusEnum.CANCELLED, 'NA', paulContext, pendingPaulRequest.id]
    ])(
      'should update a request to %s as a %s',
      async (
        status: InnovationExportRequestStatusEnum,
        _user: string,
        domainContext: DomainContextType,
        requestId: string
      ) => {
        const rejectReason = status === InnovationExportRequestStatusEnum.REJECTED ? randText() : undefined;
        await sut.updateExportRequest(domainContext, requestId, { status, rejectReason }, em);

        const dbRequest = await em
          .createQueryBuilder(InnovationExportRequestEntity, 'request')
          .where('request.id = :requestId', { requestId })
          .getOneOrFail();

        expect(dbRequest).toMatchObject({
          status,
          rejectReason: rejectReason ?? null,
          updatedBy: domainContext.id
        });
      }
    );

    it("should return NotFoundError when request doesn't exist", async () => {
      await expect(() =>
        sut.updateExportRequest(johnContext, randUuid(), { status: InnovationExportRequestStatusEnum.APPROVED }, em)
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_EXPORT_REQUEST_NOT_FOUND));
    });

    it("should return UnprocessableEntityError when request current status isn't PENDING", async () => {
      await expect(() =>
        sut.updateExportRequest(
          johnContext,
          rejectedPaulRequest.id,
          { status: InnovationExportRequestStatusEnum.APPROVED },
          em
        )
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_RECORD_EXPORT_REQUEST_WITH_UNPROCESSABLE_STATUS)
      );
    });

    it.each([
      ['NA', 'QA/A', paulContext, pendingAliceRequest.id],
      ['QA/A', 'NA', aliceContext, pendingPaulRequest.id]
    ])(
      'should return ForbiddenError when a %s tries to update a %s request',
      async (_: string, __: string, domainContext: DomainContextType, requestId: string) => {
        await expect(() =>
          sut.updateExportRequest(domainContext, requestId, { status: InnovationExportRequestStatusEnum.CANCELLED }, em)
        ).rejects.toThrowError(
          new ForbiddenError(InnovationErrorsEnum.INNOVATION_RECORD_EXPORT_REQUEST_NO_PERMISSION_TO_UPDATE)
        );
      }
    );
  });
});
