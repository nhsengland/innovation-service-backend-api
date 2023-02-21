import { ViewColumn, ViewEntity } from 'typeorm';

import type { DateISOType } from '../../types/date.types';


@ViewEntity()
export class LastSupportStatusViewEntity {

  @ViewColumn()
  statusChangedAt: DateISOType;

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
