import type { EntityManager } from 'typeorm';

import { TestDataType, TestsHelper } from '@admin/shared/tests';

import { UserEntity } from '@admin/shared/entities';
// import { AccessorOrganisationRoleEnum } from '@admin/shared/enums';
import { NOSQLConnectionService } from '@users/shared/services';

import { container } from '../_config';
import SYMBOLS from './symbols';
import type { UsersService } from './users.service';

describe('Admin / Services / Users Service', () => {

  let testData: TestDataType;
  let entityManager: EntityManager;

  let usersService: UsersService;


  beforeAll(async () => {

    jest.spyOn(NOSQLConnectionService.prototype, 'init').mockResolvedValue();
    // jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog').mockResolvedValue();
    // jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

    usersService = container.get<UsersService>(SYMBOLS.UsersService);

    await TestsHelper.init();
    testData = TestsHelper.sampleData;

  });

  beforeEach(async () => {
    entityManager = await TestsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await TestsHelper.releaseQueryRunnerEntityManager(entityManager);
  });

  it('should lock a user', async () => {

    const userAdminContext = testData.domainContexts.admin;
    const userInnovator = testData.baseUsers.innovator;

    await usersService.updateUser(userAdminContext, userInnovator.id, { accountEnabled: false }, entityManager);

    const updatedUser = await entityManager.createQueryBuilder(UserEntity, 'user')
      .where('user.id = :userId', { userId: userInnovator.id })
      .getOne();

    expect(updatedUser?.lockedAt).toBeTruthy();

  });

  it('should unlock a user', async () => {

    const userAdminContext = testData.domainContexts.admin;
    const userInnovator = testData.baseUsers.innovator;

    await usersService.updateUser(userAdminContext, userInnovator.id, { accountEnabled: true }, entityManager);

    const updatedUser = await entityManager.createQueryBuilder(UserEntity, 'user')
      .where('user.id = :userId', { userId: userInnovator.id })
      .getOne();

    expect(updatedUser?.lockedAt).toBeNull();

  });

  // it('should change an accessor role', async () => {

  //   const userAdminContext = testData.domainContexts.admin;
  //   const userAccessor = testData.baseUsers.accessor;
  //   const userAccessorOrganisations = await userAccessor.userOrganisations;

  //   await usersService.updateUser(
  //     userAdminContext,
  //     userAccessor.id,
  //     { role: { name: AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR, organisationId: userAccessorOrganisations[0]?.id ?? '' } },
  //     entityManager
  //   );

  //   const updatedUser = await entityManager.createQueryBuilder(OrganisationUserEntity, 'ou')
  //     .where('ou.user.id = :userId', { userId: userAccessor.id })
  //     .andWhere('ou.organisation.id = :organisationId', { organisationId: userAccessorOrganisations[0]?.id })
  //     .getOne();

  //   expect(updatedUser?.role).toBe(AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR);

  // });

});
