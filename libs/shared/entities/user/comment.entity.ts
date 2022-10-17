import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from '../innovation/innovation.entity';
import { InnovationActionEntity } from '../innovation/innovation-action.entity';
import { OrganisationUnitEntity } from '../organisation/organisation-unit.entity';
import { UserEntity } from './user.entity';


@Entity('comment')
export class CommentEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  message: string;

  @Column({ name: 'is_editable', nullable: false, default: false })
  isEditable: boolean;


  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @ManyToOne(() => CommentEntity, { nullable: true })
  @JoinColumn({ name: 'reply_to_id' })
  replyTo: CommentEntity;

  @ManyToOne(() => InnovationActionEntity, { nullable: true })
  @JoinColumn({ name: 'innovation_action_id' })
  innovationAction: InnovationActionEntity;

  @ManyToOne(() => OrganisationUnitEntity, { nullable: true })
  @JoinColumn({ name: 'organisation_unit_id' })
  organisationUnit: OrganisationUnitEntity;


  static new(data: Partial<CommentEntity>): CommentEntity {
    const instance = new CommentEntity();
    Object.assign(instance, data);
    return instance;
  }

}
