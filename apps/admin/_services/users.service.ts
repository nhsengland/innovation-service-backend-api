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

  async lockUser(userId: string ): Promise<{ userId: string, identityId: string }> {

    //NEED TO LOCK ON IDP AND SQL
    //SEPARATE ENDPOINTS?

    const user = await this.domainService.users.getUserInfo({ userId })

    await this.identityProviderService.updateUserAsync(user.identityId, { accountEnabled: false })

    return { userId: user.id, identityId: user.identityId }
  }

}
