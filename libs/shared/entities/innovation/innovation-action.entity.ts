import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationSectionEntity } from './innovation-section.entity';
import { InnovationSupportEntity } from './innovation-support.entity';

import { InnovationActionStatusEnum } from '../../enums/innovation.enums';
import { UserEntity } from '../user/user.entity';
import { UserRoleEntity } from '../user/user-role.entity';


@Entity('innovation_action')
export class InnovationActionEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  description: string;

  @Column({ name: 'display_id', length: 5 })
  displayId: string;

  @Column({ type: 'simple-enum', enum: InnovationActionStatusEnum, nullable: false })
  status: InnovationActionStatusEnum;


  @ManyToOne(() => InnovationSectionEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_section_id' })
  innovationSection: InnovationSectionEntity;

  @ManyToOne(() => InnovationSupportEntity, { nullable: true })
  @JoinColumn({ name: 'innovation_support_id' })
  innovationSupport: InnovationSupportEntity;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdByUser: UserEntity;

  @ManyToOne(() => UserRoleEntity, { nullable: true })
  @JoinColumn({ name: 'created_by_user_role_id' })
  createdByUserRole: UserRoleEntity | null;

  @ManyToOne(() => UserRoleEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by_user_role_id' })
  updatedByUserRole: UserRoleEntity | null;

  static new(data: Partial<InnovationActionEntity>): InnovationActionEntity {
    const instance = new InnovationActionEntity();
    Object.assign(instance, data);
    return instance;
  }

}
