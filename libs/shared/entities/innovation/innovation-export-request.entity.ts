import { AfterLoad, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';
import { OrganisationUnitEntity } from '../organisation/organisation-unit.entity';

import { InnovationExportRequestStatusEnum } from '../../enums';

@Entity('innovation_export_request')
export class InnovationExportRequestEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'status',
    type: 'simple-enum',
    enum: InnovationExportRequestStatusEnum,
    nullable: false,
  })
  status: InnovationExportRequestStatusEnum;

  @Column({ name: 'request_reason', type: 'varchar', length: 500, nullable: false })
  requestReason: string;

  @Column({ name: 'reject_reason', type: 'varchar', length: 500, nullable: true })
  rejectReason: null | string;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @ManyToOne(() => OrganisationUnitEntity, { nullable: false })
  @JoinColumn({ name: 'organisation_unit_id' })
  organisationUnit: OrganisationUnitEntity;

  isExportActive: boolean;
  isRequestPending: boolean;
  exportExpired: boolean;
  exportExpiresAt: Date;

  @AfterLoad()
  setIsActive(): void {
    this.isExportActive =
      this.status === InnovationExportRequestStatusEnum.APPROVED &&
      new Date(this.updatedAt) > new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  }

  @AfterLoad()
  setIsPending(): void {
    this.isRequestPending = this.status === InnovationExportRequestStatusEnum.PENDING;
  }

  // after entity is loaded compute exportExpired.
  // expires after 30 days
  @AfterLoad()
  setExportExpired(): void {
    if (this.status === InnovationExportRequestStatusEnum.APPROVED) {
      const isExpired = new Date(this.updatedAt) < new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);

      if (isExpired) {
        this.status = InnovationExportRequestStatusEnum.EXPIRED;
      }
    }
  }

  @AfterLoad()
  setExportExpiresAt(): void {
    if (
      [
        InnovationExportRequestStatusEnum.APPROVED,
        InnovationExportRequestStatusEnum.EXPIRED,
      ].includes(this.status)
    ) {
      this.exportExpiresAt = new Date(this.updatedAt);
      const updatedAt = new Date(this.updatedAt);
      this.exportExpiresAt.setDate(updatedAt.getDate() + 30);
    }
  }

  static new(data: Partial<InnovationExportRequestEntity>): InnovationExportRequestEntity {
    const instance = new InnovationExportRequestEntity();
    Object.assign(instance, data);
    return instance;
  }
}
