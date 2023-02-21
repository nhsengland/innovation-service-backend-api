import { ViewColumn, ViewEntity } from 'typeorm';

import type { DateISOType } from '../../types/date.types';


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
  latestActivity: DateISOType;

}
