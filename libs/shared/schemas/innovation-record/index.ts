import type { DocumentType202209 } from './202209/document.types';
import { DocumentValidationSchema202304Map, EvidenceSchema202304 } from './202304/document.schema';
import type { DocumentType202304 } from './202304/document.types';

// All versions
export type DocumentType = DocumentType202209 | DocumentType202304;
export const DocumentVersions = ['202209', '202304'] as const;
export type DocumentVersions = typeof DocumentVersions[number];

// Current version links
export * as CurrentCatalogTypes from './202304/catalog.types';
export * as CurrentDocumentConfig from './202304/document.config';
export const CurrentDocumentSchemaMap = DocumentValidationSchema202304Map;
export type CurrentDocumentType = DocumentType202304;
export type CurrentEvidenceType = NonNullable<CurrentDocumentType['evidences']>[number];
export const CurrentEvidenceSchema = EvidenceSchema202304;

// Helpers
export type DocumentTypeFromVersion<V extends DocumentType['version']> = V extends '202304' ? CurrentDocumentType : V extends '202209' ? DocumentType202209 : never;