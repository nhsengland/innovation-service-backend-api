import { inject, injectable } from 'inversify';

import type { IdentityProviderService } from '../integrations/identity-provider.service';
import type { NotifierService } from '../integrations/notifier.service';
import type { IRSchemaService } from '../storage/ir-schema.service';
import { SQLConnectionService } from '../storage/sql-connection.service';
import SHARED_SYMBOLS from '../symbols';
import { DomainInnovationsService } from './domain-innovations.service';
import { DomainUsersService } from './domain-users.service';

@injectable()
export class DomainService {
  private _users: DomainUsersService;
  get users(): DomainUsersService {
    return this._users;
  }
  private _innovations: DomainInnovationsService;
  get innovations(): DomainInnovationsService {
    return this._innovations;
  }

  constructor(
    @inject(SHARED_SYMBOLS.IdentityProviderService) private identityProviderService: IdentityProviderService,
    @inject(SHARED_SYMBOLS.SQLConnectionService) public sqlConnectionService: SQLConnectionService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService,
    @inject(SHARED_SYMBOLS.IRSchemaService) private irSchemaService: IRSchemaService
  ) {
    this._users = new DomainUsersService(
      this.innovations,
      this.identityProviderService,
      this.notifierService,
      this.sqlConnectionService
    );

    this._innovations = new DomainInnovationsService(
      this.sqlConnectionService,
      this.notifierService,
      this._users,
      this.irSchemaService
    );
  }
}
