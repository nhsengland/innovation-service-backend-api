import { inject, injectable } from 'inversify';

import {
  FileStorageServiceSymbol,
  FileStorageServiceType,
  IdentityProviderServiceSymbol,
  IdentityProviderServiceType,
  SQLProviderSymbol,
  SQLProviderType,
} from '../interfaces';

import type { DataSource } from 'typeorm';
import { GenericErrorsEnum, ServiceUnavailableError } from '../../errors';
import { DomainInnovationsService } from './domain-innovations.service';
import { DomainUsersService } from './domain-users.service';

@injectable()
export class DomainService {
  _users: DomainUsersService;
  get users(): DomainUsersService {
    if (!this._users) {
      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_SQL_UNAVAILABLE, {
        message: 'SQL Connection is not initialized',
      });
    }
    return this._users;
  }
  _innovations: DomainInnovationsService;
  get innovations(): DomainInnovationsService {
    if (!this._innovations) {
      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_SQL_UNAVAILABLE, {
        message: 'SQL Connection is not initialized',
      });
    }
    return this._innovations;
  }

  constructor(
    @inject(IdentityProviderServiceSymbol)
    private identityProviderService: IdentityProviderServiceType,
    @inject(FileStorageServiceSymbol) private fileStorageService: FileStorageServiceType,
    @inject(SQLProviderSymbol) public sqlProvider: SQLProviderType
  ) {}

  setConnection(connection: DataSource): void {
    this._innovations = new DomainInnovationsService(
      connection,
      this.fileStorageService,
      this.identityProviderService
    );
    this._users = new DomainUsersService(
      connection,
      this.identityProviderService,
      this._innovations
    );
  }
}
