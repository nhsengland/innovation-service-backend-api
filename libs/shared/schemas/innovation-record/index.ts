import type { DocumentType202209 } from './202209/document.types';
import { DocumentValidationSchema202304Map, EvidenceSchema202304 } from './202304/document.schema';
import type { DocumentType202304 } from './202304/document.types';

export type CurrentEvidenceType = NonNullable<DocumentType202304['evidences']>[number];
export const CurrentEvidenceSchema = EvidenceSchema202304;
export type DocumentType = DocumentType202209 | DocumentType202304;

export type CurrentDocumentType = DocumentType202304;
export const CurrentDocumentSchemaMap = DocumentValidationSchema202304Map;
export * as CurrentCatalogTypes from './202304/catalog.types';
export * as CurrentDocumentConfig from './202304/document.config';

