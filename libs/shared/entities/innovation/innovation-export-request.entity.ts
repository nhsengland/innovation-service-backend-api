import { Column, DeepPartial, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';
import { UserRoleEntity } from '../user/user-role.entity';
import { InnovationEntity } from './innovation.entity';

import { InnovationExportRequestStatusEnum } from '../../enums';

@Entity('innovation_export_request')
export class InnovationExportRequestEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'status', type: 'simple-enum', enum: InnovationExportRequestStatusEnum })
  status: InnovationExportRequestStatusEnum;

  @Column({ name: 'request_reason', type: 'varchar', length: 2000 })
  requestReason: string;

  @Column({ name: 'reject_reason', type: 'varchar', length: 2000, nullable: true })
  rejectReason: null | string;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @ManyToOne(() => UserRoleEntity)
  @JoinColumn({ name: 'created_by_user_role_id' })
  createdByUserRole: UserRoleEntity;

  static verifyType(data: DeepPartial<InnovationExportRequestEntity>): DeepPartial<InnovationExportRequestEntity> {
    return data;
  }
}
