import { Column, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from '../innovation/innovation.entity';
import { OrganisationUnitEntity } from './organisation-unit.entity';

import { OrganisationTypeEnum } from '../../enums/organisation.enums';

@Entity('organisation')
export class OrganisationEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, nullable: false })
  name: string;

  @Column({ type: 'simple-enum', enum: OrganisationTypeEnum, nullable: false })
  type: OrganisationTypeEnum;

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  acronym: null | string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  size: null | string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  description: null | string;

  @Column({ type: 'nvarchar', length: 8, nullable: true })
  registrationNumber: null | string;

  @Column({ name: 'is_shadow', nullable: false, default: false })
  isShadow: boolean;

  @Column({ name: 'inactivated_at', type: 'datetime2', nullable: true, default: null })
  inactivatedAt: null | Date;

  @ManyToMany(() => InnovationEntity, (record) => record.organisationShares)
  innovationShares: InnovationEntity[];

  @OneToMany(() => OrganisationUnitEntity, (record) => record.organisation, { lazy: true })
  organisationUnits: Promise<OrganisationUnitEntity[]>;

  static new(data: Partial<OrganisationEntity>): OrganisationEntity {
    const instance = new OrganisationEntity();
    Object.assign(instance, data);
    return instance;
  }
}
