import {
  getRequiredDocumentContexts,
  getRequiredDocumentIssues,
  type RequiredDocumentContext,
  type RequiredDocumentFile
} from './required-documents.validation';

const document = {
  EVIDENCE_OF_EFFECTIVENESS: { hasEvidence: 'YES' },
  REGULATIONS_AND_STANDARDS: { standards: [{ type: 'CE_UKCA_CLASS_I', hasMet: 'YES' }] },
  evidences: [{ id: 'evidence-1', description: 'Clinical trial', evidenceSubmitType: 'OTHER' }]
};
const contexts = (): RequiredDocumentContext[] => getRequiredDocumentContexts(document as never);
const file = (state: string, contextId = 'evidence-1'): RequiredDocumentFile => ({
  id: 'file-1',
  filename: 'results.pdf',
  contextId,
  contextType: contextId === 'evidence-1' ? 'INNOVATION_EVIDENCE' : 'INNOVATION_REGULATIONS',
  scanState: state
});

describe('required document validation', () => {
  it.each(['ready', 'legacy_allowed'])('allows %s documents', state => {
    expect(getRequiredDocumentIssues(contexts(), [file(state), file(state, 'CE_UKCA_CLASS_I')])).toEqual([]);
  });
  it.each(['scanning', 'delayed', 'rejected', 'scan_failed', 'not_scanned', 'removed', 'unavailable'])(
    'blocks %s even alongside a clean document',
    state => {
      const issues = getRequiredDocumentIssues(contexts(), [
        file('ready'),
        { ...file(state), id: 'blocked' },
        file('ready', 'CE_UKCA_CLASS_I')
      ]);
      expect(issues).toEqual([
        expect.objectContaining({
          section: 'EVIDENCE_OF_EFFECTIVENESS',
          contextId: 'evidence-1',
          contextName: 'Clinical trial',
          fileId: 'blocked',
          filename: 'results.pdf',
          scanState: state
        })
      ]);
    }
  );
  it('reports missing documents for every required context', () => {
    expect(getRequiredDocumentIssues(contexts(), [])).toEqual([
      expect.objectContaining({ contextId: 'evidence-1', scanState: 'missing' }),
      expect.objectContaining({ contextId: 'CE_UKCA_CLASS_I', scanState: 'missing' })
    ]);
  });
  it('does not treat missing or unexpected scan states as clean', () => {
    expect(getRequiredDocumentIssues(contexts(), [file('unknown')])[0]?.scanState).toBe('unavailable');
  });
  it('ignores files outside required contexts', () => {
    expect(getRequiredDocumentIssues([], [file('rejected')])).toEqual([]);
  });
  it('only requires evidence when YES and certificates when met', () => {
    expect(
      getRequiredDocumentContexts({
        ...document,
        EVIDENCE_OF_EFFECTIVENESS: { hasEvidence: 'NOT_YET' },
        REGULATIONS_AND_STANDARDS: { standards: [{ type: 'CE_UKCA_CLASS_I', hasMet: 'IN_PROGRESS' }] }
      } as never)
    ).toEqual([]);
  });
  it('reports a missing evidence entry when evidence is required', () => {
    expect(
      getRequiredDocumentIssues(getRequiredDocumentContexts({ ...document, evidences: [] } as never), [
        file('ready', 'CE_UKCA_CLASS_I')
      ])
    ).toEqual([expect.objectContaining({ section: 'EVIDENCE_OF_EFFECTIVENESS', scanState: 'missing' })]);
  });
  it('limits section completion to that section', () => {
    expect(getRequiredDocumentContexts(document as never, 'REGULATIONS_AND_STANDARDS')).toHaveLength(1);
    expect(getRequiredDocumentContexts(document as never, 'INNOVATION_DESCRIPTION')).toEqual([]);
  });
});
