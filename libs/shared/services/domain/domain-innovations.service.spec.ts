import { randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { container } from '../../config/inversify.config';
import { InnovationEntity } from '../../entities';
import { InnovationGroupedStatusEnum, InnovationStatusEnum, UserStatusEnum } from '../../enums';
import { TestsHelper } from '../../tests';
import SHARED_SYMBOLS from '../symbols';
import type { DomainInnovationsService } from './domain-innovations.service';
import type { DomainService } from './domain.service';

describe('Shared / services / innovations suite', () => {
  let sut: DomainInnovationsService;
  const testsHelper = new TestsHelper();
  let em: EntityManager;
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
    sut = container.get<DomainService>(SHARED_SYMBOLS.DomainService).innovations;
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
    jest.clearAllMocks();
  });

  describe('getESDocumentsInformation', () => {
    it('should should fetch all innovations', async () => {
      const innovations = await em.getRepository(InnovationEntity).find();
      const result = await sut.getESDocumentsInformation();
      expect(result.length).toBe(innovations.length);
    });

    it('should map the innovations to the ES document format', async () => {
      const result = await sut.getESDocumentsInformation();
      const user = scenario.users.johnInnovator;
      const innovation = user.innovations.johnInnovation;
      const innovationResult = result.find(x => x.id === innovation.id);
      expect(innovationResult).toMatchObject({
        id: innovation.id,
        status: innovation.status,
        rawStatus: innovation.status, // not archived
        archivedStatus: null,
        statusUpdatedAt: expect.any(Date),
        groupedStatus: InnovationGroupedStatusEnum.RECEIVING_SUPPORT,
        submittedAt: null, // I believe this shouldn't be null but it's the current seed
        updatedAt: expect.any(Date),
        lastAssessmentRequestAt: null, // I believe this shouldn't be null but it's the current seed
        document: expect.anything(), // TODO
        owner: { id: user.id, identityId: user.identityId, status: UserStatusEnum.ACTIVE },
        engagingOrganisations: [scenario.organisations.healthOrg, scenario.organisations.medTechOrg].map(x => ({
          organisationId: x.id,
          name: x.name,
          acronym: x.acronym
        })),
        engagingUnits: [
          {
            unitId: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
            name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
            acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym,
            assignedAccessors: [scenario.users.aliceQualifyingAccessor, scenario.users.jamieMadroxAccessor].map(x => ({
              roleId: expect.any(String),
              userId: x.id,
              identityId: x.identityId
            }))
          },
          {
            unitId: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
            name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
            acronym: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.acronym,
            assignedAccessors: [scenario.users.samAccessor].map(x => ({
              roleId: x.roles.accessorRole.id,
              userId: x.id,
              identityId: x.identityId
            }))
          }
        ],

        shares: [scenario.organisations.healthOrg.id, scenario.organisations.medTechOrg.id],
        supports: expect.anything(), // hard to create the schema
        assessment: {
          id: expect.any(String),
          assignedToId: scenario.users.paulNeedsAssessor.id,
          updatedAt: expect.any(String),
          isExempt: false
        },
        suggestions: expect.anything() // hard to create the schema
      });
    });

    it('should map rawStatus to archivedStatus if archived', async () => {
      const result = await sut.getESDocumentsInformation();
      const user = scenario.users.johnInnovator;
      const innovation = user.innovations.johnInnovationArchived;
      const innovationResult = result.find(x => x.id === innovation.id);
      expect(innovationResult).toMatchObject({
        status: innovation.status,
        archivedStatus: InnovationStatusEnum.IN_PROGRESS,
        rawStatus: InnovationStatusEnum.IN_PROGRESS
      });
    });

    // this might change in the future
    it('should handle translations', async () => {
      const result = await sut.getESDocumentsInformation();
      const user = scenario.users.johnInnovator;
      const innovation = user.innovations.johnInnovationArchived;
      const innovationResult = result.find(x => x.id === innovation.id);
      expect(innovationResult?.document.INNOVATION_DESCRIPTION).toMatchObject({
        categories: ['Medical device', 'Artificial intelligence (AI)'],
        mainCategory: 'Medical device'
      });
    });

    it('should handle single innovation request', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const result = await sut.getESDocumentsInformation(innovation.id);
      expect(result?.id).toBe(innovation.id);
    });

    it('should handle single innovation request for non existing', async () => {
      const result = await sut.getESDocumentsInformation(randUuid());
      expect(result).toBe(undefined);
    });
  });
});
