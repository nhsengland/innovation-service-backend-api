import type { EntityManager } from 'typeorm';
import { randUuid } from '@ngneat/falso';

import { TestDataType, TestsLegacyHelper } from '@users/shared/tests/tests-legacy.helper';
import { NotFoundError, OrganisationErrorsEnum } from '@users/shared/errors';

import { container } from '../_config';

import type { OrganisationsService } from './organisations.service';
import SYMBOLS from './symbols';

describe('Innovation Assessments Suite', () => {
  let sut: OrganisationsService;
  let testData: TestDataType;
  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<OrganisationsService>(SYMBOLS.OrganisationsService);
    await TestsLegacyHelper.init();
    testData = TestsLegacyHelper.sampleData;
  });

  beforeEach(async () => {
    em = await TestsLegacyHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await TestsLegacyHelper.releaseQueryRunnerEntityManager(em);
  });

  describe('getOrganisationInfo', () => {
    it('should get the organisation info', async () => {
      const organisationInfo = await sut.getOrganisationInfo(testData.organisation.accessor.id, true, em);

      const org = testData.organisation.accessor;
      const unit = testData.organisationUnit.accessor;

      expect(organisationInfo).toStrictEqual({
        id: org.id,
        name: org.name,
        acronym: org.acronym,
        organisationUnits: [
          {
            id: unit.id,
            name: unit.name,
            acronym: unit.acronym,
            isActive: !unit.inactivatedAt,
            userCount: 2 // unit has QA and A users
          }
        ],
        isActive: !org.inactivatedAt
      });
    });

    it('should not get organisation info if it does not exist', async () => {
      let err: NotFoundError | null = null;

      try {
        await sut.getOrganisationInfo(randUuid());
      } catch (error) {
        err = error as NotFoundError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND);
    });
  });
});
