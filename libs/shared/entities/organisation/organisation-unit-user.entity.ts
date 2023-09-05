import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { OrganisationUnitEntity } from './organisation-unit.entity';
import { OrganisationUserEntity } from '../organisation/organisation-user.entity';

@Entity('organisation_unit_user')
@Unique('uc_org_unit_org_user_idx', ['organisationUnit', 'organisationUser'])
export class OrganisationUnitUserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => OrganisationUnitEntity, { nullable: false })
  @JoinColumn({ name: 'organisation_unit_id' })
  organisationUnit: OrganisationUnitEntity;

  @ManyToOne(() => OrganisationUserEntity, { nullable: false })
  @JoinColumn({ name: 'organisation_user_id' })
  organisationUser: OrganisationUserEntity;

  static new(data: Partial<OrganisationUnitUserEntity>): OrganisationUnitUserEntity {
    const instance = new OrganisationUnitUserEntity();
    Object.assign(instance, data);
    return instance;
  }
}
