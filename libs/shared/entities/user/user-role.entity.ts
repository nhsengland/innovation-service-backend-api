import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { UserEntity } from './user.entity';

import type { DateISOType } from '../../types/date.types';
import { OrganisationEntity, OrganisationUnitEntity } from '..';
import type { ServiceRoleEnum } from '../../enums';


@Entity('user_role')
export class UserRoleEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'active_since', type: 'datetime2' })
  activeSince: DateISOType;

  @Column({ name: 'role', nullable: false })
  role: ServiceRoleEnum;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => OrganisationEntity, { nullable: true })
  @JoinColumn({ name: 'organisation_id' })
  organisation: OrganisationEntity;

  @ManyToOne(() => OrganisationUnitEntity, { nullable: true })
  @JoinColumn({ name: 'organisation_unit_id' })
  organisationUnit: OrganisationUnitEntity;


  static new(data: Partial<UserRoleEntity>): UserRoleEntity {
    const instance = new UserRoleEntity();
    Object.assign(instance, data);
    return instance;
  }

}
