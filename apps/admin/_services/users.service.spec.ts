import type { EntityManager } from 'typeorm';

import { TestDataType, TestsLegacyHelper } from '@admin/shared/tests';

import { UserEntity } from '@admin/shared/entities';
// import { AccessorOrganisationRoleEnum } from '@admin/shared/enums';

import { container } from '../_config';
import SYMBOLS from './symbols';
import type { UsersService } from './users.service';

describe('Admin / Services / Users Service', () => {
  let testData: TestDataType;
  let entityManager: EntityManager;

  let usersService: UsersService;

  beforeAll(async () => {
    // jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog').mockResolvedValue();
    // jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

    usersService = container.get<UsersService>(SYMBOLS.UsersService);

    await TestsLegacyHelper.init();
    testData = TestsLegacyHelper.sampleData;
  });

  beforeEach(async () => {
    entityManager = await TestsLegacyHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await TestsLegacyHelper.releaseQueryRunnerEntityManager(entityManager);
  });

  it('should lock a user', async () => {
    const userAdminContext = testData.domainContexts.admin;
    const userInnovator = testData.baseUsers.innovator;

    await usersService.updateUser(userAdminContext, userInnovator.id, { accountEnabled: false }, entityManager);

    const updatedUser = await entityManager
      .createQueryBuilder(UserEntity, 'user')
      .where('user.id = :userId', { userId: userInnovator.id })
      .getOne();

    expect(updatedUser?.lockedAt).toBeTruthy();
  });

  it('should unlock a user', async () => {
    const userAdminContext = testData.domainContexts.admin;
    const userInnovator = testData.baseUsers.innovator;

    await usersService.updateUser(userAdminContext, userInnovator.id, { accountEnabled: true }, entityManager);

    const updatedUser = await entityManager
      .createQueryBuilder(UserEntity, 'user')
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
