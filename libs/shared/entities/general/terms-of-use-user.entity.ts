import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { BaseEntity } from '../base.entity';

import { UserEntity } from '../user/user.entity';
import { TermsOfUseEntity } from './terms-of-use.entity';

@Entity('terms_of_use_user')
@Unique('uc_termsOfUse_user_idx', ['termsOfUse', 'user'])
export class TermsOfUseUserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @UpdateDateColumn({ name: 'accepted_at', type: 'datetime2', nullable: false })
  acceptedAt: Date;

  @ManyToOne(() => TermsOfUseEntity, { nullable: false })
  @JoinColumn({ name: 'tou_id' })
  termsOfUse: TermsOfUseEntity;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  static new(data: Partial<TermsOfUseUserEntity>): TermsOfUseUserEntity {
    const instance = new TermsOfUseUserEntity();
    Object.assign(instance, data);
    return instance;
  }
}
