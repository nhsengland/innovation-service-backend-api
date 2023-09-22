import { JoinColumn, ManyToOne, ViewColumn, ViewEntity } from 'typeorm';
import type { ServiceRoleEnum } from '../../enums';
import { InnovationTaskEntity } from '../innovation/innovation-task.entity';

@ViewEntity('innovation_task_descriptions_view')
export class InnovationTaskDescriptionsViewEntity {
  @ManyToOne(() => InnovationTaskEntity)
  @JoinColumn({ name: 'task_id' })
  task: InnovationTaskEntity;

  // thread_id and message_id can become relations to the thread and message entities if required
  @ViewColumn({ name: 'thread_id' })
  threadId: string;

  @ViewColumn({ name: 'message_id' })
  messageId: string;

  @ViewColumn()
  description: string;

  @ViewColumn({ name: 'created_at' })
  createdAt: Date;

  @ViewColumn({ name: 'created_by_role' })
  createdByRole: ServiceRoleEnum.ACCESSOR | ServiceRoleEnum.QUALIFYING_ACCESSOR | ServiceRoleEnum.ASSESSMENT;

  @ViewColumn({ name: 'created_by_identity_id' })
  createdByIdentityId: string | null;

  @ViewColumn({ name: 'created_by_organisation_unit_name' })
  createdByOrganisationUnitName: string | null;
}
