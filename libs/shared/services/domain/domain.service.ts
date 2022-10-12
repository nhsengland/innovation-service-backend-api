import { inject, injectable } from 'inversify';

import {
  DomainInnovationsServiceSymbol,
  DomainInnovationsServiceType,
  DomainUsersServiceSymbol,
  DomainUsersServiceType
} from '../interfaces';

@injectable()
export class DomainService {

  users: DomainUsersServiceType;
  innovations: DomainInnovationsServiceType;

  constructor(
    @inject(DomainUsersServiceSymbol) usersService: DomainUsersServiceType,
    @inject(DomainInnovationsServiceSymbol) innovationsService: DomainInnovationsServiceType
  ) {
    this.users = usersService;
    this.innovations = innovationsService;
  }

}
