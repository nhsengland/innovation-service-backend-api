import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationTaskStatusEnum } from '../../enums/innovation.enums';
import { UserRoleEntity } from '../user/user-role.entity';
import { InnovationSectionEntity } from './innovation-section.entity';
import { InnovationSupportEntity } from './innovation-support.entity';

@Entity('innovation_task')
export class InnovationTaskEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'display_id', length: 5 })
  displayId: string;

  // TODO missing messages

  @Column({ type: 'simple-enum', enum: InnovationTaskStatusEnum, nullable: false })
  status: InnovationTaskStatusEnum;

  @ManyToOne(() => InnovationSectionEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_section_id' })
  innovationSection: InnovationSectionEntity;

  @ManyToOne(() => InnovationSupportEntity, { nullable: true })
  @JoinColumn({ name: 'innovation_support_id' })
  innovationSupport: InnovationSupportEntity | null;

  @ManyToOne(() => UserRoleEntity)
  @JoinColumn({ name: 'created_by_user_role_id' })
  createdByUserRole: UserRoleEntity;

  @ManyToOne(() => UserRoleEntity)
  @JoinColumn({ name: 'updated_by_user_role_id' })
  updatedByUserRole: UserRoleEntity;

  static new(data: Partial<InnovationTaskEntity>): InnovationTaskEntity {
    const instance = new InnovationTaskEntity();
    Object.assign(instance, data);
    return instance;
  }
}
