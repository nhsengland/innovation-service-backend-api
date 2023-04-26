import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { UserEntity } from '../user/user.entity';
import { InnovationThreadMessageEntity } from './innovation-thread-message.entity';
import { InnovationEntity } from './innovation.entity';

import { UserRoleEntity } from '..';
import { ThreadContextTypeEnum } from '../../enums/innovation.enums';

@Entity('innovation_thread')
export class InnovationThreadEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  subject: string;

  @Column({
    type: 'simple-enum',
    name: 'context_type',
    enum: ThreadContextTypeEnum,
    nullable: true,
  })
  contextType: ThreadContextTypeEnum | undefined;

  @Column({ type: 'uniqueidentifier', name: 'context_id', nullable: true })
  contextId: string | undefined;

  @OneToMany(() => InnovationThreadMessageEntity, (message) => message.thread, {
    lazy: true,
    cascade: ['insert'],
  })
  messages: Promise<InnovationThreadMessageEntity[]>;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'author_id' })
  author: UserEntity;

  @ManyToOne(() => UserRoleEntity, { nullable: false })
  @JoinColumn({ name: 'author_user_role_id' })
  authorUserRole: UserRoleEntity;

  static new(data: Partial<InnovationThreadEntity>): InnovationThreadEntity {
    const instance = new InnovationThreadEntity();
    Object.assign(instance, data);
    return instance;
  }
}
