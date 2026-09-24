import type { QueryRunner } from 'typeorm';
import { migratePrototypeNoToConceptStage1784031519584 } from './migrations/1784031519584-migrate-prototype-no-to-concept-stage';
import { updateInnovationProgressUkcaCe1784031519585 } from './migrations/1784031519585-update-innovation-progress-ukca-ce';

describe('migratePrototypeNoToConceptStage1784031519584', () => {
  it('updates NO values in submitted and draft documents', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const queryRunner = { query } as unknown as QueryRunner;

    await new migratePrototypeNoToConceptStage1784031519584().up(queryRunner);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toContain('UPDATE innovation_document');
    expect(query.mock.calls[1][0]).toContain('UPDATE innovation_document_draft');
    query.mock.calls.forEach(([sql]) => {
      expect(sql).toContain("'$.UNDERSTANDING_OF_NEEDS.hasProductServiceOrPrototype'");
      expect(sql).toContain("= 'NO'");
      expect(sql).toContain("'CONCEPT_STAGE'");
    });
  });

  it('prevents unsafe rollback', async () => {
    await expect(new migratePrototypeNoToConceptStage1784031519584().down()).rejects.toThrow('irreversible');
  });
});

describe('updateInnovationProgressUkcaCe1784031519585', () => {
  it('includes current medical-device and IVD standards in the UKCA/CE progress rule', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const queryRunner = { query } as unknown as QueryRunner;

    await new updateInnovationProgressUkcaCe1784031519585().up(queryRunner);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("'UK_MDR_CLASS_I'");
    expect(query.mock.calls[0][0]).toContain("'EU_MDR_CLASS_III'");
    expect(query.mock.calls[0][0]).toContain("'UKR_MDR_GENERAL_IVD'");
    expect(query.mock.calls[0][0]).toContain("'EU_IVDR_IVD_CLASS_D'");
    expect(query.mock.calls[0][0]).toContain("hasMet='YES'");
  });

  it('restores the previous prototype progress logic on rollback', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const queryRunner = { query } as unknown as QueryRunner;

    await new updateInnovationProgressUkcaCe1784031519585().down(queryRunner);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("'PROOF_OF_CONCEPT'");
    expect(query.mock.calls[0][0]).toContain("'WORKING_PRODUCT'");
    expect(query.mock.calls[0][0]).toContain("'SERVICE'");
  });
});
