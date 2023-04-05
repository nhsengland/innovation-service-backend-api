import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import type { DocumentType } from '../../schemas/innovation-record/index';
import { InnovationEntity } from './innovation.entity';

@Entity('innovation_document')
export class InnovationDocumentEntity extends BaseEntity {

  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string;

  @Column({ type: 'simple-json' })
  document: DocumentType;

  @Column({ name: 'is_snapshot' })
  isSnapshot: boolean;

  @Column({type: 'nvarchar', nullable: true })
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
export const createDocumentFromInnovation = (innovation: InnovationEntity): InnovationDocumentEntity => {
  return {
    id: innovation.id,
    document: {
      version: '202209',
      INNOVATION_DESCRIPTION: {
        name: innovation.name,
        description: innovation.description ?? undefined,
        countryName: innovation.countryName,
        postcode: innovation.postcode ?? undefined
      },
      COMPARATIVE_COST_BENEFIT: {},
      EVIDENCE_OF_EFFECTIVENESS: {},
      COST_OF_INNOVATION: {},
      CURRENT_CARE_PATHWAY: {},
      IMPLEMENTATION_PLAN: {},
      INTELLECTUAL_PROPERTY: {},
      MARKET_RESEARCH: {},
      REGULATIONS_AND_STANDARDS: {},
      REVENUE_MODEL: {},
      TESTING_WITH_USERS: {},
      UNDERSTANDING_OF_BENEFITS: {},
      UNDERSTANDING_OF_NEEDS: {},
      VALUE_PROPOSITION: {}
    },
    isSnapshot: false,
    description: 'Initial document',
    innovation: innovation,
    createdAt: innovation.createdAt,
    createdBy: innovation.createdBy,
    updatedAt: innovation.updatedAt,
    updatedBy: innovation.updatedBy,
    deletedAt: innovation.deletedAt
  };
};
