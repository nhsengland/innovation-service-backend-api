import type { MigrationInterface, QueryRunner } from 'typeorm';

export class migrateIrData1718807092268 implements MigrationInterface {
  name?: string | undefined;
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create innovation_document_new table
    await queryRunner.query(`
      CREATE TABLE innovation_document_new (
        id uniqueidentifier NOT NULL,
        version AS JSON_VALUE(document,'$.version'),
        document nvarchar(max) NOT NULL CONSTRAINT "df_innovation_document_new_document" DEFAULT '{}',
        is_snapshot BIT NOT NULL CONSTRAINT "df_innovation_document_new_is_snapshot" DEFAULT 0,
        description nvarchar(255) NULL,
        "created_at" datetime2 NOT NULL CONSTRAINT "df_innovation_document_new_created_at" DEFAULT getdate(),
        "created_by" uniqueidentifier,
        "updated_at" datetime2 NOT NULL CONSTRAINT "df_innovation_document_new_updated_at" DEFAULT getdate(),
        "updated_by" uniqueidentifier,
        "deleted_at" datetime2,
        [valid_from] datetime2 GENERATED ALWAYS AS ROW START,
        [valid_to] datetime2 GENERATED ALWAYS AS ROW END,
        PERIOD FOR SYSTEM_TIME (valid_from, valid_to),
        CONSTRAINT "pk_innovation_document_new_id" PRIMARY KEY ("id")
      ) with (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.innovation_document_new_history, History_retention_period = 7 YEAR));

      ALTER TABLE "innovation_document_new" ADD CONSTRAINT "fk_innovation_document_new_innovation_id" FOREIGN KEY ("id") REFERENCES "innovation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

      -- Ensure that the document is a valid JSON
      ALTER TABLE "innovation_document_new" ADD CONSTRAINT CK_innovation_document_new_is_json CHECK (ISJSON(document)=1);

      -- Ensure that the description is not null when the document is a snapshot so that it is nicely displayed in the UI
      ALTER TABLE "innovation_document_new" ADD CONSTRAINT CK_snapshot_description_ew_is_not_null CHECK (is_snapshot=0 OR (is_snapshot=1 AND description IS NOT NULL));
    `);

    // Create new document draft table
    await queryRunner.query(`
      CREATE TABLE innovation_document_draft_new (
        id uniqueidentifier NOT NULL,
        version AS JSON_VALUE(document,'$.version'),
        document nvarchar(max) NOT NULL CONSTRAINT "df_innovation_document_draft_new_document" DEFAULT '{}',
        "created_at" datetime2 NOT NULL CONSTRAINT "df_innovation_document_draft_new_created_at" DEFAULT getdate(),
        "created_by" uniqueidentifier,
        "updated_at" datetime2 NOT NULL CONSTRAINT "df_innovation_document_draft_new_updated_at" DEFAULT getdate(),
        "updated_by" uniqueidentifier,
        "deleted_at" datetime2,
        CONSTRAINT "pk_innovation_document_draft_new_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_innovation_document_draft_new_document_is_json" CHECK (ISJSON(document)=1)
      );
    `);

    // Migrate document data
    [false, true].forEach(async isDraft => {
      const query = `
        WITH answers AS (
          SELECT
            innovation_document${isDraft ? '_draft' : ''}.id,
            docjson.[key] AS sub_section,
            answer_id = IIF(docjson.[key] = 'evidences', '_evidences', subsection.[key]),
            subsection.[value] AS response
          FROM
            innovation_document${isDraft ? '_draft' : ''}
            CROSS APPLY OPENJSON(document) AS docjson
            CROSS APPLY OPENJSON(docjson.[value]) AS subsection
          WHERE
            docjson.[key] <> 'version'
            AND subsection.[key] <> 'files'
            AND subsection.[value] IS NOT NULL
        ),
        ir_schema AS (
          SELECT
            *
          FROM
            (
              VALUES
              ('_evidences', 'fields-group'),
                ('name', 'text'),
                ('description', 'textarea'),
                ('officeLocation', 'radio-group'),
                ('postcode', 'text'),
                ('countryLocation', 'autocomplete-array'),
                ('hasWebsite', 'radio-group'),
                ('website', 'text'),
                ('categories', 'checkbox-array'),
                ('otherCategoryDescription', 'text'),
                ('mainCategory', 'radio-group'),
                ('areas', 'checkbox-array'),
                ('careSettings', 'checkbox-array'),
                ('otherCareSetting', 'text'),
                ('mainPurpose', 'radio-group'),
                ('supportDescription', 'textarea'),
                ('currentlyReceivingSupport', 'textarea'),
                ('involvedAACProgrammes', 'checkbox-array'),
                ('problemsTackled', 'textarea'),
                ('howInnovationWork', 'textarea'),
                ('hasProductServiceOrPrototype', 'radio-group'),
                ('benefitsOrImpact', 'checkbox-array'),
                ('impactDiseaseCondition', 'radio-group'),
                ('diseasesConditionsImpact', 'autocomplete-array'),
                ('estimatedCarbonReductionSavings', 'radio-group'),
                (
                  'estimatedCarbonReductionSavingsDescriptionA',
                  'textarea'
                ),
                (
                  'estimatedCarbonReductionSavingsDescriptionB',
                  'textarea'
                ),
                ('carbonReductionPlan', 'radio-group'),
                ('keyHealthInequalities', 'checkbox-array'),
                (
                  'completedHealthInequalitiesImpactAssessment',
                  'radio-group'
                ),
                ('hasEvidence', 'radio-group'),
                ('currentlyCollectingEvidence', 'radio-group'),
                ('summaryOngoingEvidenceGathering', 'textarea'),
                ('needsSupportAnyArea', 'checkbox-array'),
                ('hasMarketResearch', 'radio-group'),
                ('marketResearch', 'textarea'),
                ('optionBestDescribesInnovation', 'radio-group'),
                ('whatCompetitorsAlternativesExist', 'textarea'),
                ('innovationPathwayKnowledge', 'radio-group'),
                ('potentialPathway', 'textarea'),
                ('involvedUsersDesignProcess', 'radio-group'),
                ('testedWithIntendedUsers', 'radio-group'),
                ('intendedUserGroupsEngaged', 'checkbox-array'),
                ('otherIntendedUserGroupsEngaged', 'text'),
                ('userTests', 'fields-group'),
                ('hasRegulationKnowledge', 'radio-group'),
                ('standardsType', 'checkbox-array'),
                ('standardHasMet', 'connected-radio-group'),
                ('otherRegulationDescription', 'text'),
                ('hasPatents', 'radio-group'),
                ('patentNumbers', 'text'),
                ('hasOtherIntellectual', 'radio-group'),
                ('otherIntellectual', 'text'),
                ('hasRevenueModel', 'radio-group'),
                ('revenues', 'checkbox-array'),
                ('otherRevenueDescription', 'text'),
                ('payingOrganisations', 'textarea'),
                ('benefittingOrganisations', 'textarea'),
                ('hasFunding', 'radio-group'),
                ('fundingDescription', 'textarea'),
                ('hasCostKnowledge', 'radio-group'),
                ('costDescription', 'textarea'),
                ('patientsRange', 'radio-group'),
                ('eligibilityCriteria', 'textarea'),
                ('sellExpectations', 'textarea'),
                ('usageExpectations', 'textarea'),
                ('costComparison', 'radio-group'),
                ('hasDeployPlan', 'radio-group'),
                ('isDeployed', 'radio-group'),
                ('stepDeploymentPlans', 'fields-group'),
                ('commercialBasis', 'textarea'),
                ('organisationDeploymentAffect', 'textarea'),
                ('hasResourcesToScale', 'radio-group')
            ) AS [dt] ([id], [dataType])
        ),
        items AS (
          SELECT
            *
          FROM
            (
              VALUES
                ('officeLocation', 'england', 'England'),
                ('officeLocation', 'scotland', 'Scotland'),
                ('officeLocation', 'wales', 'Wales'),
                (
                  'officeLocation',
                  'northernIreland',
                  'Northern Ireland'
                ),
                (
                  'officeLocation',
                  'basedOutsideUk',
                  'Based Outside UK'
                ),
                ('countryLocation', 'afghanistan', 'Afghanistan'),
                ('countryLocation', 'albania', 'Albania'),
                ('countryLocation', 'algeria', 'Algeria'),
                ('countryLocation', 'andorra', 'Andorra'),
                ('countryLocation', 'angola', 'Angola'),
                (
                  'countryLocation',
                  'antiguaAndBarbuda',
                  'Antigua and Barbuda'
                ),
                ('countryLocation', 'argentina', 'Argentina'),
                ('countryLocation', 'armenia', 'Armenia'),
                ('countryLocation', 'australia', 'Australia'),
                ('countryLocation', 'austria', 'Austria'),
                ('countryLocation', 'azerbaijan', 'Azerbaijan'),
                ('countryLocation', 'bahamas', 'Bahamas'),
                ('countryLocation', 'bahrain', 'Bahrain'),
                ('countryLocation', 'bangladesh', 'Bangladesh'),
                ('countryLocation', 'barbados', 'Barbados'),
                ('countryLocation', 'belarus', 'Belarus'),
                ('countryLocation', 'belgium', 'Belgium'),
                ('countryLocation', 'belize', 'Belize'),
                ('countryLocation', 'benin', 'Benin'),
                ('countryLocation', 'bhutan', 'Bhutan'),
                ('countryLocation', 'bolivia', 'Bolivia'),
                (
                  'countryLocation',
                  'bosniaAndHerzegovina',
                  'Bosnia and Herzegovina'
                ),
                ('countryLocation', 'botswana', 'Botswana'),
                ('countryLocation', 'brazil', 'Brazil'),
                ('countryLocation', 'brunei', 'Brunei'),
                ('countryLocation', 'bulgaria', 'Bulgaria'),
                ('countryLocation', 'burkinaFaso', 'Burkina Faso'),
                ('countryLocation', 'burundi', 'Burundi'),
                (
                  'countryLocation',
                  'cTeDIvoire',
                  'C�te d''Ivoire'
                ),
                ('countryLocation', 'caboVerde', 'Cabo Verde'),
                ('countryLocation', 'cambodia', 'Cambodia'),
                ('countryLocation', 'cameroon', 'Cameroon'),
                ('countryLocation', 'canada', 'Canada'),
                (
                  'countryLocation',
                  'centralAfricanRepublic',
                  'Central African Republic'
                ),
                ('countryLocation', 'chad', 'Chad'),
                ('countryLocation', 'chile', 'Chile'),
                ('countryLocation', 'china', 'China'),
                ('countryLocation', 'colombia', 'Colombia'),
                ('countryLocation', 'comoros', 'Comoros'),
                (
                  'countryLocation',
                  'congoCongoBrazzaville',
                  'Congo (Congo-Brazzaville)'
                ),
                ('countryLocation', 'costaRica', 'Costa Rica'),
                ('countryLocation', 'croatia', 'Croatia'),
                ('countryLocation', 'cuba', 'Cuba'),
                ('countryLocation', 'cyprus', 'Cyprus'),
                (
                  'countryLocation',
                  'czechiaCzechRepublic',
                  'Czechia (Czech Republic)'
                ),
                (
                  'countryLocation',
                  'democraticRepublicOfTheCongo',
                  'Democratic Republic of the Congo'
                ),
                ('countryLocation', 'denmark', 'Denmark'),
                ('countryLocation', 'djibouti', 'Djibouti'),
                ('countryLocation', 'dominica', 'Dominica'),
                (
                  'countryLocation',
                  'dominicanRepublic',
                  'Dominican Republic'
                ),
                ('countryLocation', 'ecuador', 'Ecuador'),
                ('countryLocation', 'egypt', 'Egypt'),
                ('countryLocation', 'elSalvador', 'El Salvador'),
                (
                  'countryLocation',
                  'equatorialGuinea',
                  'Equatorial Guinea'
                ),
                ('countryLocation', 'eritrea', 'Eritrea'),
                ('countryLocation', 'estonia', 'Estonia'),
                (
                  'countryLocation',
                  'eswatiniFmrSwaziland',
                  'Eswatini (fmr. "Swaziland")'
                ),
                ('countryLocation', 'ethiopia', 'Ethiopia'),
                ('countryLocation', 'fiji', 'Fiji'),
                ('countryLocation', 'finland', 'Finland'),
                ('countryLocation', 'france', 'France'),
                ('countryLocation', 'gabon', 'Gabon'),
                ('countryLocation', 'gambia', 'Gambia'),
                ('countryLocation', 'georgia', 'Georgia'),
                ('countryLocation', 'germany', 'Germany'),
                ('countryLocation', 'ghana', 'Ghana'),
                ('countryLocation', 'greece', 'Greece'),
                ('countryLocation', 'grenada', 'Grenada'),
                ('countryLocation', 'guatemala', 'Guatemala'),
                ('countryLocation', 'guinea', 'Guinea'),
                (
                  'countryLocation',
                  'guineaBissau',
                  'Guinea-Bissau'
                ),
                ('countryLocation', 'guyana', 'Guyana'),
                ('countryLocation', 'haiti', 'Haiti'),
                ('countryLocation', 'holySee', 'Holy See'),
                ('countryLocation', 'honduras', 'Honduras'),
                ('countryLocation', 'hungary', 'Hungary'),
                ('countryLocation', 'iceland', 'Iceland'),
                ('countryLocation', 'india', 'India'),
                ('countryLocation', 'indonesia', 'Indonesia'),
                ('countryLocation', 'iran', 'Iran'),
                ('countryLocation', 'iraq', 'Iraq'),
                ('countryLocation', 'ireland', 'Ireland'),
                ('countryLocation', 'israel', 'Israel'),
                ('countryLocation', 'italy', 'Italy'),
                ('countryLocation', 'jamaica', 'Jamaica'),
                ('countryLocation', 'japan', 'Japan'),
                ('countryLocation', 'jordan', 'Jordan'),
                ('countryLocation', 'kazakhstan', 'Kazakhstan'),
                ('countryLocation', 'kenya', 'Kenya'),
                ('countryLocation', 'kiribati', 'Kiribati'),
                ('countryLocation', 'kuwait', 'Kuwait'),
                ('countryLocation', 'kyrgyzstan', 'Kyrgyzstan'),
                ('countryLocation', 'laos', 'Laos'),
                ('countryLocation', 'latvia', 'Latvia'),
                ('countryLocation', 'lebanon', 'Lebanon'),
                ('countryLocation', 'lesotho', 'Lesotho'),
                ('countryLocation', 'liberia', 'Liberia'),
                ('countryLocation', 'libya', 'Libya'),
                (
                  'countryLocation',
                  'liechtenstein',
                  'Liechtenstein'
                ),
                ('countryLocation', 'lithuania', 'Lithuania'),
                ('countryLocation', 'luxembourg', 'Luxembourg'),
                ('countryLocation', 'madagascar', 'Madagascar'),
                ('countryLocation', 'malawi', 'Malawi'),
                ('countryLocation', 'malaysia', 'Malaysia'),
                ('countryLocation', 'maldives', 'Maldives'),
                ('countryLocation', 'mali', 'Mali'),
                ('countryLocation', 'malta', 'Malta'),
                (
                  'countryLocation',
                  'marshallIslands',
                  'Marshall Islands'
                ),
                ('countryLocation', 'mauritania', 'Mauritania'),
                ('countryLocation', 'mauritius', 'Mauritius'),
                ('countryLocation', 'mexico', 'Mexico'),
                ('countryLocation', 'micronesia', 'Micronesia'),
                ('countryLocation', 'moldova', 'Moldova'),
                ('countryLocation', 'monaco', 'Monaco'),
                ('countryLocation', 'mongolia', 'Mongolia'),
                ('countryLocation', 'montenegro', 'Montenegro'),
                ('countryLocation', 'morocco', 'Morocco'),
                ('countryLocation', 'mozambique', 'Mozambique'),
                (
                  'countryLocation',
                  'myanmarFormerlyBurma',
                  'Myanmar (formerly Burma)'
                ),
                ('countryLocation', 'namibia', 'Namibia'),
                ('countryLocation', 'nauru', 'Nauru'),
                ('countryLocation', 'nepal', 'Nepal'),
                ('countryLocation', 'netherlands', 'Netherlands'),
                ('countryLocation', 'newZealand', 'New Zealand'),
                ('countryLocation', 'nicaragua', 'Nicaragua'),
                ('countryLocation', 'niger', 'Niger'),
                ('countryLocation', 'nigeria', 'Nigeria'),
                ('countryLocation', 'northKorea', 'North Korea'),
                (
                  'countryLocation',
                  'northMacedonia',
                  'North Macedonia'
                ),
                ('countryLocation', 'norway', 'Norway'),
                ('countryLocation', 'oman', 'Oman'),
                ('countryLocation', 'pakistan', 'Pakistan'),
                ('countryLocation', 'palau', 'Palau'),
                (
                  'countryLocation',
                  'palestineState',
                  'Palestine State'
                ),
                ('countryLocation', 'panama', 'Panama'),
                (
                  'countryLocation',
                  'papuaNewGuinea',
                  'Papua New Guinea'
                ),
                ('countryLocation', 'paraguay', 'Paraguay'),
                ('countryLocation', 'peru', 'Peru'),
                ('countryLocation', 'philippines', 'Philippines'),
                ('countryLocation', 'poland', 'Poland'),
                ('countryLocation', 'portugal', 'Portugal'),
                ('countryLocation', 'qatar', 'Qatar'),
                ('countryLocation', 'romania', 'Romania'),
                ('countryLocation', 'russia', 'Russia'),
                ('countryLocation', 'rwanda', 'Rwanda'),
                (
                  'countryLocation',
                  'saintKittsAndNevis',
                  'Saint Kitts and Nevis'
                ),
                ('countryLocation', 'saintLucia', 'Saint Lucia'),
                (
                  'countryLocation',
                  'saintVincentAndTheGrenadines',
                  'Saint Vincent and the Grenadines'
                ),
                ('countryLocation', 'samoa', 'Samoa'),
                ('countryLocation', 'sanMarino', 'San Marino'),
                (
                  'countryLocation',
                  'saoTomeAndPrincipe',
                  'Sao Tome and Principe'
                ),
                ('countryLocation', 'saudiArabia', 'Saudi Arabia'),
                ('countryLocation', 'senegal', 'Senegal'),
                ('countryLocation', 'serbia', 'Serbia'),
                ('countryLocation', 'seychelles', 'Seychelles'),
                ('countryLocation', 'sierraLeone', 'Sierra Leone'),
                ('countryLocation', 'singapore', 'Singapore'),
                ('countryLocation', 'slovakia', 'Slovakia'),
                ('countryLocation', 'slovenia', 'Slovenia'),
                (
                  'countryLocation',
                  'solomonIslands',
                  'Solomon Islands'
                ),
                ('countryLocation', 'somalia', 'Somalia'),
                ('countryLocation', 'southAfrica', 'South Africa'),
                ('countryLocation', 'southKorea', 'South Korea'),
                ('countryLocation', 'southSudan', 'South Sudan'),
                ('countryLocation', 'spain', 'Spain'),
                ('countryLocation', 'sriLanka', 'Sri Lanka'),
                ('countryLocation', 'sudan', 'Sudan'),
                ('countryLocation', 'suriname', 'Suriname'),
                ('countryLocation', 'sweden', 'Sweden'),
                ('countryLocation', 'switzerland', 'Switzerland'),
                ('countryLocation', 'syria', 'Syria'),
                ('countryLocation', 'tajikistan', 'Tajikistan'),
                ('countryLocation', 'tanzania', 'Tanzania'),
                ('countryLocation', 'thailand', 'Thailand'),
                ('countryLocation', 'timorLeste', 'Timor-Leste'),
                ('countryLocation', 'togo', 'Togo'),
                ('countryLocation', 'tonga', 'Tonga'),
                (
                  'countryLocation',
                  'trinidadAndTobago',
                  'Trinidad and Tobago'
                ),
                ('countryLocation', 'tunisia', 'Tunisia'),
                ('countryLocation', 'turkey', 'Turkey'),
                (
                  'countryLocation',
                  'turkmenistan',
                  'Turkmenistan'
                ),
                ('countryLocation', 'tuvalu', 'Tuvalu'),
                ('countryLocation', 'uganda', 'Uganda'),
                ('countryLocation', 'ukraine', 'Ukraine'),
                (
                  'countryLocation',
                  'unitedArabEmirates',
                  'United Arab Emirates'
                ),
                (
                  'countryLocation',
                  'unitedKingdom',
                  'United Kingdom'
                ),
                (
                  'countryLocation',
                  'unitedStatesOfAmerica',
                  'United States of America'
                ),
                ('countryLocation', 'uruguay', 'Uruguay'),
                ('countryLocation', 'uzbekistan', 'Uzbekistan'),
                ('countryLocation', 'vanuatu', 'Vanuatu'),
                ('countryLocation', 'venezuela', 'Venezuela'),
                ('countryLocation', 'vietnam', 'Vietnam'),
                ('countryLocation', 'yemen', 'Yemen'),
                ('countryLocation', 'zambia', 'Zambia'),
                ('countryLocation', 'zimbabwe', 'Zimbabwe'),
                ('hasWebsite', 'yes', 'YES'),
                ('hasWebsite', 'no', 'NO'),
                ('categories', 'medicalDevice', 'MEDICAL_DEVICE'),
                (
                  'categories',
                  'inVitroDiagnostic',
                  'IN_VITRO_DIAGNOSTIC'
                ),
                ('categories', 'pharmaceutical', 'PHARMACEUTICAL'),
                ('categories', 'digital', 'DIGITAL'),
                ('categories', 'ai', 'AI'),
                ('categories', 'education', 'EDUCATION'),
                ('categories', 'ppe', 'PPE'),
                ('categories', 'modelsCare', 'MODELS_CARE'),
                (
                  'categories',
                  'estatesFacilities',
                  'ESTATES_FACILITIES'
                ),
                (
                  'categories',
                  'travelTransport',
                  'TRAVEL_TRANSPORT'
                ),
                ('categories', 'foodNutrition', 'FOOD_NUTRITION'),
                (
                  'categories',
                  'dataMonitoring',
                  'DATA_MONITORING'
                ),
                ('categories', 'other', 'OTHER'),
                ('areas', 'covid_19', 'COVID_19'),
                (
                  'areas',
                  'dataAnalyticsAndResearch',
                  'DATA_ANALYTICS_AND_RESEARCH'
                ),
                (
                  'areas',
                  'digitalisingSystem',
                  'DIGITALISING_SYSTEM'
                ),
                (
                  'areas',
                  'improvingSystemFlow',
                  'IMPROVING_SYSTEM_FLOW'
                ),
                (
                  'areas',
                  'independenceAndPrevention',
                  'INDEPENDENCE_AND_PREVENTION'
                ),
                (
                  'areas',
                  'operationalExcellence',
                  'OPERATIONAL_EXCELLENCE'
                ),
                (
                  'areas',
                  'patientActivationAndSelfCare',
                  'PATIENT_ACTIVATION_AND_SELF_CARE'
                ),
                ('areas', 'patientSafety', 'PATIENT_SAFETY'),
                (
                  'areas',
                  'workforceResourceOptimisation',
                  'WORKFORCE_RESOURCE_OPTIMISATION'
                ),
                (
                  'areas',
                  'netZeroGreenerInnovation',
                  'NET_ZERO_GREENER_INNOVATION'
                ),
                ('careSettings', 'academia', 'ACADEMIA'),
                (
                  'careSettings',
                  'acuteTrustsInpatient',
                  'ACUTE_TRUSTS_INPATIENT'
                ),
                (
                  'careSettings',
                  'acuteTrustsOutpatient',
                  'ACUTE_TRUSTS_OUTPATIENT'
                ),
                ('careSettings', 'ambulance', 'AMBULANCE'),
                (
                  'careSettings',
                  'careHomesCareSetting',
                  'CARE_HOMES_CARE_SETTING'
                ),
                ('careSettings', 'endLifeCare', 'END_LIFE_CARE'),
                ('careSettings', 'ics', 'ICS'),
                ('careSettings', 'industry', 'INDUSTRY'),
                (
                  'careSettings',
                  'localAuthorityEducation',
                  'LOCAL_AUTHORITY_EDUCATION'
                ),
                ('careSettings', 'mentalHealth', 'MENTAL_HEALTH'),
                ('careSettings', 'pharmacy', 'PHARMACY'),
                ('careSettings', 'primaryCare', 'PRIMARY_CARE'),
                ('careSettings', 'socialCare', 'SOCIAL_CARE'),
                (
                  'careSettings',
                  'thirdSectorOrganisations',
                  'THIRD_SECTOR_ORGANISATIONS'
                ),
                (
                  'careSettings',
                  'urgentAndEmergency',
                  'URGENT_AND_EMERGENCY'
                ),
                ('careSettings', 'other', 'OTHER'),
                (
                  'mainPurpose',
                  'preventCondition',
                  'PREVENT_CONDITION'
                ),
                (
                  'mainPurpose',
                  'predictCondition',
                  'PREDICT_CONDITION'
                ),
                (
                  'mainPurpose',
                  'diagnoseCondition',
                  'DIAGNOSE_CONDITION'
                ),
                (
                  'mainPurpose',
                  'monitorCondition',
                  'MONITOR_CONDITION'
                ),
                (
                  'mainPurpose',
                  'provideTreatment',
                  'PROVIDE_TREATMENT'
                ),
                (
                  'mainPurpose',
                  'manageCondition',
                  'MANAGE_CONDITION'
                ),
                ('mainPurpose', 'enablingCare', 'ENABLING_CARE'),
                (
                  'mainPurpose',
                  'risksClimateChange',
                  'RISKS_CLIMATE_CHANGE'
                ),
                ('involvedAACProgrammes', 'no', 'No'),
                (
                  'involvedAACProgrammes',
                  'healthInnovationNetwork',
                  'Health Innovation Network'
                ),
                (
                  'involvedAACProgrammes',
                  'artificialIntelligenceInHealthAndCareAward',
                  'Artificial Intelligence in Health and Care Award'
                ),
                (
                  'involvedAACProgrammes',
                  'clinicalEntrepreneurProgramme',
                  'Clinical Entrepreneur Programme'
                ),
                (
                  'involvedAACProgrammes',
                  'earlyAccessToMedicinesScheme',
                  'Early Access to Medicines Scheme'
                ),
                (
                  'involvedAACProgrammes',
                  'innovationForHealthcareInequalitiesProgramme',
                  'Innovation for Healthcare Inequalities Programme'
                ),
                (
                  'involvedAACProgrammes',
                  'innovationAndTechnologyPaymentProgramme',
                  'Innovation and Technology Payment Programme'
                ),
                (
                  'involvedAACProgrammes',
                  'nhsInnovationAccelerator',
                  'NHS Innovation Accelerator'
                ),
                (
                  'involvedAACProgrammes',
                  'nhsInsightsPrioritisationProgramme',
                  'NHS Insights Prioritisation Programme'
                ),
                (
                  'involvedAACProgrammes',
                  'pathwayTransformationFund',
                  'Pathway Transformation Fund'
                ),
                (
                  'involvedAACProgrammes',
                  'rapidUptakeProductsProgramme',
                  'Rapid Uptake Products Programme'
                ),
                (
                  'involvedAACProgrammes',
                  'smallBusinessResearchInitiativeForHealthcare',
                  'Small Business Research Initiative for Healthcare'
                ),
                ('involvedAACProgrammes', 'testBeds', 'Test beds'),
                ('hasProductServiceOrPrototype', 'yes', 'YES'),
                ('hasProductServiceOrPrototype', 'no', 'NO'),
                (
                  'benefitsOrImpact',
                  'reducesMortality',
                  'Reduces mortality'
                ),
                (
                  'benefitsOrImpact',
                  'reducesNeedForFurtherTreatment',
                  'Reduces need for further treatment'
                ),
                (
                  'benefitsOrImpact',
                  'reducesAdverseEvents',
                  'Reduces adverse events'
                ),
                (
                  'benefitsOrImpact',
                  'enablesEarlierOrMoreAccurateDiagnosis',
                  'Enables earlier or more accurate diagnosis'
                ),
                (
                  'benefitsOrImpact',
                  'reducesRisksSideEffectsOrComplications',
                  'Reduces risks, side effects or complications'
                ),
                (
                  'benefitsOrImpact',
                  'preventsAConditionOccurringOrExacerbating',
                  'Prevents a condition occurring or exacerbating'
                ),
                (
                  'benefitsOrImpact',
                  'avoidsATestProcedureOrUnnecessaryTreatment',
                  'Avoids a test, procedure or unnecessary treatment'
                ),
                (
                  'benefitsOrImpact',
                  'enablesATestProcedureOrTreatmentToBeDoneNonInvasively',
                  'Enables a test, procedure or treatment to be done non-invasively'
                ),
                (
                  'benefitsOrImpact',
                  'increasesSelfManagement',
                  'Increases self-management'
                ),
                (
                  'benefitsOrImpact',
                  'increasesQualityOfLife',
                  'Increases quality of life'
                ),
                (
                  'benefitsOrImpact',
                  'enablesSharedCare',
                  'Enables shared care'
                ),
                (
                  'benefitsOrImpact',
                  'alleviatesPain',
                  'Alleviates pain'
                ),
                (
                  'benefitsOrImpact',
                  'otherBenefitsForPatientsAndPeople',
                  'Other benefits for patients and people'
                ),
                (
                  'benefitsOrImpact',
                  'reducesTheLengthOfStayOrEnablesEarlierDischarge',
                  'Reduces the length of stay or enables earlier discharge'
                ),
                (
                  'benefitsOrImpact',
                  'reducesNeedForAdultOrPaediatricCriticalCare',
                  'Reduces need for adult or paediatric critical care'
                ),
                (
                  'benefitsOrImpact',
                  'reducesEmergencyAdmissions',
                  'Reduces emergency admissions'
                ),
                (
                  'benefitsOrImpact',
                  'changesDeliveryOfCareFromSecondaryCareForExampleHospitalsToPrimaryCareForExampleGpOrCommunityServices',
                  'Changes delivery of care from secondary care(for example hospitals) to primary care(for example GP or community services)'
                ),
                (
                  'benefitsOrImpact',
                  'changeInDeliveryOfCareFromInpatientToDayCase',
                  'Change in delivery of care from inpatient to day case'
                ),
                (
                  'benefitsOrImpact',
                  'increasesCompliance',
                  'Increases compliance'
                ),
                (
                  'benefitsOrImpact',
                  'improvesPatientManagementOrCoordinationOfCareOrServices',
                  'Improves patient management or coordination of care or services'
                ),
                (
                  'benefitsOrImpact',
                  'reducesReferrals',
                  'Reduces referrals'
                ),
                (
                  'benefitsOrImpact',
                  'takesLessTime',
                  'Takes less time'
                ),
                (
                  'benefitsOrImpact',
                  'usesNoStaffOrALowerGradeOfStaff',
                  'Uses no staff or a lower grade of staff'
                ),
                (
                  'benefitsOrImpact',
                  'leadsToFewerAppointments',
                  'Leads to fewer appointments'
                ),
                (
                  'benefitsOrImpact',
                  'isCostSaving',
                  'Is cost saving'
                ),
                (
                  'benefitsOrImpact',
                  'increasesEfficiency',
                  'Increases efficiency'
                ),
                (
                  'benefitsOrImpact',
                  'improvesPerformance',
                  'Improves performance'
                ),
                (
                  'benefitsOrImpact',
                  'reducesCarbonEmissionsAndSupportsTheNhsToAchieveNetZero',
                  'Reduces carbon emissions and supports the NHS to achieve net zero'
                ),
                (
                  'benefitsOrImpact',
                  'otherEnvironmentalBenefits',
                  'Other environmental benefits'
                ),
                (
                  'benefitsOrImpact',
                  'otherBenefitsForTheNhsAndSocialCare',
                  'Other benefits for the NHS and social care'
                ),
                ('impactDiseaseCondition', 'yes', 'YES'),
                ('impactDiseaseCondition', 'no', 'NO'),
                (
                  'diseasesConditionsImpact',
                  'bloodAndImmuneSystemConditions',
                  'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'bloodAndImmuneSystemConditionsAllergies',
                  'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_ALLERGIES'
                ),
                (
                  'diseasesConditionsImpact',
                  'bloodAndImmuneSystemConditionsAnaphylaxis',
                  'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_ANAPHYLAXIS'
                ),
                (
                  'diseasesConditionsImpact',
                  'bloodAndImmuneSystemConditionsBloodConditions',
                  'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_BLOOD_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'bloodAndImmuneSystemConditionsLymphoedema',
                  'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_LYMPHOEDEMA'
                ),
                (
                  'diseasesConditionsImpact',
                  'bloodAndImmuneSystemConditionsSystemicLupusErythematosus',
                  'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_SYSTEMIC_LUPUS_ERYTHEMATOSUS'
                ),
                ('diseasesConditionsImpact', 'cancer', 'CANCER'),
                (
                  'diseasesConditionsImpact',
                  'cancerBladderCancer',
                  'CANCER_BLADDER_CANCER'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerBloodAndBoneMarrowCancers',
                  'CANCER_BLOOD_AND_BONE_MARROW_CANCERS'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerBrainCancers',
                  'CANCER_BRAIN_CANCERS'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerBreastCancer',
                  'CANCER_BREAST_CANCER'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerCervicalCancer',
                  'CANCER_CERVICAL_CANCER'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerColorectalCancer',
                  'CANCER_COLORECTAL_CANCER'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerComplicationsOfCancer',
                  'CANCER_COMPLICATIONS_OF_CANCER'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerEndometrialCancers',
                  'CANCER_ENDOMETRIAL_CANCERS'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerHeadAndNeckCancers',
                  'CANCER_HEAD_AND_NECK_CANCERS'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerLiverCancers',
                  'CANCER_LIVER_CANCERS'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerLungCancer',
                  'CANCER_LUNG_CANCER'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerMetastases',
                  'CANCER_METASTASES'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerOesophagealCancer',
                  'CANCER_OESOPHAGEAL_CANCER'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerOvarianCancer',
                  'CANCER_OVARIAN_CANCER'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerPancreaticCancer',
                  'CANCER_PANCREATIC_CANCER'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerPenileAndTesticularCancer',
                  'CANCER_PENILE_AND_TESTICULAR_CANCER'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerPeritonealCancer',
                  'CANCER_PERITONEAL_CANCER'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerProstateCancer',
                  'CANCER_PROSTATE_CANCER'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerRenalCancer',
                  'CANCER_RENAL_CANCER'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerSarcoma',
                  'CANCER_SARCOMA'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerSkinCancer',
                  'CANCER_SKIN_CANCER'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerStomachCancer',
                  'CANCER_STOMACH_CANCER'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerThyroidCancer',
                  'CANCER_THYROID_CANCER'
                ),
                (
                  'diseasesConditionsImpact',
                  'cancerUpperAirwaysTractCancers',
                  'CANCER_UPPER_AIRWAYS_TRACT_CANCERS'
                ),
                (
                  'diseasesConditionsImpact',
                  'cardiovascularConditions',
                  'CARDIOVASCULAR_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'cardiovascularConditionsAcuteCoronarySyndromes',
                  'CARDIOVASCULAR_CONDITIONS_ACUTE_CORONARY_SYNDROMES'
                ),
                (
                  'diseasesConditionsImpact',
                  'cardiovascularConditionsAorticAneurysms',
                  'CARDIOVASCULAR_CONDITIONS_AORTIC_ANEURYSMS'
                ),
                (
                  'diseasesConditionsImpact',
                  'cardiovascularConditionsCranialAneurysms',
                  'CARDIOVASCULAR_CONDITIONS_CRANIAL_ANEURYSMS'
                ),
                (
                  'diseasesConditionsImpact',
                  'cardiovascularConditionsEmbolismAndThrombosis',
                  'CARDIOVASCULAR_CONDITIONS_EMBOLISM_AND_THROMBOSIS'
                ),
                (
                  'diseasesConditionsImpact',
                  'cardiovascularConditionsHeartFailure',
                  'CARDIOVASCULAR_CONDITIONS_HEART_FAILURE'
                ),
                (
                  'diseasesConditionsImpact',
                  'cardiovascularConditionsHeartRhythmConditions',
                  'CARDIOVASCULAR_CONDITIONS_HEART_RHYTHM_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'cardiovascularConditionsHypertension',
                  'CARDIOVASCULAR_CONDITIONS_HYPERTENSION'
                ),
                (
                  'diseasesConditionsImpact',
                  'cardiovascularConditionsPeripheralCirculatoryConditions',
                  'CARDIOVASCULAR_CONDITIONS_PERIPHERAL_CIRCULATORY_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'cardiovascularConditionsStableAngina',
                  'CARDIOVASCULAR_CONDITIONS_STABLE_ANGINA'
                ),
                (
                  'diseasesConditionsImpact',
                  'cardiovascularConditionsStrokeAndTransientIschaemicAttack',
                  'CARDIOVASCULAR_CONDITIONS_STROKE_AND_TRANSIENT_ISCHAEMIC_ATTACK'
                ),
                (
                  'diseasesConditionsImpact',
                  'cardiovascularConditionsStructuralHeartDefects',
                  'CARDIOVASCULAR_CONDITIONS_STRUCTURAL_HEART_DEFECTS'
                ),
                (
                  'diseasesConditionsImpact',
                  'cardiovascularConditionsVaricoseVeins',
                  'CARDIOVASCULAR_CONDITIONS_VARICOSE_VEINS'
                ),
                (
                  'diseasesConditionsImpact',
                  'chronicAndNeuropathicPain',
                  'CHRONIC_AND_NEUROPATHIC_PAIN'
                ),
                (
                  'diseasesConditionsImpact',
                  'chronicFatigueSyndrome',
                  'CHRONIC_FATIGUE_SYNDROME'
                ),
                (
                  'diseasesConditionsImpact',
                  'cysticFibrosis',
                  'CYSTIC_FIBROSIS'
                ),
                (
                  'diseasesConditionsImpact',
                  'diabetesAndOtherEndocrinalNutritionalAndMetabolicConditions',
                  'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'diabetesAndOtherEndocrinalNutritionalAndMetabolicConditionsAdrenalDysfunction',
                  'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_ADRENAL_DYSFUNCTION'
                ),
                (
                  'diseasesConditionsImpact',
                  'diabetesAndOtherEndocrinalNutritionalAndMetabolicConditionsDiabetes',
                  'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_DIABETES'
                ),
                (
                  'diseasesConditionsImpact',
                  'diabetesAndOtherEndocrinalNutritionalAndMetabolicConditionsFailureToThrive',
                  'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_FAILURE_TO_THRIVE'
                ),
                (
                  'diseasesConditionsImpact',
                  'diabetesAndOtherEndocrinalNutritionalAndMetabolicConditionsLipidDisorders',
                  'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_LIPID_DISORDERS'
                ),
                (
                  'diseasesConditionsImpact',
                  'diabetesAndOtherEndocrinalNutritionalAndMetabolicConditionsMalnutrition',
                  'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_MALNUTRITION'
                ),
                (
                  'diseasesConditionsImpact',
                  'diabetesAndOtherEndocrinalNutritionalAndMetabolicConditionsMetabolicConditions',
                  'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_METABOLIC_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'diabetesAndOtherEndocrinalNutritionalAndMetabolicConditionsObesity',
                  'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_OBESITY'
                ),
                (
                  'diseasesConditionsImpact',
                  'diabetesAndOtherEndocrinalNutritionalAndMetabolicConditionsThyroidDisorders',
                  'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_THYROID_DISORDERS'
                ),
                (
                  'diseasesConditionsImpact',
                  'digestiveTractConditions',
                  'DIGESTIVE_TRACT_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'digestiveTractConditionsCholelithiasisAndCholecystitis',
                  'DIGESTIVE_TRACT_CONDITIONS_CHOLELITHIASIS_AND_CHOLECYSTITIS'
                ),
                (
                  'diseasesConditionsImpact',
                  'digestiveTractConditionsCoeliacDisease',
                  'DIGESTIVE_TRACT_CONDITIONS_COELIAC_DISEASE'
                ),
                (
                  'diseasesConditionsImpact',
                  'digestiveTractConditionsConstipation',
                  'DIGESTIVE_TRACT_CONDITIONS_CONSTIPATION'
                ),
                (
                  'diseasesConditionsImpact',
                  'digestiveTractConditionsDiarrhoeaAndVomiting',
                  'DIGESTIVE_TRACT_CONDITIONS_DIARRHOEA_AND_VOMITING'
                ),
                (
                  'diseasesConditionsImpact',
                  'digestiveTractConditionsDiverticularDisease',
                  'DIGESTIVE_TRACT_CONDITIONS_DIVERTICULAR_DISEASE'
                ),
                (
                  'diseasesConditionsImpact',
                  'digestiveTractConditionsFaecalIncontinence',
                  'DIGESTIVE_TRACT_CONDITIONS_FAECAL_INCONTINENCE'
                ),
                (
                  'diseasesConditionsImpact',
                  'digestiveTractConditionsGastroOesophagealRefluxIncludingBarrettsOesophagus',
                  'DIGESTIVE_TRACT_CONDITIONS_GASTRO_OESOPHAGEAL_REFLUX_INCLUDING_BARRETTS_OESOPHAGUS'
                ),
                (
                  'diseasesConditionsImpact',
                  'digestiveTractConditionsGastroparesis',
                  'DIGESTIVE_TRACT_CONDITIONS_GASTROPARESIS'
                ),
                (
                  'diseasesConditionsImpact',
                  'digestiveTractConditionsHaemorrhoidsAndOtherAnalConditions',
                  'DIGESTIVE_TRACT_CONDITIONS_HAEMORRHOIDS_AND_OTHER_ANAL_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'digestiveTractConditionsHernia',
                  'DIGESTIVE_TRACT_CONDITIONS_HERNIA'
                ),
                (
                  'diseasesConditionsImpact',
                  'digestiveTractConditionsInflammatoryBowelDisease',
                  'DIGESTIVE_TRACT_CONDITIONS_INFLAMMATORY_BOWEL_DISEASE'
                ),
                (
                  'diseasesConditionsImpact',
                  'digestiveTractConditionsIrritableBowelSyndrome',
                  'DIGESTIVE_TRACT_CONDITIONS_IRRITABLE_BOWEL_SYNDROME'
                ),
                (
                  'diseasesConditionsImpact',
                  'digestiveTractConditionsLowerGastrointestinalLesions',
                  'DIGESTIVE_TRACT_CONDITIONS_LOWER_GASTROINTESTINAL_LESIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'digestiveTractConditionsPancreatitis',
                  'DIGESTIVE_TRACT_CONDITIONS_PANCREATITIS'
                ),
                (
                  'diseasesConditionsImpact',
                  'digestiveTractConditionsUpperGastrointestinalBleeding',
                  'DIGESTIVE_TRACT_CONDITIONS_UPPER_GASTROINTESTINAL_BLEEDING'
                ),
                (
                  'diseasesConditionsImpact',
                  'earNoseAndThroatConditions',
                  'EAR_NOSE_AND_THROAT_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'eyeConditions',
                  'EYE_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'fertilityPregnancyAndChildbirth',
                  'FERTILITY_PREGNANCY_AND_CHILDBIRTH'
                ),
                (
                  'diseasesConditionsImpact',
                  'fertilityPregnancyAndChildbirthContraception',
                  'FERTILITY_PREGNANCY_AND_CHILDBIRTH_CONTRACEPTION'
                ),
                (
                  'diseasesConditionsImpact',
                  'fertilityPregnancyAndChildbirthFertility',
                  'FERTILITY_PREGNANCY_AND_CHILDBIRTH_FERTILITY'
                ),
                (
                  'diseasesConditionsImpact',
                  'fertilityPregnancyAndChildbirthIntrapartumCare',
                  'FERTILITY_PREGNANCY_AND_CHILDBIRTH_INTRAPARTUM_CARE'
                ),
                (
                  'diseasesConditionsImpact',
                  'fertilityPregnancyAndChildbirthPostnatalCare',
                  'FERTILITY_PREGNANCY_AND_CHILDBIRTH_POSTNATAL_CARE'
                ),
                (
                  'diseasesConditionsImpact',
                  'fertilityPregnancyAndChildbirthPregnancy',
                  'FERTILITY_PREGNANCY_AND_CHILDBIRTH_PREGNANCY'
                ),
                (
                  'diseasesConditionsImpact',
                  'fertilityPregnancyAndChildbirthTerminationOfPregnancyServices',
                  'FERTILITY_PREGNANCY_AND_CHILDBIRTH_TERMINATION_OF_PREGNANCY_SERVICES'
                ),
                (
                  'diseasesConditionsImpact',
                  'gynaecologicalConditions',
                  'GYNAECOLOGICAL_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'gynaecologicalConditionsEndometriosisAndFibroids',
                  'GYNAECOLOGICAL_CONDITIONS_ENDOMETRIOSIS_AND_FIBROIDS'
                ),
                (
                  'diseasesConditionsImpact',
                  'gynaecologicalConditionsHeavyMenstrualBleeding',
                  'GYNAECOLOGICAL_CONDITIONS_HEAVY_MENSTRUAL_BLEEDING'
                ),
                (
                  'diseasesConditionsImpact',
                  'gynaecologicalConditionsMenopause',
                  'GYNAECOLOGICAL_CONDITIONS_MENOPAUSE'
                ),
                (
                  'diseasesConditionsImpact',
                  'gynaecologicalConditionsUterineProlapse',
                  'GYNAECOLOGICAL_CONDITIONS_UTERINE_PROLAPSE'
                ),
                (
                  'diseasesConditionsImpact',
                  'gynaecologicalConditionsVaginalConditions',
                  'GYNAECOLOGICAL_CONDITIONS_VAGINAL_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'infections',
                  'INFECTIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'infectionsAntimicrobialStewardship',
                  'INFECTIONS_ANTIMICROBIAL_STEWARDSHIP'
                ),
                (
                  'diseasesConditionsImpact',
                  'infectionsBitesAndStings',
                  'INFECTIONS_BITES_AND_STINGS'
                ),
                (
                  'diseasesConditionsImpact',
                  'infectionsCovid_19',
                  'INFECTIONS_COVID_19'
                ),
                (
                  'diseasesConditionsImpact',
                  'infectionsFeverishIllness',
                  'INFECTIONS_FEVERISH_ILLNESS'
                ),
                (
                  'diseasesConditionsImpact',
                  'infectionsHealthcareAssociatedInfections',
                  'INFECTIONS_HEALTHCARE_ASSOCIATED_INFECTIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'infectionsHivAndAids',
                  'INFECTIONS_HIV_AND_AIDS'
                ),
                (
                  'diseasesConditionsImpact',
                  'infectionsInfluenza',
                  'INFECTIONS_INFLUENZA'
                ),
                (
                  'diseasesConditionsImpact',
                  'infectionsMeningitisAndMeningococcalSepticaemia',
                  'INFECTIONS_MENINGITIS_AND_MENINGOCOCCAL_SEPTICAEMIA'
                ),
                (
                  'diseasesConditionsImpact',
                  'infectionsSepsis',
                  'INFECTIONS_SEPSIS'
                ),
                (
                  'diseasesConditionsImpact',
                  'infectionsSkinInfections',
                  'INFECTIONS_SKIN_INFECTIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'infectionsTuberculosis',
                  'INFECTIONS_TUBERCULOSIS'
                ),
                (
                  'diseasesConditionsImpact',
                  'injuriesAccidentsAndWounds',
                  'INJURIES_ACCIDENTS_AND_WOUNDS'
                ),
                (
                  'diseasesConditionsImpact',
                  'kidneyConditions',
                  'KIDNEY_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'kidneyConditionsAcuteKidneyInjury',
                  'KIDNEY_CONDITIONS_ACUTE_KIDNEY_INJURY'
                ),
                (
                  'diseasesConditionsImpact',
                  'kidneyConditionsChronicKidneyDisease',
                  'KIDNEY_CONDITIONS_CHRONIC_KIDNEY_DISEASE'
                ),
                (
                  'diseasesConditionsImpact',
                  'kidneyConditionsRenalStones',
                  'KIDNEY_CONDITIONS_RENAL_STONES'
                ),
                (
                  'diseasesConditionsImpact',
                  'liverConditions',
                  'LIVER_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'liverConditionsChronicLiverDisease',
                  'LIVER_CONDITIONS_CHRONIC_LIVER_DISEASE'
                ),
                (
                  'diseasesConditionsImpact',
                  'liverConditionsHepatitis',
                  'LIVER_CONDITIONS_HEPATITIS'
                ),
                (
                  'diseasesConditionsImpact',
                  'mentalHealthAndBehaviouralConditions',
                  'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'mentalHealthAndBehaviouralConditionsAddiction',
                  'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_ADDICTION'
                ),
                (
                  'diseasesConditionsImpact',
                  'mentalHealthAndBehaviouralConditionsAlcoholUseDisorders',
                  'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_ALCOHOL_USE_DISORDERS'
                ),
                (
                  'diseasesConditionsImpact',
                  'mentalHealthAndBehaviouralConditionsAnxiety',
                  'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_ANXIETY'
                ),
                (
                  'diseasesConditionsImpact',
                  'mentalHealthAndBehaviouralConditionsAttentionDeficitDisorder',
                  'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_ATTENTION_DEFICIT_DISORDER'
                ),
                (
                  'diseasesConditionsImpact',
                  'mentalHealthAndBehaviouralConditionsAutism',
                  'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_AUTISM'
                ),
                (
                  'diseasesConditionsImpact',
                  'mentalHealthAndBehaviouralConditionsBipolarDisorder',
                  'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_BIPOLAR_DISORDER'
                ),
                (
                  'diseasesConditionsImpact',
                  'mentalHealthAndBehaviouralConditionsDelirium',
                  'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_DELIRIUM'
                ),
                (
                  'diseasesConditionsImpact',
                  'mentalHealthAndBehaviouralConditionsDementia',
                  'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_DEMENTIA'
                ),
                (
                  'diseasesConditionsImpact',
                  'mentalHealthAndBehaviouralConditionsDepression',
                  'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_DEPRESSION'
                ),
                (
                  'diseasesConditionsImpact',
                  'mentalHealthAndBehaviouralConditionsDrugMisuse',
                  'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_DRUG_MISUSE'
                ),
                (
                  'diseasesConditionsImpact',
                  'mentalHealthAndBehaviouralConditionsEatingDisorders',
                  'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_EATING_DISORDERS'
                ),
                (
                  'diseasesConditionsImpact',
                  'mentalHealthAndBehaviouralConditionsMentalHealthServices',
                  'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_MENTAL_HEALTH_SERVICES'
                ),
                (
                  'diseasesConditionsImpact',
                  'mentalHealthAndBehaviouralConditionsPersonalityDisorders',
                  'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_PERSONALITY_DISORDERS'
                ),
                (
                  'diseasesConditionsImpact',
                  'mentalHealthAndBehaviouralConditionsPsychosisAndSchizophrenia',
                  'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_PSYCHOSIS_AND_SCHIZOPHRENIA'
                ),
                (
                  'diseasesConditionsImpact',
                  'mentalHealthAndBehaviouralConditionsSelfHarm',
                  'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_SELF_HARM'
                ),
                (
                  'diseasesConditionsImpact',
                  'mentalHealthAndBehaviouralConditionsSuicidePrevention',
                  'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_SUICIDE_PREVENTION'
                ),
                (
                  'diseasesConditionsImpact',
                  'multipleLongTermConditions',
                  'MULTIPLE_LONG_TERM_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'musculoskeletalConditions',
                  'MUSCULOSKELETAL_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'musculoskeletalConditionsArthritis',
                  'MUSCULOSKELETAL_CONDITIONS_ARTHRITIS'
                ),
                (
                  'diseasesConditionsImpact',
                  'musculoskeletalConditionsFractures',
                  'MUSCULOSKELETAL_CONDITIONS_FRACTURES'
                ),
                (
                  'diseasesConditionsImpact',
                  'musculoskeletalConditionsHipConditions',
                  'MUSCULOSKELETAL_CONDITIONS_HIP_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'musculoskeletalConditionsJointReplacement',
                  'MUSCULOSKELETAL_CONDITIONS_JOINT_REPLACEMENT'
                ),
                (
                  'diseasesConditionsImpact',
                  'musculoskeletalConditionsKneeConditions',
                  'MUSCULOSKELETAL_CONDITIONS_KNEE_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'musculoskeletalConditionsLowBackPain',
                  'MUSCULOSKELETAL_CONDITIONS_LOW_BACK_PAIN'
                ),
                (
                  'diseasesConditionsImpact',
                  'musculoskeletalConditionsMaxillofacialConditions',
                  'MUSCULOSKELETAL_CONDITIONS_MAXILLOFACIAL_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'musculoskeletalConditionsOsteoporosis',
                  'MUSCULOSKELETAL_CONDITIONS_OSTEOPOROSIS'
                ),
                (
                  'diseasesConditionsImpact',
                  'musculoskeletalConditionsSpinalConditions',
                  'MUSCULOSKELETAL_CONDITIONS_SPINAL_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'neurologicalConditions',
                  'NEUROLOGICAL_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'neurologicalConditionsEpilepsy',
                  'NEUROLOGICAL_CONDITIONS_EPILEPSY'
                ),
                (
                  'diseasesConditionsImpact',
                  'neurologicalConditionsHeadaches',
                  'NEUROLOGICAL_CONDITIONS_HEADACHES'
                ),
                (
                  'diseasesConditionsImpact',
                  'neurologicalConditionsMetastaticSpinalCordCompression',
                  'NEUROLOGICAL_CONDITIONS_METASTATIC_SPINAL_CORD_COMPRESSION'
                ),
                (
                  'diseasesConditionsImpact',
                  'neurologicalConditionsMotorNeuroneDisease',
                  'NEUROLOGICAL_CONDITIONS_MOTOR_NEURONE_DISEASE'
                ),
                (
                  'diseasesConditionsImpact',
                  'neurologicalConditionsMultipleSclerosis',
                  'NEUROLOGICAL_CONDITIONS_MULTIPLE_SCLEROSIS'
                ),
                (
                  'diseasesConditionsImpact',
                  'neurologicalConditionsParkinsonsDiseaseTremorAndDystonia',
                  'NEUROLOGICAL_CONDITIONS_PARKINSONS_DISEASE_TREMOR_AND_DYSTONIA'
                ),
                (
                  'diseasesConditionsImpact',
                  'neurologicalConditionsSpasticity',
                  'NEUROLOGICAL_CONDITIONS_SPASTICITY'
                ),
                (
                  'diseasesConditionsImpact',
                  'neurologicalConditionsTransientLossOfConsciousness',
                  'NEUROLOGICAL_CONDITIONS_TRANSIENT_LOSS_OF_CONSCIOUSNESS'
                ),
                (
                  'diseasesConditionsImpact',
                  'oralAndDentalHealth',
                  'ORAL_AND_DENTAL_HEALTH'
                ),
                (
                  'diseasesConditionsImpact',
                  'respiratoryConditions',
                  'RESPIRATORY_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'respiratoryConditionsAsthma',
                  'RESPIRATORY_CONDITIONS_ASTHMA'
                ),
                (
                  'diseasesConditionsImpact',
                  'respiratoryConditionsChronicObstructivePulmonaryDisease',
                  'RESPIRATORY_CONDITIONS_CHRONIC_OBSTRUCTIVE_PULMONARY_DISEASE'
                ),
                (
                  'diseasesConditionsImpact',
                  'respiratoryConditionsCysticFibrosis',
                  'RESPIRATORY_CONDITIONS_CYSTIC_FIBROSIS'
                ),
                (
                  'diseasesConditionsImpact',
                  'respiratoryConditionsMesothelioma',
                  'RESPIRATORY_CONDITIONS_MESOTHELIOMA'
                ),
                (
                  'diseasesConditionsImpact',
                  'respiratoryConditionsPneumonia',
                  'RESPIRATORY_CONDITIONS_PNEUMONIA'
                ),
                (
                  'diseasesConditionsImpact',
                  'respiratoryConditionsPulmonaryFibrosis',
                  'RESPIRATORY_CONDITIONS_PULMONARY_FIBROSIS'
                ),
                (
                  'diseasesConditionsImpact',
                  'respiratoryConditionsRespiratoryInfections',
                  'RESPIRATORY_CONDITIONS_RESPIRATORY_INFECTIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'skinConditions',
                  'SKIN_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'skinConditionsAcne',
                  'SKIN_CONDITIONS_ACNE'
                ),
                (
                  'diseasesConditionsImpact',
                  'skinConditionsDiabeticFoot',
                  'SKIN_CONDITIONS_DIABETIC_FOOT'
                ),
                (
                  'diseasesConditionsImpact',
                  'skinConditionsEczema',
                  'SKIN_CONDITIONS_ECZEMA'
                ),
                (
                  'diseasesConditionsImpact',
                  'skinConditionsPressureUlcers',
                  'SKIN_CONDITIONS_PRESSURE_ULCERS'
                ),
                (
                  'diseasesConditionsImpact',
                  'skinConditionsPsoriasis',
                  'SKIN_CONDITIONS_PSORIASIS'
                ),
                (
                  'diseasesConditionsImpact',
                  'skinConditionsWoundManagement',
                  'SKIN_CONDITIONS_WOUND_MANAGEMENT'
                ),
                (
                  'diseasesConditionsImpact',
                  'sleepAndSleepConditions',
                  'SLEEP_AND_SLEEP_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'urologicalConditions',
                  'UROLOGICAL_CONDITIONS'
                ),
                (
                  'diseasesConditionsImpact',
                  'urologicalConditionsLowerUrinaryTractSymptoms',
                  'UROLOGICAL_CONDITIONS_LOWER_URINARY_TRACT_SYMPTOMS'
                ),
                (
                  'diseasesConditionsImpact',
                  'urologicalConditionsUrinaryIncontinence',
                  'UROLOGICAL_CONDITIONS_URINARY_INCONTINENCE'
                ),
                (
                  'diseasesConditionsImpact',
                  'urologicalConditionsUrinaryTractInfection',
                  'UROLOGICAL_CONDITIONS_URINARY_TRACT_INFECTION'
                ),
                ('estimatedCarbonReductionSavings', 'yes', 'YES'),
                (
                  'estimatedCarbonReductionSavings',
                  'notYet',
                  'NOT_YET'
                ),
                ('estimatedCarbonReductionSavings', 'no', 'NO'),
                ('carbonReductionPlan', 'yes', 'YES'),
                ('carbonReductionPlan', 'workingOn', 'WORKING_ON'),
                ('carbonReductionPlan', 'no', 'NO'),
                (
                  'keyHealthInequalities',
                  'maternity',
                  'MATERNITY'
                ),
                (
                  'keyHealthInequalities',
                  'severMentalIllness',
                  'SEVER_MENTAL_ILLNESS'
                ),
                (
                  'keyHealthInequalities',
                  'chronicRespiratoryDisease',
                  'CHRONIC_RESPIRATORY_DISEASE'
                ),
                (
                  'keyHealthInequalities',
                  'earlyCancerDiagnosis',
                  'EARLY_CANCER_DIAGNOSIS'
                ),
                (
                  'keyHealthInequalities',
                  'hypertensionCaseFinding',
                  'HYPERTENSION_CASE_FINDING'
                ),
                ('keyHealthInequalities', 'none', 'NONE'),
                (
                  'completedHealthInequalitiesImpactAssessment',
                  'yes',
                  'YES'
                ),
                (
                  'completedHealthInequalitiesImpactAssessment',
                  'no',
                  'NO'
                ),
                ('hasEvidence', 'yes', 'YES'),
                ('hasEvidence', 'notYet', 'NOT_YET'),
                ('currentlyCollectingEvidence', 'yes', 'YES'),
                ('currentlyCollectingEvidence', 'no', 'NO'),
                (
                  'needsSupportAnyArea',
                  'researchGovernance',
                  'RESEARCH_GOVERNANCE'
                ),
                (
                  'needsSupportAnyArea',
                  'dataSharing',
                  'DATA_SHARING'
                ),
                (
                  'needsSupportAnyArea',
                  'confidentialPatientData',
                  'CONFIDENTIAL_PATIENT_DATA'
                ),
                (
                  'needsSupportAnyArea',
                  'approvalDataStudies',
                  'APPROVAL_DATA_STUDIES'
                ),
                (
                  'needsSupportAnyArea',
                  'understandingLaws',
                  'UNDERSTANDING_LAWS'
                ),
                ('needsSupportAnyArea', 'separator', 'separator'),
                (
                  'needsSupportAnyArea',
                  'doNotNeedSupport',
                  'DO_NOT_NEED_SUPPORT'
                ),
                ('hasMarketResearch', 'yes', 'YES'),
                ('hasMarketResearch', 'inProgress', 'IN_PROGRESS'),
                ('hasMarketResearch', 'notYet', 'NOT_YET'),
                (
                  'optionBestDescribesInnovation',
                  'oneOffInnovation',
                  'ONE_OFF_INNOVATION'
                ),
                (
                  'optionBestDescribesInnovation',
                  'betterAlternative',
                  'BETTER_ALTERNATIVE'
                ),
                (
                  'optionBestDescribesInnovation',
                  'equivalentAlternative',
                  'EQUIVALENT_ALTERNATIVE'
                ),
                (
                  'optionBestDescribesInnovation',
                  'costEffectAlternative',
                  'COST_EFFECT_ALTERNATIVE'
                ),
                (
                  'optionBestDescribesInnovation',
                  'notSure',
                  'NOT_SURE'
                ),
                (
                  'innovationPathwayKnowledge',
                  'pathwayExistsAndChanged',
                  'PATHWAY_EXISTS_AND_CHANGED'
                ),
                (
                  'innovationPathwayKnowledge',
                  'pathwayExistsAndFits',
                  'PATHWAY_EXISTS_AND_FITS'
                ),
                (
                  'innovationPathwayKnowledge',
                  'noPathway',
                  'NO_PATHWAY'
                ),
                (
                  'innovationPathwayKnowledge',
                  'dontKnow',
                  'DONT_KNOW'
                ),
                (
                  'innovationPathwayKnowledge',
                  'notPartPathway',
                  'NOT_PART_PATHWAY'
                ),
                ('involvedUsersDesignProcess', 'yes', 'YES'),
                (
                  'involvedUsersDesignProcess',
                  'inProgress',
                  'IN_PROGRESS'
                ),
                (
                  'involvedUsersDesignProcess',
                  'notYet',
                  'NOT_YET'
                ),
                ('testedWithIntendedUsers', 'yes', 'YES'),
                (
                  'testedWithIntendedUsers',
                  'inProgress',
                  'IN_PROGRESS'
                ),
                ('testedWithIntendedUsers', 'notYet', 'NOT_YET'),
                (
                  'intendedUserGroupsEngaged',
                  'clinicalSocialCareWorkingInsideUk',
                  'CLINICAL_SOCIAL_CARE_WORKING_INSIDE_UK'
                ),
                (
                  'intendedUserGroupsEngaged',
                  'clinicalSocialCareWorkingOutsideUk',
                  'CLINICAL_SOCIAL_CARE_WORKING_OUTSIDE_UK'
                ),
                (
                  'intendedUserGroupsEngaged',
                  'nonClinicalHealthcare',
                  'NON_CLINICAL_HEALTHCARE'
                ),
                (
                  'intendedUserGroupsEngaged',
                  'patients',
                  'PATIENTS'
                ),
                (
                  'intendedUserGroupsEngaged',
                  'serviceUsers',
                  'SERVICE_USERS'
                ),
                ('intendedUserGroupsEngaged', 'carers', 'CARERS'),
                ('intendedUserGroupsEngaged', 'other', 'OTHER'),
                ('hasRegulationKnowledge', 'yesAll', 'YES_ALL'),
                ('hasRegulationKnowledge', 'yesSome', 'YES_SOME'),
                ('hasRegulationKnowledge', 'no', 'NO'),
                (
                  'hasRegulationKnowledge',
                  'notRelevant',
                  'NOT_RELEVANT'
                ),
                (
                  'standardsType',
                  'ceUkcaNonMedical',
                  'CE_UKCA_NON_MEDICAL'
                ),
                (
                  'standardsType',
                  'ceUkcaClassI',
                  'CE_UKCA_CLASS_I'
                ),
                (
                  'standardsType',
                  'ceUkcaClassIiA',
                  'CE_UKCA_CLASS_II_A'
                ),
                (
                  'standardsType',
                  'ceUkcaClassIiB',
                  'CE_UKCA_CLASS_II_B'
                ),
                (
                  'standardsType',
                  'ceUkcaClassIii',
                  'CE_UKCA_CLASS_III'
                ),
                ('standardsType', 'ivdGeneral', 'IVD_GENERAL'),
                ('standardsType', 'ivdSelfTest', 'IVD_SELF_TEST'),
                (
                  'standardsType',
                  'ivdAnnexListA',
                  'IVD_ANNEX_LIST_A'
                ),
                (
                  'standardsType',
                  'ivdAnnexListB',
                  'IVD_ANNEX_LIST_B'
                ),
                ('standardsType', 'marketing', 'MARKETING'),
                ('standardsType', 'cqc', 'CQC'),
                ('standardsType', 'dtac', 'DTAC'),
                ('standardsType', 'other', 'OTHER'),
                ('standardHasMet', 'yes', 'YES'),
                ('standardHasMet', 'inProgress', 'IN_PROGRESS'),
                ('standardHasMet', 'notYet', 'NOT_YET'),
                (
                  'hasPatents',
                  'hasAtLeastOne',
                  'HAS_AT_LEAST_ONE'
                ),
                (
                  'hasPatents',
                  'appliedAtLeastOne',
                  'APPLIED_AT_LEAST_ONE'
                ),
                ('hasPatents', 'hasNone', 'HAS_NONE'),
                ('hasOtherIntellectual', 'yes', 'YES'),
                ('hasOtherIntellectual', 'no', 'NO'),
                ('hasRevenueModel', 'yes', 'YES'),
                ('hasRevenueModel', 'no', 'NO'),
                ('hasRevenueModel', 'dontKnow', 'DONT_KNOW'),
                ('revenues', 'advertising', 'ADVERTISING'),
                (
                  'revenues',
                  'directProductSales',
                  'DIRECT_PRODUCT_SALES'
                ),
                ('revenues', 'feeForService', 'FEE_FOR_SERVICE'),
                ('revenues', 'lease', 'LEASE'),
                (
                  'revenues',
                  'salesOfConsumablesOrAccessories',
                  'SALES_OF_CONSUMABLES_OR_ACCESSORIES'
                ),
                ('revenues', 'subscription', 'SUBSCRIPTION'),
                ('revenues', 'other', 'OTHER'),
                ('hasFunding', 'yes', 'YES'),
                ('hasFunding', 'no', 'NO'),
                ('hasFunding', 'notRelevant', 'NOT_RELEVANT'),
                (
                  'hasCostKnowledge',
                  'detailedEstimate',
                  'DETAILED_ESTIMATE'
                ),
                ('hasCostKnowledge', 'roughIdea', 'ROUGH_IDEA'),
                ('hasCostKnowledge', 'no', 'NO'),
                ('patientsRange', 'up_10000', 'UP_10000'),
                (
                  'patientsRange',
                  'between_10000_500000',
                  'BETWEEN_10000_500000'
                ),
                (
                  'patientsRange',
                  'moreThan_500000',
                  'MORE_THAN_500000'
                ),
                ('patientsRange', 'notSure', 'NOT_SURE'),
                ('patientsRange', 'notRelevant', 'NOT_RELEVANT'),
                ('costComparison', 'cheaper', 'CHEAPER'),
                (
                  'costComparison',
                  'costsMoreWithSavings',
                  'COSTS_MORE_WITH_SAVINGS'
                ),
                ('costComparison', 'costsMore', 'COSTS_MORE'),
                ('costComparison', 'notSure', 'NOT_SURE'),
                ('hasDeployPlan', 'yes', 'YES'),
                ('hasDeployPlan', 'no', 'NO'),
                ('isDeployed', 'yes', 'YES'),
                ('isDeployed', 'no', 'NO'),
                ('hasResourcesToScale', 'yes', 'YES'),
                ('hasResourcesToScale', 'no', 'NO'),
                ('hasResourcesToScale', 'notSure', 'NOT_SURE')
            ) AS [items] ([answer_id], [id], [label])
        ),
        all_answers AS (
          SELECT
            t1.*,
            answers.response
          FROM
            (
              SELECT
                innovation_document${isDraft ? '_draft' : ''}.id,
                ir_schema.id AS answer_id,
                ir_schema.dataType
              FROM
                ir_schema,
                innovation_document${isDraft ? '_draft' : ''}
            ) AS t1
            LEFT JOIN answers ON answers.id = t1.id
            AND answers.answer_id = t1.answer_id
        ),
        result AS (
          SELECT
            all_answers.id,
            all_answers.answer_id,
            response = CASE
              WHEN all_answers.answer_id = 'estimatedCarbonReductionSavingsDescriptionA' THEN (
                SELECT
                  '"' + STRING_ESCAPE(a1.response, 'json') + '"'
                FROM
                  answers as a1
                  INNER JOIN answers as a2
                  ON a1.id = a2.id
                WHERE
                  a1.id = all_answers.id
                  AND a1.answer_id = 'estimatedCarbonReductionSavingsDescription'
                  AND a2.answer_id = 'estimatedCarbonReductionSavings'
                  AND a2.response = 'YES'
              )
              WHEN all_answers.answer_id = 'estimatedCarbonReductionSavingsDescriptionB' THEN (
                SELECT
                  '"' + STRING_ESCAPE(a1.response, 'json') + '"'
                FROM
                  answers as a1
                  INNER JOIN answers as a2
                  ON a1.id = a2.id
                WHERE
                  a1.id = all_answers.id
                  AND a1.answer_id = 'estimatedCarbonReductionSavingsDescription'
                  AND a2.answer_id = 'estimatedCarbonReductionSavings'
                  AND a2.response <> 'YES'
              )
              WHEN all_answers.answer_id = 'stepDeploymentPlans' THEN (
                SELECT
                  '[' + STRING_AGG('{"organizationDepartment":"' + value + '"}', ',') + ']'
                FROM
                  answers
                  CROSS APPLY OPENJSON(answers.response)
                WHERE
                  answers.id = all_answers.id
                  AND answers.answer_id = 'deploymentPlans'
              )
              WHEN all_answers.answer_id = 'countryLocation' THEN (
                SELECT
                  '[' + STRING_AGG('"' + items.id + '"', ',') + ']'
                FROM
                  answers
                  INNER JOIN items ON items.label = answers.response
                  AND items.answer_id = all_answers.answer_id
                WHERE
                  answers.id = all_answers.id
                  AND answers.answer_id = 'countryName'
              )
              WHEN all_answers.answer_id = 'standardsType' THEN (
                SELECT
                  '[' + STRING_AGG('{"standardHasMet":"' + i2.id + '", "standardsType":"' + i1.id + '"}', ',') + ']'
                FROM
                  answers
                  CROSS APPLY OPENJSON(answers.response) WITH ([type] nvarchar(50) '$.type', [hasMet] nvarchar(50) '$.hasMet')
                  INNER JOIN items AS i1 ON i1.label = [type]
                  AND i1.answer_id = 'standardsType'
                  INNER JOIN items AS i2 ON i2.label = [hasMet]
                  AND i2.answer_id = 'standardHasMet'
                WHERE
                  answers.id = all_answers.id
                AND answers.answer_id = 'standards'
              )
              WHEN all_answers.answer_id = 'officeLocation' THEN (
                SELECT IIF(max(items.id) IN ('england', 'scotland', 'wales', 'northernIreland'), '"' + max(items.id) + '"', '"basedOutsideUk"')
                FROM
                  answers
                  INNER JOIN items ON items.label = answers.response
                  AND (
                    items.answer_id = 'countryLocation'
                    OR items.answer_id = 'officeLocation'
                  )
                WHERE
                  answers.id = all_answers.id
                  AND answers.answer_id = 'countryName'
              )
              WHEN all_answers.answer_id = 'hasWebsite' THEN (
                SELECT IIF(COUNT(*) = 0, '"no"', '"yes"')
                FROM answers
                WHERE answers.id = all_answers.id
                AND answers.answer_id = 'website'
              )
              WHEN all_answers.answer_id = 'mainCategory' THEN (
                SELECT '"' + MAX(items.id) + '"'
                FROM items
                WHERE
                  items.label = all_answers.response
                  AND items.answer_id = 'categories'
              )
              WHEN all_answers.dataType = 'textarea' THEN '"' + STRING_ESCAPE(all_answers.response, 'json') + '"'
              WHEN all_answers.dataType = 'text' THEN '"' + STRING_ESCAPE(all_answers.response, 'json') + '"'
              WHEN all_answers.dataType = 'fields-group' THEN all_answers.response
              WHEN all_answers.dataType = 'autocomplete-array' THEN (
                SELECT
                  '[' + STRING_AGG('"' + items.id + '"', ',') + ']'
                FROM
                  OPENJSON(all_answers.response)
                  INNER JOIN items ON items.label = value
                  AND items.answer_id = all_answers.answer_id
              )
              WHEN all_answers.dataType = 'checkbox-array' THEN (
                SELECT
                  '[' + STRING_AGG('"' + items.id + '"', ',') + ']'
                FROM
                  OPENJSON(all_answers.response)
                  INNER JOIN items ON items.label = value
                  AND items.answer_id = all_answers.answer_id
              )
              WHEN all_answers.dataType = 'radio-group' THEN (
                SELECT '"' + MAX(items.id) + '"'
                FROM items
                WHERE
                  items.label = all_answers.response
                  AND items.answer_id = all_answers.answer_id
              )
              ELSE (
                SELECT
                  '[' + STRING_AGG('"' + items.id + '"', ',') + ']'
                FROM
                  OPENJSON(response)
                  INNER JOIN items ON items.label = value
                  AND items.answer_id = all_answers.answer_id
              )
            END
          FROM
            all_answers
        ),
        migrated AS (
          SELECT
            id,
            '{"version":"v0",' + STRING_AGG('"' + answer_id + '":' + response, ',') + '}' AS document
          FROM
            result
          WHERE response is not null
          GROUP BY id
        ) INSERT INTO
          innovation_document${isDraft ? '_draft' : ''}_new(id${isDraft ? '' : ', description, is_snapshot'}, created_at, created_by, updated_at, updated_by, deleted_at, document)
        SELECT
          migrated.id,
          ${isDraft ? '' : '\'Migrate to IRv3\', is_snapshot,'}
          created_at,
          created_by,
          updated_at,
          updated_by,
          deleted_at,
          migrated.document
        FROM
          innovation_document${isDraft ? '_draft' : ''}
          INNER JOIN migrated
          ON migrated.id = innovation_document${isDraft ? '_draft' : ''}.id
      `
      await queryRunner.query(query);
    });
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // deprecated
    await _queryRunner.query(`
    ALTER TABLE innovation_document_new SET ( SYSTEM_VERSIONING = OFF);
    DROP TABLE innovation_document_new;
    DROP TABLE innovation_document_new_history;
    `);
  }
}
