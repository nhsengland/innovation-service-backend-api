import { UserEntity } from '@admin/shared/entities';
import { NotFoundError, UserErrorsEnum } from '@admin/shared/errors';
import { CacheServiceSymbol, IdentityProviderService, IdentityProviderServiceSymbol } from '@admin/shared/services';
import { CacheConfigType, CacheService } from '@admin/shared/services/storage/cache.service';
import { inject, injectable } from 'inversify';
import { BaseService } from './base.service';

@injectable()
export class UsersService extends BaseService {
  private cache: CacheConfigType['IdentityUserInfo']

  constructor(
    @inject(CacheServiceSymbol) cacheService: CacheService,
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderService
  ) {
    super();
    this.cache = cacheService.get('IdentityUserInfo');
  }

  /**
   * updates a user info in the database and in the identity provider if needed
   * @param userId the user id
   * @param data partial user update options (currently only supports accountEnabled)
   *   - accountEnabled: enable or disable the user
   */
  async updateUser(userId: string, data: { accountEnabled?: boolean | null }): Promise<void> {
    await this.sqlConnection.transaction(async transaction => {
      const user = await this.sqlConnection
        .createQueryBuilder(UserEntity, 'user')
        .where('user.id = :userId', { userId })
        .getOne()

      if (!user) {
        throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND)
      }

      await transaction.update(UserEntity, { id: userId }, {
        ...data.accountEnabled != null && { lockedAt: data.accountEnabled === false ? new Date().toISOString() : null }
      })

      // Update identity provider if needed
      if (data.accountEnabled != null) {
        await this.identityProviderService.updateUserAsync(user.identityId, { accountEnabled: data.accountEnabled !== false })
      }

      // Remove cache entry
      await this.cache.delete(user.identityId)
    })
  }

}
