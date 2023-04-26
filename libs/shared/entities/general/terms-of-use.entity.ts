import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { TermsOfUseUserEntity } from './terms-of-use-user.entity';

import { TermsOfUseTypeEnum } from '../../enums/general.enums';

@Entity('terms_of_use')
export class TermsOfUseEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'name', length: 500 })
  name: string;

  @Column({ name: 'tou_type', type: 'simple-enum', enum: TermsOfUseTypeEnum, nullable: false })
  touType: TermsOfUseTypeEnum;

  @Column({ name: 'summary', nullable: true, type: 'nvarchar', length: 2000 })
  summary: string;

  @Column({ type: 'datetime2', name: 'released_at', nullable: true })
  releasedAt: null | Date;

  @OneToMany(() => TermsOfUseUserEntity, (record) => record.termsOfUse, { lazy: true })
  termsOfUseUsers: TermsOfUseUserEntity[];

  static new(data: Partial<TermsOfUseEntity>): TermsOfUseEntity {
    const instance = new TermsOfUseEntity();
    Object.assign(instance, data);
    return instance;
  }
}
