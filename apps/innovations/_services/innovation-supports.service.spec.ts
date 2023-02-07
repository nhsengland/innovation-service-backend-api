import { TestDataType, TestsHelper } from '@innovations/shared/tests/tests.helper';
import { container } from '../_config';

import { DomainUsersService, NOSQLConnectionService } from '@innovations/shared/services';
import { CacheService } from '@innovations/shared/services/storage/cache.service';
import type { EntityManager } from 'typeorm';
import type { InnovationSupportsService } from './innovation-supports.service';
import { InnovationSupportsServiceSymbol, InnovationSupportsServiceType } from './interfaces';
import { InnovationSupportEntity } from '@innovations/shared/entities';

describe('Innovation supports service test suite', () => {

  let sut: InnovationSupportsService;
  let testData: TestDataType;
  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<InnovationSupportsServiceType>(InnovationSupportsServiceSymbol);
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

  describe('getInnovationSupportsList', () => {

    beforeEach(() => {
      jest.spyOn(DomainUsersService.prototype, 'getUsersList').mockResolvedValue(
        [{
          id: testData.baseUsers.accessor.id,
          displayName: 'accessor name'
        }] as any
      );
    });

    it('should list the innovation supports', async () => {

      const innovationSupports = await sut.getInnovationSupportsList(testData.innovation.id, { fields: []}, em);

      const dbSupports = await em.createQueryBuilder(InnovationSupportEntity, 'support')
        .leftJoinAndSelect('support.organisationUnit', 'orgUnit')
        .leftJoinAndSelect('orgUnit.organisation', 'org')
        .where('support.id IN (:...supportIds)', { supportIds: innovationSupports.map(iS => iS.id) })
        .getMany();

      expect(innovationSupports).toStrictEqual(dbSupports.map(support => ({
        id: support.id,
        status: support.status,
        organisation: {
          id: support.organisationUnit.organisation.id,
          name: support.organisationUnit.organisation.name,
          acronym: support.organisationUnit.organisation.acronym,
          unit: {
            id: support.organisationUnit.id,
            name: support.organisationUnit.name,
            acronym: support.organisationUnit.acronym,
          }
        }
      })));
    });
  });

});