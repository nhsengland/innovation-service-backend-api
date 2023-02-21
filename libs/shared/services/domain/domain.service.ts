import { inject, injectable } from 'inversify';

import {
  FileStorageServiceSymbol, FileStorageServiceType,
  IdentityProviderServiceSymbol, IdentityProviderServiceType,
  SQLConnectionServiceSymbol, SQLConnectionServiceType
} from '../interfaces';
import { DomainContextService } from './domain-context.service';

import { DomainInnovationsService } from './domain-innovations.service';
import { DomainUsersService } from './domain-users.service';


@injectable()
export class DomainService {

  users: DomainUsersService;
  innovations: DomainInnovationsService;
  context: DomainContextService;

  constructor(
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderServiceType,
    @inject(FileStorageServiceSymbol) private fileStorageService: FileStorageServiceType,
    @inject(SQLConnectionServiceSymbol) private sqlConnectionService: SQLConnectionServiceType,
  ) {
    this.innovations = new DomainInnovationsService(this.sqlConnectionService.getConnection(), this.fileStorageService, this.identityProviderService);
    this.users = new DomainUsersService(this.sqlConnectionService.getConnection(), this.identityProviderService, this.innovations);
    this.context = new DomainContextService(this.sqlConnectionService.getConnection());
  }

}
