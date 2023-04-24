import { ViewColumn, ViewEntity } from 'typeorm';




@ViewEntity()
export class IdleSupportViewEntity {

  @ViewColumn()
  innovationId: string;

  @ViewColumn()
  innovationName: string;

  @ViewColumn()
  ownerId: string;

  @ViewColumn()
  ownerIdentityId: string;

  @ViewColumn()
  organisationUnitId: string;

  @ViewColumn()
  organisationUnitName: string;

  @ViewColumn()
  identityId: string;

  @ViewColumn()
  latestActivity: Date;

}
