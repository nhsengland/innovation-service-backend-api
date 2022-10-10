import { injectable } from 'inversify';
import type { Repository } from 'typeorm';

import { UserEntity, OrganisationEntity, OrganisationUnitUserEntity, InnovationEntity } from '@users/shared/entities';

import { BaseService } from './base.service';


@injectable()
export class UsersService extends BaseService {

  userRepository: Repository<UserEntity>;
  organisationRepository: Repository<OrganisationEntity>;
  organisationUnitUserRepository: Repository<OrganisationUnitUserEntity>;
  innovationRepository: Repository<InnovationEntity>;

  constructor(
    // @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    // @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderServiceType
  ) {
    super();
    this.userRepository = this.sqlConnection.getRepository(UserEntity);
    this.organisationRepository = this.sqlConnection.getRepository<OrganisationEntity>(OrganisationEntity);
    this.organisationUnitUserRepository = this.sqlConnection.getRepository<OrganisationUnitUserEntity>(OrganisationUnitUserEntity);
    this.innovationRepository = this.sqlConnection.getRepository<InnovationEntity>(InnovationEntity);
  }

}
