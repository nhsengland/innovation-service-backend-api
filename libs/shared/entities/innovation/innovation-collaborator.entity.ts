import { AfterLoad, Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, RelationId } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationCollaboratorStatusEnum } from '../../enums/innovation.enums';
import type { DateISOType } from '../../types/date.types';
import { UserEntity } from '../user/user.entity';
import { InnovationEntity } from './innovation.entity';


@Entity('innovation_collaborator')
export class InnovationCollaboratorEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'simple-enum', enum: InnovationCollaboratorStatusEnum })
  status: InnovationCollaboratorStatusEnum;

  @Column({ name: 'email', type: 'nvarchar' })
  email: string;

  @Column({ name: 'collaborator_role', type: 'nvarchar', nullable: true })
  collaboratorRole: null | string;

  @Column({ name: 'invited_at', type: 'datetime2' })
  invitedAt: DateISOType;

  @RelationId('innovation')
  innovationId: string;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @RelationId('user')
  userId: string | null;

  @OneToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: null | UserEntity;


  // Expires after 30 days.
  @AfterLoad()
  setInviteExpired(): void {
    if (this.status === InnovationCollaboratorStatusEnum.PENDING) {

      const isExpired = new Date(this.invitedAt) < new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);

      if (isExpired) {
        this.status = InnovationCollaboratorStatusEnum.EXPIRED;
      }

    }
  }

  static new(data: Partial<InnovationCollaboratorEntity>): InnovationCollaboratorEntity {
    const instance = new InnovationCollaboratorEntity();
    Object.assign(instance, data);
    return instance;
  }

}
