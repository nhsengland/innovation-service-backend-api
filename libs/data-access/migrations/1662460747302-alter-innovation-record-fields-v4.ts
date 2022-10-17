import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterInnovationRecordFieldsV41662460747302 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`

      DECLARE @Command nvarchar(max) = '';
      SELECT @Command = 'ALTER TABLE [' + t.name + '] DROP CONSTRAINT ' + d.name + ';'
      FROM sys.tables t
      INNER JOIN sys.check_constraints d ON d.parent_object_id = t.object_id
      INNER JOIN sys.columns c ON c.object_id = t.object_id AND c.column_id = d.parent_column_id
      WHERE t.name = 'innovation_area' and c.name = 'type';
      EXECUTE(@Command);

      DELETE FROM innovation_area WHERE [type] NOT IN (
        'WORKFORCE', 
        'ECONOMIC_GROWTH', 
        'EVIDENCE_GENERATION', 
        'TRANSFORMED_OUT_OF_HOSPITAL_CARE', 
        'REDUCIND_PRESSURE_EMERGENCY_HOSPITAL_SERVICES', 
        'CONTROL_OVER_THEIR_OWN_HEALTH', 
        'DIGITALLY_ENABLING_PRIMARY_CARE', 
        'CANCER', 
        'MENTAL_HEALTH', 
        'CHILDREN_AND_YOUNG_PEOPLE', 
        'LEARNING_DISABILITIES_AND_AUTISM', 
        'CARDIOVASCULAR_DISEASE', 
        'STROKE_CARE', 
        'DIABETES', 
        'RESPIRATORY', 
        'RESEARCH_INNOVATION_DRIVE_FUTURE_OUTCOMES', 
        'GENOMICS', 
        'WIDER_SOCIAL_IMPACT', 
        'REDUCING_VARIATION_ACROSS_HEALTH_SYSTEM', 
        'FINANCIAL_PLANNING_ASSUMPTIONS', 
        'COVID_19', 
        'DATA_ANALYTICS_AND_RESEARCH', 
        'IMPROVING_SYSTEM_FLOW', 
        'INDEPENDENCE_AND_PREVENTION', 
        'OPERATIONAL_EXCELLENCE', 
        'PATIENT_ACTIVATION_AND_SELF_CARE', 
        'PATIENT_SAFETY', 
        'GREATER_SUPPORT_AND_RESOURCE_PRIMARY_CARE'
      );

      ALTER TABLE innovation_area ADD CONSTRAINT CK_innovation_area_type CHECK (
        [type] = 'WORKFORCE' OR
        [type] = 'ECONOMIC_GROWTH' OR
        [type] = 'EVIDENCE_GENERATION' OR
        [type] = 'TRANSFORMED_OUT_OF_HOSPITAL_CARE' OR
        [type] = 'REDUCIND_PRESSURE_EMERGENCY_HOSPITAL_SERVICES' OR
        [type] = 'CONTROL_OVER_THEIR_OWN_HEALTH' OR
        [type] = 'DIGITALLY_ENABLING_PRIMARY_CARE' OR
        [type] = 'CANCER' OR
        [type] = 'MENTAL_HEALTH' OR
        [type] = 'CHILDREN_AND_YOUNG_PEOPLE' OR
        [type] = 'LEARNING_DISABILITIES_AND_AUTISM' OR
        [type] = 'CARDIOVASCULAR_DISEASE' OR
        [type] = 'STROKE_CARE' OR
        [type] = 'DIABETES' OR
        [type] = 'RESPIRATORY' OR
        [type] = 'RESEARCH_INNOVATION_DRIVE_FUTURE_OUTCOMES' OR
        [type] = 'GENOMICS' OR
        [type] = 'WIDER_SOCIAL_IMPACT' OR
        [type] = 'REDUCING_VARIATION_ACROSS_HEALTH_SYSTEM'  OR
        [type] = 'FINANCIAL_PLANNING_ASSUMPTIONS' OR
        [type] = 'COVID_19' OR
        [type] = 'DATA_ANALYTICS_AND_RESEARCH' OR
        [type] = 'IMPROVING_SYSTEM_FLOW' OR
        [type] = 'INDEPENDENCE_AND_PREVENTION' OR
        [type] = 'OPERATIONAL_EXCELLENCE' OR
        [type] = 'PATIENT_ACTIVATION_AND_SELF_CARE' OR
        [type] = 'PATIENT_SAFETY' OR
        [type] = 'GREATER_SUPPORT_AND_RESOURCE_PRIMARY_CARE'
      );

    `);

    await queryRunner.query(`

      DECLARE @Command nvarchar(max) = '';
      SELECT @Command = 'ALTER TABLE [' + t.name + '] DROP CONSTRAINT ' + d.name + ';'
      FROM sys.tables t
      INNER JOIN sys.check_constraints d ON d.parent_object_id = t.object_id
      INNER JOIN sys.columns c ON c.object_id = t.object_id AND c.column_id = d.parent_column_id
      WHERE t.name = 'innovation_care_setting' and c.name = 'type';
      EXECUTE(@Command);

      DELETE FROM innovation_care_setting WHERE [type] NOT IN (
        'STP_ICS',
        'CCGS',
        'ACUTE_TRUSTS_INPATIENT',
        'ACUTE_TRUSTS_OUTPATIENT',
        'PRIMARY_CARE',
        'MENTAL_HEALTH',
        'AMBULANCE',
        'SOCIAL_CARE',
        'INDUSTRY',
        'COMMUNITY',
        'ACADEMIA',
        'DOMICILIARY_CARE',
        'PHARMACY',
        'URGENT_AND_EMERGENCY',
        'OTHER'
      );

      ALTER TABLE innovation_care_setting ADD CONSTRAINT CK_innovation_care_setting_type CHECK (
        [type] = 'STP_ICS' OR
        [type] = 'CCGS' OR
        [type] = 'ACUTE_TRUSTS_INPATIENT' OR
        [type] = 'ACUTE_TRUSTS_OUTPATIENT' OR
        [type] = 'PRIMARY_CARE' OR
        [type] = 'MENTAL_HEALTH' OR
        [type] = 'AMBULANCE' OR
        [type] = 'SOCIAL_CARE' OR
        [type] = 'INDUSTRY' OR
        [type] = 'COMMUNITY' OR
        [type] = 'ACADEMIA' OR
        [type] = 'DOMICILIARY_CARE' OR
        [type] = 'PHARMACY' OR
        [type] = 'URGENT_AND_EMERGENCY' OR
        [type] = 'OTHER'
      );

    `);

    await queryRunner.query(`

      ALTER TABLE innovation ADD other_care_setting nvarchar(100) NULL;

    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`
    
      ALTER TABLE innovation_area DROP CONSTRAINT CK_innovation_area_type;
      DELETE FROM innovation_area WHERE[type] NOT IN(
        'COVID_19',
        'DATA_ANALYTICS_AND_RESEARCH',
        'DIGITALISING_SYSTEM',
        'IMPROVING_SYSTEM_FLOW',
        'INDEPENDENCE_AND_PREVENTION',
        'OPERATIONAL_EXCELLENCE',
        'PATIENT_ACTIVATION_AND_SELF_CARE',
        'PATIENT_SAFETY',
        'WORKFORCE_OPTIMISATION'
      );
      ALTER TABLE innovation_area ADD CONSTRAINT CK_innovation_area_type CHECK(
        [type] = 'COVID_19' OR
        [type] = 'DATA_ANALYTICS_AND_RESEARCH' OR
        [type] = 'DIGITALISING_SYSTEM' OR
        [type] = 'IMPROVING_SYSTEM_FLOW' OR
        [type] = 'INDEPENDENCE_AND_PREVENTION' OR
        [type] = 'OPERATIONAL_EXCELLENCE' OR
        [type] = 'PATIENT_ACTIVATION_AND_SELF_CARE' OR
        [type] = 'PATIENT_SAFETY' OR
        [type] = 'WORKFORCE_OPTIMISATION'
    );

    `);

    await queryRunner.query(`

      ALTER TABLE innovation_care_setting DROP CONSTRAINT CK_innovation_care_setting_type;
      DELETE FROM innovation_care_setting WHERE[type] NOT IN(
        'SOCIAL_CARE',
        'PRIMARY_CARE',
        'PHARMACY',
        'PATIENT_HOME',
        'MENTAL_HEALTH',
        'HOSPITAL_OUTPATIENT',
        'HOSPITAL_INPATIENT',
        'COMMUNITY',
        'AMBULANCE_OR_PARAMEDIC'
      );
      ALTER TABLE innovation_care_setting ADD CONSTRAINT CK_innovation_care_setting_type CHECK(
        [type] = 'SOCIAL_CARE' OR
        [type] = 'PRIMARY_CARE' OR
        [type] = 'PHARMACY' OR
        [type] = 'PATIENT_HOME' OR
        [type] = 'MENTAL_HEALTH' OR
        [type] = 'HOSPITAL_OUTPATIENT' OR
        [type] = 'HOSPITAL_INPATIENT' OR
        [type] = 'COMMUNITY' OR
        [type] = 'AMBULANCE_OR_PARAMEDIC'
      );

    `);

    await queryRunner.query(`

      ALTER TABLE innovation DROP COLUMN other_care_setting;

    `);

  }

}
