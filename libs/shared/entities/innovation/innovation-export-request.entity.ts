import { InnovationEntity } from './innovation.entity';
import { InnovationExportRequestStatusEnum } from '../../enums';
import { AfterLoad, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { OrganisationUnitEntity } from '../organisation/organisation-unit.entity';


@Entity('innovation_export_request')
export class InnovationExportRequestEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({name: 'status', type: 'simple-enum', enum: InnovationExportRequestStatusEnum, nullable: false})
  status: InnovationExportRequestStatusEnum;

  @Column({name: 'request_reason', type: 'varchar', length: 255, nullable: false})
  requestReason: string;

  @Column({name: 'reject_reason', type: 'varchar', length: 255, nullable: true})
  rejectReason: null | string;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @ManyToOne(() => OrganisationUnitEntity, { nullable: false })
  @JoinColumn({ name: 'organisation_unit_id' })
  organisationUnit: OrganisationUnitEntity;

  requestExpired: boolean;
  exportExpired: boolean;

  exportExpiresAt: Date;

  // after entity is loaded compute requestExpired. 
  // expires after 7 days
  @AfterLoad()
  setRequestExpired(): void {
    if (this.status === InnovationExportRequestStatusEnum.PENDING) {
      this.requestExpired = 
          new Date(this.createdAt) < new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
    }
  }

  // after entity is loaded compute exportExpired. 
  // expires after 30 days
  @AfterLoad()
  setExportExpired(): void {
    if (this.status === InnovationExportRequestStatusEnum.APPROVED) {
      this.exportExpired = 
          new Date(this.createdAt) < new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    }
  }

  @AfterLoad()
  setExportExpiresAt(): void {
    if (this.status === InnovationExportRequestStatusEnum.APPROVED) {
      this.exportExpiresAt = new Date(this.updatedAt);
      const updatedAt = new Date(this.updatedAt);
      this.exportExpiresAt.setDate(updatedAt.getDate() + 30);
      return;
    }
    return;
  }

  static new(data: Partial<InnovationExportRequestEntity>): InnovationExportRequestEntity {
    const instance = new InnovationExportRequestEntity();
    Object.assign(instance, data);
    return instance;
  }
}