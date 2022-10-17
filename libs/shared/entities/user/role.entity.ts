import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { ServiceRoleEnum } from '../../enums/user.enums';


@Entity('role')
export class RoleEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'nvarchar', length: 100, nullable: false })
  name: ServiceRoleEnum;


  static new(data: Partial<RoleEntity>): RoleEntity {
    const instance = new RoleEntity();
    Object.assign(instance, data);
    return instance;
  }

}
