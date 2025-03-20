import { InnovationSupportStatusEnum } from '../../enums';
import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity('innovation_needing_action_view')
export class InnovationNeedingActionView {
  @ViewColumn({ name: 'id' })
  id: string;

  @ViewColumn({ name: 'name' })
  name: string;

  @ViewColumn({ name: 'org_unit_id' })
  organisationUnitId: string;

  @ViewColumn({ name: 'support_status' })
  supportStatus: InnovationSupportStatusEnum;

  @ViewColumn({ name: 'due_date' })
  dueDate: Date;

  @ViewColumn({ name: 'due_days' })
  dueDays: number;
}
