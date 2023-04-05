import { DocumentValidationSchema202209Map } from './202209/document.schema';
import type { DocumentType202209 } from './202209/document.type';

export type EvidenceType = Required<DocumentType202209['EVIDENCE_OF_EFFECTIVENESS']>['evidences'][number];
export type DocumentType = DocumentType202209;

export type CurrentDocumentType = DocumentType202209;
export const CurrentDocumentSchemaMap = DocumentValidationSchema202209Map;
export * as CurrentCatalogTypes from './202209/catalog.types';
export * as CurrentDocumentConfig from './202209/document.config';

