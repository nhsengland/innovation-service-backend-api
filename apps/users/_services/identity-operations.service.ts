import type { IdentityOperationsTypeEnum } from '@users/shared/enums';
// import { inject } from 'inversify';
import { injectable } from 'inversify';
import { BaseService } from './base.service';
import { IdentityOperationsParamsTemplates } from '../_config/identity-operations.config';
// import { IdentityProviderServiceSymbol, IdentityProviderServiceType } from '@users/shared/services';

@injectable()
export class IdentityOperationsService extends BaseService {

  constructor(
    // @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderServiceType,
  ) { super(); }

  /**
   * updated user in b2c
   * @param identityId the user identity
   * @returns updated user info
   */
  public async updateUser(
    operationType: IdentityOperationsTypeEnum,
    identityId: string
    ): Promise<void> {

        const params = IdentityOperationsParamsTemplates[operationType]
        
        // await this.identityProviderService.updateUser(
        //     identityId,
        //     params
        // )

        console.log(identityId)
        console.log(operationType)
        console.log(params)
        
        console.log('SUCCESS!!')

  }
}