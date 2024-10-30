import { Column, CreateDateColumn, DeleteDateColumn, JoinColumn, ManyToOne, UpdateDateColumn } from 'typeorm';
import { UserRoleEntity } from './user/user-role.entity';

export class BaseByRoleEntity {
  @CreateDateColumn({ name: 'created_at', type: 'datetime2', update: false })
  createdAt: Date;

  @Column({ name: 'created_by', update: false })
  createdBy: string;

  // New field.
  @ManyToOne(() => UserRoleEntity)
  @JoinColumn({ name: 'created_by_user_role_id' })
  createdByUserRole: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @Column({ name: 'updated_by' })
  updatedBy: string;

  // New field.
  @ManyToOne(() => UserRoleEntity)
  @JoinColumn({ name: 'updated_by_user_role_id' })
  updatedByUserRole: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime2', nullable: true })
  deletedAt: Date;
}
