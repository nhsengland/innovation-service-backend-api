import { inject, injectable } from 'inversify';

import {
  FileStorageServiceSymbol, FileStorageServiceType,
  IdentityProviderServiceSymbol, IdentityProviderServiceType
} from '../../interfaces/services.interfaces';
import { DomainInnovationsService } from './domain-innovations.service';
import { DomainUsersService } from './domain-users.service';


@injectable()
export class DomainService {

  users: DomainUsersService;
  innovations: DomainInnovationsService;

  constructor(
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderServiceType,
    @inject(FileStorageServiceSymbol) private fileStorageService: FileStorageServiceType
  ) {
    this.users = new DomainUsersService(this.identityProviderService);
    this.innovations = new DomainInnovationsService(this.fileStorageService);
  }

}
