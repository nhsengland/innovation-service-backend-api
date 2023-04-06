import type { DocumentType202209 } from './202209/document.types';
import { DocumentValidationSchema202304Map } from './202304/document.schema';
import type { DocumentType202304 } from './202304/document.types';

// TODO Change the EvidenceType when DocumentType 202304 is fully implemented
export type EvidenceType = Required<DocumentType202209['EVIDENCE_OF_EFFECTIVENESS']>['evidences'][number];
export type DocumentType = DocumentType202209 | DocumentType202304;

export type CurrentDocumentType = DocumentType202304;
export const CurrentDocumentSchemaMap = DocumentValidationSchema202304Map;
export * as CurrentCatalogTypes from './202304/catalog.types';
export * as CurrentDocumentConfig from './202304/document.config';

