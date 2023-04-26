import { inject, injectable } from 'inversify';

import type { CustomContextType } from '../../types';
import { DomainServiceSymbol, DomainServiceType } from '../interfaces';
import { AuthorizationValidationModel } from './authorization-validation.model';


@injectable()
export class AuthorizationService {

  constructor(@inject(DomainServiceSymbol) private domainService: DomainServiceType) { }


  /**
  * Authorization validations methods.
  */
  validate(ctx: CustomContextType): AuthorizationValidationModel {
    const authInstance = new AuthorizationValidationModel(this.domainService);
    if (ctx.auth?.user.identityId) { authInstance.setUser(ctx.auth.user.identityId); }
    if (ctx.auth?.user.roleId) { authInstance.setRoleId(ctx.auth.user.roleId); }
    return authInstance;
  }

}
