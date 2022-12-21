import { UserEntity } from '@admin/shared/entities';
import { NotFoundError, UserErrorsEnum } from '@admin/shared/errors';
import { DomainServiceSymbol, DomainServiceType, IdentityProviderService, IdentityProviderServiceSymbol } from '@admin/shared/services';
import { inject, injectable } from 'inversify';
import { BaseService } from './base.service';

@injectable()
export class UsersService extends BaseService {
  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderService
  ) {
    super();
  }

  async lockUser(userId: string): Promise<{ userId: string }> {

    const user = await this.sqlConnection
      .createQueryBuilder(UserEntity, 'user')
      .where('user.id = :userId', { userId })
      .getOne()

    if (!user) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND)
    }

    //lock user in database
    await this.sqlConnection.transaction(async transaction => {

      await transaction.update(UserEntity, { id: userId }, { lockedAt: new Date().toISOString() })
    
    })

    //lock user in identity provider
    await this.lockUserIdP (userId)

    return { userId: user.id }
  }

  async unlockUser(userId: string): Promise<{ userId: string }> {

    const user = await this.sqlConnection
      .createQueryBuilder(UserEntity, 'user')
      .where('user.id = :userId', { userId })
      .getOne()

    if (!user) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND)
    }

    //unlock user in database
    await this.sqlConnection.transaction(async transaction => {

      await transaction.update(UserEntity, { id: userId }, { lockedAt: null })
    
    })

    //unlock user in identity provider
    await this.unlockUserIdP (userId)

    return { userId: user.id }
  }


  private async lockUserIdP (userId: string ): Promise<void> {

    const user = await this.domainService.users.getUserInfo({ userId })

    await this.identityProviderService.updateUserAsync(user.identityId, { accountEnabled: false })

  }

  private async unlockUserIdP (userId: string): Promise<void> {

    const user = await this.domainService.users.getUserInfo({ userId })

    await this.identityProviderService.updateUserAsync(user.identityId, { accountEnabled: true })

  }

}
