import { TestDataType, TestsHelper } from '@innovations/shared/tests/tests.helper';
import { container } from '../_config';

import { DomainUsersService, NOSQLConnectionService } from '@innovations/shared/services';
import { CacheService } from '@innovations/shared/services/storage/cache.service';
import type { EntityManager } from 'typeorm';
import type { InnovationSupportsService } from './innovation-supports.service';
import { InnovationSupportsServiceSymbol, InnovationSupportsServiceType } from './interfaces';
import { InnovationSupportEntity } from '@innovations/shared/entities';
import { InnovationErrorsEnum, NotFoundError } from '@innovations/shared/errors';
import { randUuid } from '@ngneat/falso';

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
          displayName: 'accessor name',
          isActive: true
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

    it('should list the innovation supports with engaging accessors', async () => {

      const innovationSupports = await sut.getInnovationSupportsList(testData.innovation.id, { fields: ['engagingAccessors']}, em);

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
        },
        engagingAccessors: [{
          id: testData.baseUsers.accessor.id,
          organisationUnitUserId: testData.organisationUnitUsers.accessor.id,
          name: 'accessor name'
        }]
      })));
    });


    it('should not list the innovation supports if the innovation does not exist', async () => {

      let err: NotFoundError | null = null;

      try {
        await sut.getInnovationSupportsList(randUuid(), { fields: []}, em);
      }
      catch (error) {
        err = error as NotFoundError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    });
  });

});