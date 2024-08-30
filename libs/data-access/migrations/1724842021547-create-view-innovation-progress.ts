import type { MigrationInterface, QueryRunner } from 'typeorm';

// This view is used to calculate the KPI for the support team, this can be improved once we don't need to query the
// activity log
export class createViewInnovationProgress1724842021547 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE OR ALTER VIEW [innovation_progress_view] AS
      WITH innovation_data AS (
        SELECT i.id,document,has_validation,a.has_evidence FROM innovation_document d
        INNER JOIN innovation i on d.id = i.id
        LEFT JOIN innovation_assessment a ON i.id=a.innovation_id AND i.current_assessment_id=a.id AND a.finished_at IS NOT NULL
      ) SELECT 
      id as innovation_id,
      IIF(
        JSON_VALUE(document, '$.DEPLOYMENT.isDeployed') = 'YES', 
        (SELECT COUNT(*) FROM OPENJSON(document, '$.DEPLOYMENT.deploymentPlans')),
        NULL) as deployment_count,
      (
        SELECT TOP 1 'YES'
        FROM OPENJSON(document, '$.REGULATIONS_AND_STANDARDS.standards')
        WITH (
          type varchar(250),
        hasMet varchar(10)
        )
        WHERE type IN ('CE_UKCA_NON_MEDICAL', 'CE_UKCA_CLASS_I', 'CE_UKCA_CLASS_II_A', 'CE_UKCA_CLASS_II_B', 'CE_UKCA_CLASS_III') AND hasMet='YES'
      ) as ukcace_certification,
      (
        SELECT TOP 1 'YES'
        FROM OPENJSON(document, '$.REGULATIONS_AND_STANDARDS.standards')
        WITH (
          type varchar(250),
        hasMet varchar(10)
        )
        WHERE type='DTAC' AND hasMet='YES'
      ) as dtac_certification,
      (
        SELECT TOP 1 'YES'
        FROM OPENJSON(document, '$.evidences')
        WITH (
          evidenceSubmitType varchar(100)
        )
        WHERE evidenceSubmitType = 'CLINICAL_OR_CARE'
      ) as evidence_clinical_or_care,
      (
        SELECT TOP 1 'YES'
        FROM OPENJSON(document, '$.evidences')
        WITH (
          evidenceSubmitType varchar(100)
        )
        WHERE evidenceSubmitType = 'REAL_WORLD'
      ) as evidence_real_world,
      IIF(has_validation='NO', null, has_validation) as assessment_real_world_validation,
      IIF(JSON_VALUE(document, '$.EVIDENCE_OF_EFFECTIVENESS.hasEvidence') = 'YES', 'YES', NULL) as evidence_of_impact,
      IIF(has_evidence='NO', null, has_evidence) as assessment_evidence_prove_efficacy,
      (
        SELECT TOP 1 'YES'
        FROM OPENJSON(document, '$.evidences')
        WITH (
          evidenceSubmitType varchar(100)
        )
        WHERE evidenceSubmitType = 'COST_IMPACT_OR_ECONOMIC'
      ) as evidence_cost_impact,
      IIF(JSON_VALUE(document, '$.UNDERSTANDING_OF_NEEDS.hasProductServiceOrPrototype') = 'YES' , 'YES' , NULL) as working_product,
      IIF(JSON_VALUE(document, '$.UNDERSTANDING_OF_NEEDS.carbonReductionPlan') = 'YES', 'YES', NULL) as carbon_reduction_plan,
      (
        SELECT TOP 1 'YES' FROM innovation_support_log sl
        INNER JOIN organisation_unit ou on sl.organisation_unit_id = ou.id
        WHERE 
        sl.type = 'PROGRESS_UPDATE'
        AND sl.innovation_id = d.id
        AND EXISTS(SELECT TOP 1 1 FROM OPENJSON(params, '$.subCategories') WHERE value = 'Topic Exploration Report (TER) completed')
        AND ou.acronym = 'HTW'
      ) as htw_ter_complete,
      (
        SELECT TOP 1 'YES' FROM innovation_support_log sl
        INNER JOIN organisation_unit ou on sl.organisation_unit_id = ou.id
        WHERE 
        sl.type = 'PROGRESS_UPDATE'
        AND sl.innovation_id = d.id
        AND EXISTS(SELECT TOP 1 1 FROM OPENJSON(params, '$.categories') WHERE value = 'Selected for NICE guidance output')
        AND ou.acronym = 'NICE'
      ) as nice_guidance_complete,
      (
        SELECT TOP 1 'YES' FROM innovation_support_log sl
        INNER JOIN organisation_unit ou on sl.organisation_unit_id = ou.id
        WHERE 
        sl.type = 'PROGRESS_UPDATE'
        AND sl.innovation_id = d.id
        AND EXISTS(SELECT TOP 1 1 FROM OPENJSON(params, '$.categories') WHERE value IN ('Business as usual (BAU) procurement route identified', 'Innovation procurement route identified'))
        AND ou.acronym = 'NHS-SC'
      ) as sc_procurement_route_identified 
      FROM innovation_data d
  `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP VIEW [innovation_progress_view]');
  }
}
