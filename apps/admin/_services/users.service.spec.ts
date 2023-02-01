/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TestDataType, TestsHelper } from '@users/shared/tests/tests.helper';
import { container } from '../_config';

import { OrganisationUserEntity } from '@admin/shared/entities';
import { AccessorOrganisationRoleEnum } from '@admin/shared/enums';
import { RedisCache } from '@admin/shared/services/storage/redis-cache.service';
import { DomainInnovationsService, NOSQLConnectionService, NotifierService } from '@users/shared/services';
import { CacheService } from '@users/shared/services/storage/cache.service';
import type { EntityManager } from 'typeorm';
import { UsersServiceSymbol, UsersServiceType } from './interfaces';

describe('Admin UserService', () => {

  let sut: UsersServiceType;

  let testData: TestDataType;
  let em: EntityManager;

  beforeAll(async () => {

    jest.spyOn(NOSQLConnectionService.prototype, 'init').mockResolvedValue();
    jest.spyOn(CacheService.prototype, 'init').mockReturnThis();
    jest.spyOn(RedisCache.prototype, 'delete').mockResolvedValue();
    

    sut = container.get<UsersServiceType>(UsersServiceSymbol);
    await TestsHelper.init();
    testData = TestsHelper.sampleData;
  });

  beforeEach(async () => {
    em = await TestsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await TestsHelper.releaseQueryRunnerEntityManager(em);
  });

  it('should lock a user', async () => {
    // arrange
    
    const accessor = testData.baseUsers.accessor;

    jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog').mockResolvedValue();
    jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

    let err;

    try {
      await sut.updateUser(
        { id: accessor.id, identityId: accessor.identityId, type: accessor.type },
        testData.baseUsers.innovator.id,
        { accountEnabled: false },
        em,
      );
    } catch (error) {
      err = error;
    }
    // assert
    expect(err).toBeUndefined();

  });

  it('should unlock a user', async () => {
    // arrange
    
    const accessor = testData.baseUsers.accessor;

    jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog').mockResolvedValue();
    jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);
    let err;

    try {
      await sut.updateUser(
        { id: accessor.id, identityId: accessor.identityId, type: accessor.type },
        testData.baseUsers.innovator.id,
        { accountEnabled: true },
        em,
      );
    } catch (error) {
      err = error;
    }

    // assert
    expect(err).toBeUndefined();
  });

  it('should change an accessor role', async () => {
    // arrange
    
    const accessor = testData.baseUsers.accessor;

    jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog').mockResolvedValue();
    jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

    await sut.updateUser(
      { id: accessor.id, identityId: accessor.identityId, type: accessor.type },
      testData.baseUsers.accessor.id,
      { role: { name: AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR, organisationId: testData.domainContexts.accessor.organisation!.id } },
      em,
    );

    const updatedAccessor = await em.createQueryBuilder(OrganisationUserEntity, 'ou')
      .where('ou.user.id = :userId', { userId: accessor.id })
      .andWhere('ou.organisation.id = :organisationId', { organisationId: testData.domainContexts.accessor.organisation!.id })
      .getOne();

    // assert
    expect(updatedAccessor?.role).toBe(AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR);
    
  });

});