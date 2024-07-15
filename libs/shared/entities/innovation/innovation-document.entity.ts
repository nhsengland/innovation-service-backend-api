import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import type { CurrentDocumentType, DocumentType } from '../../schemas/innovation-record/index';
import { InnovationEntity } from './innovation.entity';

@Entity('innovation_document')
export class InnovationDocumentEntity extends BaseEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string;

  @Column({ type: 'simple-json' })
  document: DocumentType;

  @Column({ type: 'nvarchar', update: false, insert: false })
  version: DocumentType['version'];

  @Column({ name: 'is_snapshot' })
  isSnapshot: boolean;

  @Column({ type: 'nvarchar', nullable: true })
  description: string | null;

  @OneToOne(() => InnovationEntity)
  @JoinColumn({ name: 'id' })
  innovation: InnovationEntity;
}

/**
 * creates a document with default information from an innovation
 * @param innovation the source innovation
 * @returns the document entity to be created
 */
export const createDocumentFromInnovation = (
  innovation: InnovationEntity,
  version: number,
  fields: {
    name: string;
    description?: string;
    countryName: string;
    postcode?: string;
    website?: string;
  }
): InnovationDocumentEntity => {
  const document: CurrentDocumentType = {
    version,
    INNOVATION_DESCRIPTION: {
      name: fields.name,
      description: fields.description,
      countryName: fields.countryName,
      postcode: fields.postcode,
      website: fields.website
    },
    UNDERSTANDING_OF_NEEDS: {},
    EVIDENCE_OF_EFFECTIVENESS: {},
    COST_OF_INNOVATION: {},
    CURRENT_CARE_PATHWAY: {},
    DEPLOYMENT: {},
    INTELLECTUAL_PROPERTY: {},
    MARKET_RESEARCH: {},
    REGULATIONS_AND_STANDARDS: {},
    REVENUE_MODEL: {},
    TESTING_WITH_USERS: {}
  };

  return {
    id: innovation.id,
    version,
    document: document,
    isSnapshot: true,
    description: 'Initial document',
    innovation: innovation,
    createdAt: innovation.createdAt,
    createdBy: innovation.createdBy,
    updatedAt: innovation.updatedAt,
    updatedBy: innovation.updatedBy,
    deletedAt: innovation.deletedAt
  };
};
