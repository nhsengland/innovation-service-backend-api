import { ViewColumn, ViewEntity } from 'typeorm';




@ViewEntity()
export class LastSupportStatusViewEntity {

  @ViewColumn()
  statusChangedAt: Date;

  @ViewColumn()
  innovationId: string;

  @ViewColumn()
  currentStatus: string;

  @ViewColumn()
  organisationId: string;

  @ViewColumn()
  organisationName: string;

  @ViewColumn()
  organisationAcronym: string;

  @ViewColumn()
  organisationUnitId: string;

  @ViewColumn()
  organisationUnitName: string;

  @ViewColumn()
  organisationUnitAcronym: string;

}
