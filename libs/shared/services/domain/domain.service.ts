import { inject, injectable } from 'inversify';

import type { IdentityProviderService } from '../integrations/identity-provider.service';
import type { NotifierService } from '../integrations/notifier.service';
import type { IRSchemaService } from '../storage/ir-schema.service';
import { RedisService } from '../storage/redis.service';
import { SQLConnectionService } from '../storage/sql-connection.service';
import SHARED_SYMBOLS from '../symbols';
import { DomainInnovationsService } from './domain-innovations.service';
import { DomainUsersService } from './domain-users.service';

@injectable()
export class DomainService {
  #users: DomainUsersService;
  get users(): DomainUsersService {
    return this.#users;
  }
  #innovations: DomainInnovationsService;
  get innovations(): DomainInnovationsService {
    return this.#innovations;
  }

  constructor(
    @inject(SHARED_SYMBOLS.IdentityProviderService) private identityProviderService: IdentityProviderService,
    @inject(SHARED_SYMBOLS.SQLConnectionService) public sqlConnectionService: SQLConnectionService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService,
    @inject(SHARED_SYMBOLS.IRSchemaService) private irSchemaService: IRSchemaService,
    @inject(SHARED_SYMBOLS.RedisService) private redisService: RedisService
  ) {
    this.#users = new DomainUsersService(this.identityProviderService, this.notifierService, this.sqlConnectionService);

    this.#innovations = new DomainInnovationsService(
      this.sqlConnectionService,
      this.notifierService,
      this.irSchemaService,
      this.redisService
    );

    // Set up the circular dependencies
    this.#innovations.domainUsersService = this.#users;
    this.#users.domainInnovationService = this.#innovations;
  }
}
