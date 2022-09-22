import { Check, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { UserEntity } from '../user/user.entity';
import { OrganisationEntity } from './organisation.entity';
import { OrganisationUnitUserEntity } from './organisation-unit-user.entity';

import { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum } from '../../enums/organisation.enums';


const roles = Object.values(AccessorOrganisationRoleEnum).join(',') + ',' + Object.values(InnovatorOrganisationRoleEnum).join(',');


@Entity('organisation_user')
@Unique('uc_organisation_user_idx', ['organisation', 'user'])
@Check('chk_organisation_user_roles', `'role' IN (${roles})`)
export class OrganisationUserEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'nvarchar', length: 50 })
  role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum;


  @ManyToOne(() => OrganisationEntity, { nullable: false })
  @JoinColumn({ name: 'organisation_id' })
  organisation: OrganisationEntity;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @OneToMany(() => OrganisationUnitUserEntity, (record) => record.organisationUser)
  userOrganisationUnits: OrganisationUnitUserEntity[];


  static new(data: Partial<OrganisationUserEntity>): OrganisationUserEntity {
    const instance = new OrganisationUserEntity();
    Object.assign(instance, data);
    return instance;
  }

}
