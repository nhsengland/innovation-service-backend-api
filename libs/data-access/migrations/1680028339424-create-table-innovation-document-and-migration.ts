import { groupBy } from 'lodash';
import type { DeepPartial, MigrationInterface, QueryRunner } from 'typeorm';

import { InnovationAreaEntity, InnovationCareSettingEntity, InnovationCategoryEntity, InnovationDeploymentPlanEntity, InnovationDiseaseConditionEntity, InnovationDocumentEntity, InnovationEntity, InnovationEnvironmentalBenefitEntity, InnovationEvidenceEntity, InnovationFileEntity, InnovationGeneralBenefitEntity, InnovationPatientsCitizensBenefitEntity, InnovationRevenueEntity, InnovationStandardEntity, InnovationSubgroupEntity, InnovationSupportTypeEntity, InnovationUserTestEntity } from '../../shared/entities';
import type { InnovationSections } from '../../shared/schemas/innovation-record/220209/catalog.types';

export class createTableInnovationDocumentAndMigration1680028339424 implements MigrationInterface {
  name?: string | undefined;
  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`
      CREATE TABLE innovation_document (
        id uniqueidentifier NOT NULL,
        version AS JSON_VALUE(document,'$.version'),
        document nvarchar(max) NOT NULL CONSTRAINT "df_innovation_document_document" DEFAULT '{}',
        is_snapshot BIT NOT NULL CONSTRAINT "df_innovation_document_is_snapshot" DEFAULT 0,
        description nvarchar(255) NULL,
        "created_at" datetime2 NOT NULL CONSTRAINT "df_innovation_document_created_at" DEFAULT getdate(),
        "created_by" uniqueidentifier,
        "updated_at" datetime2 NOT NULL CONSTRAINT "df_innovation_document_updated_at" DEFAULT getdate(),
        "updated_by" uniqueidentifier,
        "deleted_at" datetime2,
        [valid_from] datetime2 GENERATED ALWAYS AS ROW START,
        [valid_to] datetime2 GENERATED ALWAYS AS ROW END,
        PERIOD FOR SYSTEM_TIME (valid_from, valid_to),
        CONSTRAINT "pk_innovation_document_id" PRIMARY KEY ("id")
      ) with (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.innovation_document_history, History_retention_period = 7 YEAR));
  
      ALTER TABLE "innovation_document" ADD CONSTRAINT "fk_innovation_document_innovation_id" FOREIGN KEY ("id") REFERENCES "innovation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  
      -- Ensure that the document is a valid JSON
      ALTER TABLE "innovation_document" ADD CONSTRAINT CK_innovation_document_is_json CHECK (ISJSON(document)=1);

      -- Ensure that the description is not null when the document is a snapshot so that it is nicely displayed in the UI
      ALTER TABLE "innovation_document" ADD CONSTRAINT CK_snapshot_description_is_not_null CHECK (is_snapshot=0 OR (is_snapshot=1 AND description IS NOT NULL));
    `);

    const innovations = await queryRunner.manager.createQueryBuilder(InnovationEntity, 'innovation').withDeleted().getMany();
    const innovationCategories = groupBy((await queryRunner.manager.createQueryBuilder(InnovationCategoryEntity, 'category').getMany()), 'innovationId');
    const innovationAreas = groupBy((await queryRunner.manager.createQueryBuilder(InnovationAreaEntity, 'area').getMany()), 'innovationId');
    const innovationCareSettings = groupBy((await queryRunner.manager.createQueryBuilder(InnovationCareSettingEntity, 'careSetting').getMany()), 'innovationId');
    const innovationSupportTypes = groupBy((await queryRunner.manager.createQueryBuilder(InnovationSupportTypeEntity, 'supportType').getMany()), 'innovationId');
    const innovationSubgroups = groupBy(
      (await queryRunner.manager.createQueryBuilder(InnovationSubgroupEntity, 'subgroup')
        .leftJoin('subgroup.innovation', 'innovation')
        .addSelect('innovation.id')
        .getMany()), 
      'innovation.id'
    );
    const innovationDiseasesConditionsImpacts = groupBy((await queryRunner.manager.createQueryBuilder(InnovationDiseaseConditionEntity, 'diseases').getMany()), 'innovationId');
    const innovationEnvironmentalBenefits = groupBy((await queryRunner.manager.createQueryBuilder(InnovationEnvironmentalBenefitEntity, 'benefits').getMany()), 'innovationId');
    const innovationGeneralBenefits = groupBy((await queryRunner.manager.createQueryBuilder(InnovationGeneralBenefitEntity, 'benefits').getMany()), 'innovationId');
    const innovationPatientsCitizensBenefits = groupBy((await queryRunner.manager.createQueryBuilder(InnovationPatientsCitizensBenefitEntity, 'benefits').getMany()), 'innovationId');
    const innovationEvidences = groupBy(
      (await queryRunner.manager.createQueryBuilder(InnovationEvidenceEntity, 'evidences')
        .leftJoin('evidences.innovation', 'innovation')
        .addSelect('innovation.id')
        .leftJoinAndSelect('evidences.files', 'files')
        .getMany()),
      'innovation.id'
    );
    const innovationStandards = groupBy(
      (await queryRunner.manager.createQueryBuilder(InnovationStandardEntity, 'standards')
        .leftJoin('standards.innovation', 'innovation')
        .addSelect('innovation.id')
        .getMany()),
      'innovation.id'
    );
    const innovationUserTests = groupBy(
      (await queryRunner.manager.createQueryBuilder(InnovationUserTestEntity, 'tests')
        .leftJoin('tests.innovation', 'innovation')
        .addSelect('innovation.id')
        .getMany()),
      'innovation.id'
    );
    const innovationRevenues = groupBy((await queryRunner.manager.createQueryBuilder(InnovationRevenueEntity, 'revenues').getMany()), 'innovationId');
    const innovationDeploymentPlans = groupBy(
      (await queryRunner.manager.createQueryBuilder(InnovationDeploymentPlanEntity, 'plans')
        .leftJoin('plans.innovation', 'innovation')
        .addSelect('innovation.id')
        .getMany()),
      'innovation.id'
    );
    
    const filesMap = new Map<string, Map<InnovationSections, string[]>>();
    for (const file of await queryRunner.manager.createQueryBuilder(InnovationFileEntity, 'file').getRawMany()) {
      if(!filesMap.has(file.file_innovation_id)) {
        filesMap.set(file.file_innovation_id, new Map<InnovationSections, string[]>());
      }
      const innovationFiles = filesMap.get(file.file_innovation_id)!;
      if(!innovationFiles.has(file.file_context)) {
        innovationFiles.set(file.file_context, []);
      }
      innovationFiles.get(file.file_context)!.push(file.file_id);
    }
    
    const documents : DeepPartial<InnovationDocumentEntity>[] = [];

    for(const innovation of innovations) {

      documents.push({
        id: innovation.id,
        isSnapshot: true,
        description: 'Initial IR document',
        document: {
          version: '202209',
          INNOVATION_DESCRIPTION: {
            name: innovation.name,
            description: innovation.description ?? undefined,
            countryName: innovation.countryName ?? undefined,
            postcode: innovation.postcode ?? undefined,
            hasFinalProduct: innovation.hasFinalProduct ?? undefined,
            categories: innovationCategories[innovation.id]?.map(c => c.type) ?? [],
            otherCategoryDescription: innovation.otherCategoryDescription ?? undefined,
            mainCategory: innovation.mainCategory ?? undefined,
            otherMainCategoryDescription: innovation.otherMainCategoryDescription ?? undefined,
            areas: innovationAreas[innovation.id]?.map(a => a.type) ?? [],
            careSettings: innovationCareSettings[innovation.id]?.map(c => c.type) ?? [],
            otherCareSetting: innovation.otherCareSetting ?? undefined,
            mainPurpose: innovation.mainPurpose ?? undefined,
            supportTypes: innovationSupportTypes[innovation.id]?.map(s => s.type) ?? [],
            moreSupportDescription: innovation.moreSupportDescription ?? undefined,
          },
          VALUE_PROPOSITION: {
            hasProblemTackleKnowledge: innovation.hasProblemTackleKnowledge ?? undefined,
            intervention: innovation.intervention ?? undefined,
            interventionImpact: innovation.interventionImpact ?? undefined,
            problemsConsequences: innovation.problemsConsequences ?? undefined,
            problemsTackled: innovation.problemsTackled ?? undefined,
          },
          UNDERSTANDING_OF_NEEDS: {
            impactPatients: innovation.impactPatients ?? undefined,
            impactClinicians: innovation.impactClinicians ?? undefined,
            subgroups: innovationSubgroups[innovation.id]?.map(s => s.name) ?? [],
            cliniciansImpactDetails: innovation.cliniciansImpactDetails ?? undefined,
            diseasesConditionsImpact: innovationDiseasesConditionsImpacts[innovation.id]?.map(d => d.type) ?? [],
          },
          UNDERSTANDING_OF_BENEFITS: {
            accessibilityImpactDetails: innovation.accessibilityImpactDetails ?? undefined,
            accessibilityStepsDetails: innovation.accessibilityStepsDetails ?? undefined,
            environmentalBenefits: innovationEnvironmentalBenefits[innovation.id]?.map(b => b.type) ?? [],
            generalBenefits: innovationGeneralBenefits[innovation.id]?.map(b => b.type) ?? [],
            hasBenefits: innovation.hasBenefits ?? undefined,
            otherEnvironmentalBenefit: innovation.otherEnvironmentalBenefit ?? undefined,
            otherGeneralBenefit: innovation.otherGeneralBenefit ?? undefined,
            patientsCitizensBenefits: innovationPatientsCitizensBenefits[innovation.id]?.map(b => b.type) ?? []
          },
          EVIDENCE_OF_EFFECTIVENESS: {
            hasEvidence: innovation.hasEvidence ?? undefined,
            evidences: innovationEvidences[innovation.id]?.map( e => ({
              evidenceType: e.evidenceType ?? undefined,
              clinicalEvidenceType: e.clinicalEvidenceType ?? undefined,
              description: e.description ?? undefined,
              summary: e.summary ?? undefined,
              files: e.files.map(f => f.id)
            })) ?? []
          },
          MARKET_RESEARCH: {
            hasMarketResearch: innovation.hasMarketResearch ?? undefined,
            marketResearch: innovation.marketResearch ?? undefined,
          },
          INTELLECTUAL_PROPERTY: {
            hasOtherIntellectual: innovation.hasOtherIntellectual ?? undefined,
            hasPatents: innovation.hasPatents ?? undefined,
            otherIntellectual: innovation.otherIntellectual ?? undefined,
          },
          REGULATIONS_AND_STANDARDS: {
            hasRegulationKnowledge: innovation.hasRegulationKnowledge ?? undefined,
            otherRegulationDescription: innovation.otherRegulationDescription ?? undefined,
            standards: innovationStandards[innovation.id]?.map(s => ({
              hasMet: s.hasMet ?? undefined,
              type: s.type,
            })) ?? [],
            files: filesMap.get(innovation.id)?.get('REGULATIONS_AND_STANDARDS') ?? []
          },
          CURRENT_CARE_PATHWAY: {
            carePathway: innovation.carePathway ?? undefined,
            hasUKPathwayKnowledge: innovation.hasUKPathwayKnowledge ?? undefined,
            innovationPathwayKnowledge: innovation.innovationPathwayKnowledge ?? undefined,
            potentialPathway: innovation.potentialPathway ?? undefined,
          },
          TESTING_WITH_USERS: {
            hasTests: innovation.hasTests ?? undefined,
            userTests: innovationUserTests[innovation.id]?.map( t => ({
              kind: t.kind,
              feedback: t.feedback
            })) ?? [],
            files: filesMap.get(innovation.id)?.get('TESTING_WITH_USERS') ?? []
          },
          COST_OF_INNOVATION: {
            costDescription: innovation.costDescription ?? undefined,
            hasCostKnowledge: innovation.hasCostKnowledge ?? undefined,
            patientsRange: innovation.patientsRange as any ?? undefined,
            sellExpectations: innovation.sellExpectations ?? undefined,
            usageExpectations: innovation.usageExpectations ?? undefined,
          },
          COMPARATIVE_COST_BENEFIT: {
            costComparison: innovation.costComparison ?? undefined,
            hasCostCareKnowledge: innovation.hasCostCareKnowledge ?? undefined,
            hasCostSavingKnowledge: innovation.hasCostSavingKnowledge ?? undefined,
          },
          REVENUE_MODEL: {
            benefittingOrganisations: innovation.benefittingOrganisations ?? undefined,
            fundingDescription: innovation.fundingDescription ?? undefined,
            hasFunding: innovation.hasFunding ?? undefined,
            hasRevenueModel: innovation.hasRevenueModel ?? undefined,
            otherRevenueDescription: innovation.otherRevenueDescription ?? undefined,
            payingOrganisations: innovation.payingOrganisations ?? undefined,
            revenues: innovationRevenues[innovation.id]?.map(r => r.type) ?? []
          },
          IMPLEMENTATION_PLAN: {
            deploymentPlans: innovationDeploymentPlans[innovation.id]?.map(d => ({
              commercialBasis: d.commercialBasis ?? undefined,
              name: d.name ?? undefined,
              orgDeploymentAffect: d.orgDeploymentAffect ?? undefined,
            })) ?? [],
            files: filesMap.get(innovation.id)?.get('IMPLEMENTATION_PLAN') ?? [],
            hasDeployPlan: innovation.hasDeployPlan ?? undefined,
            hasResourcesToScale: innovation.hasResourcesToScale ?? undefined,
            isDeployed: innovation.isDeployed ?? undefined
          }
        },
        createdAt: innovation.createdAt,
        createdBy: innovation.createdBy,
        updatedAt: innovation.updatedAt,
        updatedBy: innovation.updatedBy,
        deletedAt: innovation.deletedAt,
      });
    }

    while(documents.length) {
      const chunk = documents.splice(0, 100);
      await queryRunner.manager.getRepository(InnovationDocumentEntity).save(chunk);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // deprecated
    await _queryRunner.query(`
    ALTER TABLE innovation_document SET ( SYSTEM_VERSIONING = OFF);
    DROP TABLE innovation_document;
    DROP TABLE innovation_document_history;
    `);
  }

}
