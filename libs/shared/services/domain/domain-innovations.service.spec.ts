import { randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { container } from '../../config/inversify.config';
import { InnovationDocumentEntity, InnovationEntity } from '../../entities';
import { InnovationGroupedStatusEnum, UserStatusEnum } from '../../enums';
import { BadRequestError, InnovationErrorsEnum } from '../../errors';
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
        statusUpdatedAt: expect.any(Date),
        groupedStatus: InnovationGroupedStatusEnum.RECEIVING_SUPPORT,
        submittedAt: expect.any(Date),
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

        shares: [
          scenario.organisations.healthOrg.id,
          scenario.organisations.medTechOrg.id,
          scenario.organisations.innovTechOrg.id
        ],
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

  describe('getInnovationInnovatorsRoleId', () => {
    it('should return all active collaborators and owner of innovation', async () => {
      const john = scenario.users.johnInnovator;
      const jane = scenario.users.janeInnovator;

      const targets = await sut.getInnovationInnovatorsRoleId(john.innovations.johnInnovation.id, em);

      expect(targets).toMatchObject([john.roles.innovatorRole.id, jane.roles.innovatorRole.id]);
    });
  });

  describe('getInnovationsFiltered', () => {
    it.each([
      ['all', false],
      ['submitted', true]
    ])('should filter %s innovations', async (_type: string, onlySubmitted: boolean) => {
      const innovations = await sut.getInnovationsFiltered(
        [
          { section: 'INNOVATION_DESCRIPTION', question: 'areas', answers: ['COVID_19'] },
          { section: 'UNDERSTANDING_OF_NEEDS', question: 'hasProductServiceOrPrototype', answers: ['NO'] }
        ],
        { onlySubmitted },
        em
      );

      const dbFilteredQuery = em
        .createQueryBuilder(InnovationDocumentEntity, 'document')
        .where(`JSON_QUERY(document.document, '$.INNOVATION_DESCRIPTION.areas') LIKE '%COVID_19%'`)
        .andWhere(`JSON_VALUE(document.document, '$.UNDERSTANDING_OF_NEEDS.hasProductServiceOrPrototype') = 'NO'`);

      if (onlySubmitted) {
        dbFilteredQuery.innerJoin('document.innovation', 'innovation').andWhere('innovation.submittedAt IS NOT NULL');
      }
      const dbFilteredCount = await dbFilteredQuery.getCount();

      expect(innovations.length).toBe(dbFilteredCount);
    });

    it('should filter the same question twice, question1 === A AND question1 === B', async () => {
      const innovations = await sut.getInnovationsFiltered(
        [
          { section: 'INNOVATION_DESCRIPTION', question: 'categories', answers: ['MEDICAL_DEVICE'] },
          { section: 'INNOVATION_DESCRIPTION', question: 'categories', answers: ['INVALID'] }
        ],
        { onlySubmitted: false },
        em
      );

      // Since it's a AND and INVALID doesn't exist it should return 0 results.
      expect(innovations.length).toBe(0);
    });

    it('should filter correctly when the question is of type checkbox-array + addQuestion', async () => {
      const innovations = await sut.getInnovationsFiltered(
        [
          { section: 'REGULATIONS_AND_STANDARDS', question: 'standards', answers: ['CE_UKCA_CLASS_I'] },
          { section: 'REGULATIONS_AND_STANDARDS', question: 'standards', answers: ['IVD_GENERAL'] }
        ],
        { onlySubmitted: false },
        em
      );

      const dbFilteredQuery = await em
        .createQueryBuilder(InnovationDocumentEntity, 'document')
        .where(
          `
                  EXISTS (
                    SELECT TOP 1 *
                    FROM OPENJSON(JSON_QUERY(document.document, '$.REGULATIONS_AND_STANDARDS.standards'))
                    WHERE JSON_VALUE(value, '$.type') IN ('CE_UKCA_CLASS_I')
                  )
                `
        )
        .andWhere(
          `
                  EXISTS (
                    SELECT TOP 1 *
                    FROM OPENJSON(JSON_QUERY(document.document, '$.REGULATIONS_AND_STANDARDS.standards'))
                    WHERE JSON_VALUE(value, '$.type') IN ('IVD_GENERAL')
                  )
                `
        )
        .getCount();

      expect(innovations.length).toBe(dbFilteredQuery);
    });

    it('should filter all innovations even if some of the filters are invalid', async () => {
      const innovations = await sut.getInnovationsFiltered(
        [
          { section: 'INNOVATION_DESCRIPTION', question: 'INVALID_QUESTION', answers: ['COVID_19'] },
          { section: 'INVALID_SECTION', question: 'hasProductServiceOrPrototype', answers: ['NO'] },
          { section: 'UNDERSTANDING_OF_NEEDS', question: 'hasProductServiceOrPrototype', answers: ['NO'] }
        ],
        { onlySubmitted: false },
        em
      );

      const dbFilteredCount = await em
        .createQueryBuilder(InnovationDocumentEntity, 'document')
        .where(`JSON_VALUE(document.document, '$.UNDERSTANDING_OF_NEEDS.hasProductServiceOrPrototype') = 'NO'`)
        .getCount();

      expect(innovations.length).toBe(dbFilteredCount);
    });

    it('should throw error when no valid filters are available', async () => {
      await expect(() =>
        sut.getInnovationsFiltered(
          [
            { section: 'INNOVATION_DESCRIPTION', question: 'INVALID_QUESTION', answers: ['COVID_19'] },
            { section: 'INVALID_SECTION', question: 'hasProductServiceOrPrototype', answers: ['NO'] }
          ],
          {},
          em
        )
      ).rejects.toThrow(new BadRequestError(InnovationErrorsEnum.INNOVATION_FILTERS_ALL_INVALID));
    });

    it('should throw error when no filters were defined', async () => {
      await expect(() => sut.getInnovationsFiltered([], {}, em)).rejects.toThrow(
        new BadRequestError(InnovationErrorsEnum.INNOVATION_FILTERS_EMPTY)
      );
    });
  });
});
