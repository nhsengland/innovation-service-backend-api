import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity('innovation_support_kpi_view')
export class SupportKPIViewEntity {
  @ViewColumn({ name: 'innovation_id' })
  innovationId: string;

  @ViewColumn({ name: 'innovation_name' })
  innovationName: string;

  @ViewColumn({ name: 'organisation_unit_id' })
  organisationUnitId: string;

  @ViewColumn({ name: 'organisation_unit_name' })
  organisationUnitName: string;

  @ViewColumn({ name: 'assigned_date' })
  assignedDate: Date; // this column will either be the date suggested or the date shared, whichever is the latest
}
