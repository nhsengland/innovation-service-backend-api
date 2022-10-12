import { Column, CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from 'typeorm';

import type { DateISOType } from '../types';


export class BaseEntity {

  @CreateDateColumn({ name: 'created_at' })
  createdAt: DateISOType;

  @Column({ name: 'created_by' })
  createdBy: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: DateISOType;

  @Column({ name: 'updated_by' })
  updatedBy: string;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: DateISOType;

}
