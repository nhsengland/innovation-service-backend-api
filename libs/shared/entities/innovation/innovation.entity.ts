import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn
} from 'typeorm';

import { BaseEntity } from '../base.entity';
import { OrganisationEntity } from '../organisation/organisation.entity';
import { NotificationEntity } from '../user/notification.entity';
import { UserEntity } from '../user/user.entity';
import { InnovationGroupedStatusViewEntity } from '../views/innovation-grouped-status.view.entity';
import { InnovationAssessmentEntity } from './innovation-assessment.entity';
import { InnovationCollaboratorEntity } from './innovation-collaborator.entity';
import { InnovationDocumentEntity } from './innovation-document.entity';
import { InnovationExportRequestEntity } from './innovation-export-request.entity';
import { InnovationReassessmentRequestEntity } from './innovation-reassessment-request.entity';
import { InnovationSectionEntity } from './innovation-section.entity';
import { InnovationSupportLogEntity } from './innovation-support-log.entity';
import { InnovationSupportEntity } from './innovation-support.entity';
import { InnovationTransferEntity } from './innovation-transfer.entity';

import { InnovationStatusEnum } from '../../enums/innovation.enums';
import type { CurrentCatalogTypes } from '../../schemas/innovation-record';

@Entity('innovation')
export class InnovationEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', length: 100 })
  name: string;

  @Column({ type: 'simple-enum', enum: InnovationStatusEnum, nullable: false })
  status: InnovationStatusEnum;

  @Column({ name: 'status_updated_at', type: 'datetime2' })
  statusUpdatedAt: Date;

  @Column({ name: 'expires_at', type: 'datetime2', nullable: true })
  expires_at: null | Date;

  @Column({ name: 'description', type: 'nvarchar', nullable: true })
  description: null | string;

  @Column({ name: 'country_name', length: 100 })
  countryName: string;

  @Column({ name: 'postcode', type: 'nvarchar', nullable: true, length: 20 })
  postcode: null | string;

  @Column({ name: 'submitted_at', type: 'datetime2', nullable: true })
  submittedAt: null | Date;

  @Column({ name: 'last_assessment_request_at', type: 'datetime2', nullable: true })
  lastAssessmentRequestAt: null | Date;

  @Column({ name: 'other_category_description', type: 'nvarchar', nullable: true })
  otherCategoryDescription: null | string;

  @Column({ name: 'main_category', type: 'nvarchar', nullable: true })
  mainCategory: null | CurrentCatalogTypes.catalogCategory;

  @Column({ name: 'withdraw_reason', type: 'nvarchar', nullable: true })
  withdrawReason: null | string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner: null | UserEntity;

  @ManyToMany(() => OrganisationEntity, record => record.innovationShares, {
    nullable: true,
    cascade: ['update']
  })
  @JoinTable({
    name: 'innovation_share',
    joinColumn: {
      name: 'innovation_id',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'organisation_id',
      referencedColumnName: 'id'
    }
  })
  organisationShares: OrganisationEntity[];

  @OneToMany(() => InnovationAssessmentEntity, record => record.innovation, {
    cascade: ['insert', 'update']
  })
  assessments: InnovationAssessmentEntity[];

  @OneToMany(() => InnovationSectionEntity, record => record.innovation, {
    cascade: ['insert', 'update']
  })
  sections: InnovationSectionEntity[];

  @OneToMany(() => InnovationSupportEntity, record => record.innovation, {
    cascade: ['insert', 'update']
  })
  innovationSupports: InnovationSupportEntity[];

  @OneToMany(() => InnovationSupportLogEntity, record => record.innovation, {
    cascade: ['insert', 'update']
  })
  innovationSupportLogs: InnovationSupportLogEntity[];

  @OneToMany(() => NotificationEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  notifications: Promise<NotificationEntity[]>;

  @OneToMany(() => InnovationReassessmentRequestEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  reassessmentRequests: Promise<InnovationReassessmentRequestEntity[]>;

  @OneToMany(() => InnovationExportRequestEntity, record => record.innovation, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  exportRequests: Promise<InnovationExportRequestEntity[]>;

  @OneToOne(() => InnovationGroupedStatusViewEntity, record => record.innovation)
  innovationGroupedStatus: InnovationGroupedStatusViewEntity;

  @OneToMany(() => InnovationCollaboratorEntity, record => record.innovation)
  collaborators: InnovationCollaboratorEntity[];

  @OneToOne(() => InnovationDocumentEntity)
  @JoinColumn({ name: 'id' })
  document: InnovationDocumentEntity;

  @OneToMany(() => InnovationTransferEntity, record => record.innovation, {
    cascade: ['insert', 'update']
  })
  transfers: InnovationTransferEntity[];

  static new(data: Partial<InnovationEntity>): InnovationEntity {
    const instance = new InnovationEntity();
    Object.assign(instance, data);
    return instance;
  }
}
