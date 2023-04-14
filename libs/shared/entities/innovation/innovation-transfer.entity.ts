import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';
import { InnovationEntity } from './innovation.entity';

import { InnovationTransferStatusEnum } from '../../enums/innovation.enums';



@Entity('innovation_transfer')
export class InnovationTransferEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'simple-enum',
    enum: InnovationTransferStatusEnum,
    nullable: false
  })
  status: InnovationTransferStatusEnum;

  @Column({ name: 'email', type: 'nvarchar', nullable: false })
  email: string;

  @Column({ name: 'email_count', nullable: false })
  emailCount: number;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @Column({ name: 'finished_at', type: 'datetime2', nullable: true })
  finishedAt: Date;

  @Column({ name: 'owner_to_collaborator', type: 'bit', nullable: false })
  ownerToCollaborator: boolean;

  static new(data: Partial<InnovationTransferEntity>): InnovationTransferEntity {
    const instance = new InnovationTransferEntity();
    Object.assign(instance, data);
    return instance;
  }

}
