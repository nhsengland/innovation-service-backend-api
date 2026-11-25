import type { CurrentCatalogTypes, DocumentType } from '@innovations/shared/schemas/innovation-record';

export type RequiredDocumentContext = {
  section: 'EVIDENCE_OF_EFFECTIVENESS' | 'REGULATIONS_AND_STANDARDS';
  contextType: string;
  contextId: string;
  contextName: string;
};
export type RequiredDocumentIssue = RequiredDocumentContext & {
  fileId?: string;
  filename?: string;
  scanState: string;
};
export type RequiredDocumentFile = {
  id: string;
  filename: string;
  contextType: string;
  contextId: string;
  scanState?: string;
};
export function getRequiredDocumentContexts(
  document: DocumentType,
  section?: CurrentCatalogTypes.InnovationSections
): RequiredDocumentContext[] {
  const contexts: RequiredDocumentContext[] = [];
  if (
    (!section || section === 'EVIDENCE_OF_EFFECTIVENESS') &&
    document.EVIDENCE_OF_EFFECTIVENESS?.hasEvidence === 'YES'
  ) {
    for (const evidence of document.evidences ?? []) {
      contexts.push({
        section: 'EVIDENCE_OF_EFFECTIVENESS',
        contextType: 'INNOVATION_EVIDENCE',
        contextId: evidence.id,
        contextName: evidence.description || evidence.evidenceSubmitType
      });
    }
    if (!document.evidences?.length) {
      contexts.push({
        section: 'EVIDENCE_OF_EFFECTIVENESS',
        contextType: 'INNOVATION_EVIDENCE',
        contextId: '',
        contextName: 'Evidence'
      });
    }
  }
  if (!section || section === 'REGULATIONS_AND_STANDARDS') {
    for (const standard of document.REGULATIONS_AND_STANDARDS?.standards ?? []) {
      if (standard.hasMet === 'YES') {
        contexts.push({
          section: 'REGULATIONS_AND_STANDARDS',
          contextType: 'INNOVATION_REGULATIONS',
          contextId: standard.type,
          contextName: standard.type
        });
      }
    }
  }
  return contexts;
}

export function getRequiredDocumentIssues(
  contexts: RequiredDocumentContext[],
  files: RequiredDocumentFile[]
): RequiredDocumentIssue[] {
  const blockedStates = new Set([
    'scanning',
    'delayed',
    'rejected',
    'scan_failed',
    'not_scanned',
    'removed',
    'unavailable'
  ]);
  return contexts.flatMap(context => {
    const attached = files.filter(
      file => file.contextType === context.contextType && file.contextId === context.contextId
    );
    if (!attached.length) return [{ ...context, scanState: 'missing' }];
    return attached
      .filter(file => file.scanState !== 'ready' && file.scanState !== 'legacy_allowed')
      .map(file => ({
        ...context,
        fileId: file.id,
        filename: file.filename,
        scanState: blockedStates.has(file.scanState ?? '') ? file.scanState! : 'unavailable'
      }));
  });
}
