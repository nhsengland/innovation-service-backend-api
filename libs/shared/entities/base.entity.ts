import { Column, CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from 'typeorm';

import type { DateISOType } from '../types';


export class BaseEntity {

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: DateISOType;

  @Column({ name: 'created_by' })
  createdBy: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: DateISOType;

  @Column({ name: 'updated_by' })
  updatedBy: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime2', nullable: true })
  deletedAt: DateISOType;

}
