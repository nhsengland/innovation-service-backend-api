import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import type { DocumentType } from '../../schemas/innovation-record/index';
import { InnovationEntity } from './innovation.entity';

@Entity('innovation_document_draft')
export class InnovationDocumentDraftEntity extends BaseEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string;

  @Column({ type: 'simple-json' })
  document: DocumentType;

  @Column({ type: 'nvarchar', update: false, insert: false })
  version: DocumentType['version'];

  @OneToOne(() => InnovationEntity)
  @JoinColumn({ name: 'id' })
  innovation: InnovationEntity;
}
