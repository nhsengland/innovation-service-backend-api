import { inject, injectable } from 'inversify';

import type { CustomContextType } from '../../types';
import type { DomainService } from '../domain/domain.service';
import SHARED_SYMBOLS from '../symbols';
import { AuthorizationValidationModel } from './authorization-validation.model';

@injectable()
export class AuthorizationService {
  constructor(@inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService) {}

  /**
   * Authorization validations methods.
   */
  validate(ctx: CustomContextType): AuthorizationValidationModel {
    const authInstance = new AuthorizationValidationModel(this.domainService);
    if (ctx.auth?.user.identityId) {
      authInstance.setUser(ctx.auth.user.identityId);
    }
    if (ctx.auth?.user.roleId) {
      authInstance.setRoleId(ctx.auth.user.roleId);
    }
    return authInstance;
  }
}
