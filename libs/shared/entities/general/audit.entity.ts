import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { ActionEnum, TargetEnum } from '../../services/integrations/audit.service';

@Index(['userId', 'innovationId', 'date'], { unique: false })
@Index(['date'])
@Entity('audit')
export class AuditEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Didn't do the relation on purpose as I don't expect this to be used to fetch users.
  @Column({ name: 'user_id', type: 'uniqueidentifier', nullable: false })
  userId: string;

  @Column({ name: 'date', type: 'datetime2', nullable: false })
  date: Date;

  @Column({ name: 'action', type: 'simple-enum', enum: ActionEnum, nullable: false })
  action: ActionEnum;

  @Column({ name: 'target', type: 'simple-enum', enum: TargetEnum, nullable: false })
  target: TargetEnum;

  @Column({ name: 'target_id', type: 'uniqueidentifier', nullable: true })
  targetId?: string;

  // Metadata to help with queries
  // Again no relation as I don't expect this to be used to fetch innovations.
  @Column({ name: 'innovation_id', type: 'uniqueidentifier', nullable: true })
  innovationId?: string;

  // Metadata not really used at the moment
  @Column({ name: 'invocation_id', type: 'nvarchar', nullable: true })
  invocationId?: string;

  @Column({ name: 'function_name', type: 'nvarchar', nullable: true })
  functionName?: string;

  static new(data: Partial<AuditEntity>): AuditEntity {
    const instance = new AuditEntity();
    Object.assign(instance, data);
    return instance;
  }
}
