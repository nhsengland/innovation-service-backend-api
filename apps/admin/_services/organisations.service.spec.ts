import { NotFoundError, OrganisationErrorsEnum } from '@admin/shared/errors';
import { NOSQLConnectionService } from '@admin/shared/services';
import { CacheService } from '@admin/shared/services/storage/cache.service';
import { TestDataType, TestsHelper } from '@admin/shared/tests/tests.helper';
import { randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { container } from '../_config';
import { OrganisationsServiceSymbol, OrganisationsServiceType } from './interfaces';


describe('Innovation Assessments Suite', () => {

  let sut: OrganisationsServiceType;

  let testData: TestDataType;
  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<OrganisationsServiceType>(OrganisationsServiceSymbol);
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

  describe('getOrganisationInfo', () => {
    it('should get the organisation info', async () => {

      const organisationInfo = await sut.getOrganisationInfo(testData.organisation.accessor.id);
      
      const org = testData.organisation.accessor;
      const unit = testData.organisationUnit.accessor;

      expect(organisationInfo).toStrictEqual({
        id: org.id,
        name: org.name,
        acronym: org.acronym,
        organisationUnits: [{
          id: unit.id,
          name: unit.name,
          acronym: unit.acronym,
          isActive: !unit.inactivatedAt,
          userCount: 2 // unit has QA and A users
        }],
        isActive: !org.inactivatedAt
      });
    });

  it('should not get organisation info if it does not exist', async () => {

    let err: NotFoundError | null = null;

    try {
      await sut.getOrganisationInfo(randUuid());
    }
    catch (error) {
      err = error as NotFoundError;
    }

    expect(err).toBeDefined();
    expect(err?.name).toBe(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND);
  });

  });

});