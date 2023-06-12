import { Column, DeepPartial, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationFileContextTypeEnum } from '../../enums/innovation.enums';
import { InnovationEntity } from '../innovation/innovation.entity';
import { UserRoleEntity } from '../user/user-role.entity';

@Entity('innovation_file')
export class InnovationFileEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'storage_id', type: 'nvarchar', length: 100 })
  storageId: string;

  @Column({ name: 'context_type', type: 'simple-enum', enum: InnovationFileContextTypeEnum })
  contextType: InnovationFileContextTypeEnum;

  @Column({ name: 'context_id', type: 'nvarchar', length: 100 })
  contextId: string;

  @Column({ name: 'name', type: 'nvarchar', length: 100 })
  name: string;

  @Column({ name: 'description', type: 'nvarchar', length: 500, nullable: true })
  description: string | null;

  @Column({ name: 'filename', type: 'nvarchar', length: 100 })
  filename: string;

  @Column({ name: 'filesize', type: 'int', nullable: true })
  filesize: number | null;

  @Column({ name: 'extension', type: 'nvarchar', length: 10 })
  extension: string;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @ManyToOne(() => UserRoleEntity, { nullable: false })
  @JoinColumn({ name: 'created_by_user_role_id' })
  createdByUserRole: UserRoleEntity;

  static verifyType(data: DeepPartial<InnovationFileEntity>): DeepPartial<InnovationFileEntity> {
    return data;
  }
}
