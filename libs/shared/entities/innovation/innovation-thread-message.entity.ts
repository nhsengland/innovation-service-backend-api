import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';
import { OrganisationUnitEntity } from '../organisation/organisation-unit.entity';
import { UserRoleEntity } from '../user/user-role.entity';

import { UserEntity } from '../user/user.entity';
import { InnovationThreadEntity } from './Innovation-thread.entity';


@Entity('innovation_thread_message')
export class InnovationThreadMessageEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 2000 })
  message: string;

  @Column({ name: 'is_editable', nullable: false, default: false })
  isEditable: boolean;


  @ManyToOne(() => InnovationThreadEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_thread_id' })
  thread: InnovationThreadEntity;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'author_id' })
  author: UserEntity;

  @ManyToOne(() => OrganisationUnitEntity, { nullable: true })
  @JoinColumn({ name: 'author_organisation_unit_id' })
  authorOrganisationUnit: OrganisationUnitEntity | null

  @ManyToOne(() => UserRoleEntity, { nullable: true })
  @JoinColumn({ name: 'author_user_role_id' })
  authorUserRole: UserRoleEntity | null;

  static new(data: Partial<InnovationThreadMessageEntity>): InnovationThreadMessageEntity {
    const instance = new InnovationThreadMessageEntity();
    Object.assign(instance, data);
    return instance;
  }

}
