import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, RelationId } from 'typeorm';

import type { ServiceRoleEnum } from '../../enums/user.enums';
import { GenericErrorsEnum, InternalServerError } from '../../errors';
import type { RoleType } from '../../types';
import { BaseEntity } from '../base.entity';

import { OrganisationUnitEntity } from '../organisation/organisation-unit.entity';
import { OrganisationEntity } from '../organisation/organisation.entity';
import { UserEntity } from './user.entity';

@Entity('user_role')
export class UserRoleEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'active_since', type: 'datetime2' })
  activeSince: Date;

  @Column({ name: 'role', nullable: false })
  role: ServiceRoleEnum;

  @Column({ name: 'locked_at', type: 'datetime2', nullable: true })
  lockedAt: Date | null;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @RelationId('user')
  userId: string;

  @ManyToOne(() => OrganisationEntity, { nullable: true })
  @JoinColumn({ name: 'organisation_id' })
  organisation: OrganisationEntity | null;

  @RelationId('organisation')
  organisationId: string;

  @ManyToOne(() => OrganisationUnitEntity, { nullable: true })
  @JoinColumn({ name: 'organisation_unit_id' })
  organisationUnit: OrganisationUnitEntity | null;

  @RelationId('organisationUnit')
  organisationUnitId: string;

  static new(data: Partial<UserRoleEntity>): UserRoleEntity {
    const instance = new UserRoleEntity();
    Object.assign(instance, data);
    return instance;
  }
}

// Entity helpers
export const roleEntity2RoleType = (role: UserRoleEntity): RoleType => {
  // sanity check to ensure relations are loaded
  if (
    !role.organisation &&
    role.organisationId &&
    !role.organisationUnit &&
    role.organisationUnitId
  ) {
    throw new InternalServerError(GenericErrorsEnum.UNKNOWN_ERROR, {
      message: 'role relations are not loaded',
    });
  }

  return {
    id: role.id,
    role: role.role,
    lockedAt: role.lockedAt,
    ...(role.organisation && {
      organisation: {
        id: role.organisation.id,
        name: role.organisation.name,
        acronym: role.organisation.acronym,
      },
    }),
    ...(role.organisationUnit && {
      organisationUnit: {
        id: role.organisationUnit.id,
        name: role.organisationUnit.name,
        acronym: role.organisationUnit.acronym,
      },
    }),
  };
};
