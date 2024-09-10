import { InnovationRecordDocumentType, requiredSectionsAndQuestions } from './document.types';

// Sections.
export const InnovationSections = [...requiredSectionsAndQuestions.keys()];
export type InnovationSections = Exclude<keyof InnovationRecordDocumentType, 'version' | 'evidences'>;

// Shared.
export const catalogYesNo = ['YES', 'NO'] as const;
export type catalogYesNo = (typeof catalogYesNo)[number];

// Section 1.
// Section 1.1.
export const catalogCategory = [
  'MEDICAL_DEVICE',
  'IN_VITRO_DIAGNOSTIC',
  'PHARMACEUTICAL',
  'DIGITAL',
  'AI',
  'EDUCATION',
  'PPE',
  'MODELS_CARE',
  'ESTATES_FACILITIES',
  'TRAVEL_TRANSPORT',
  'FOOD_NUTRITION',
  'DATA_MONITORING',
  'OTHER'
] as const;
export type catalogCategory = (typeof catalogCategory)[number];

export const catalogAreas = [
  'COVID_19',
  'DATA_ANALYTICS_AND_RESEARCH',
  'DIGITALISING_SYSTEM',
  'IMPROVING_SYSTEM_FLOW',
  'INDEPENDENCE_AND_PREVENTION',
  'OPERATIONAL_EXCELLENCE',
  'PATIENT_ACTIVATION_AND_SELF_CARE',
  'PATIENT_SAFETY',
  'WORKFORCE_RESOURCE_OPTIMISATION',
  'NET_ZERO_GREENER_INNOVATION'
] as const;
export type catalogAreas = (typeof catalogAreas)[number];

export const catalogCareSettings = [
  'ACADEMIA',
  'ACUTE_TRUSTS_INPATIENT',
  'ACUTE_TRUSTS_OUTPATIENT',
  'AMBULANCE',
  'CARE_HOMES_CARE_SETTING',
  'END_LIFE_CARE',
  'ICS',
  'INDUSTRY',
  'LOCAL_AUTHORITY_EDUCATION',
  'MENTAL_HEALTH',
  'PHARMACY',
  'PRIMARY_CARE',
  'SOCIAL_CARE',
  'THIRD_SECTOR_ORGANISATIONS',
  'URGENT_AND_EMERGENCY',
  'OTHER'
] as const;
export type catalogCareSettings = (typeof catalogCareSettings)[number];

export const catalogInvolvedAACProgrammes = [
  'No',
  'Health Innovation Network',
  'Artificial Intelligence in Health and Care Award',
  'Clinical Entrepreneur Programme',
  'Early Access to Medicines Scheme',
  'Innovation for Healthcare Inequalities Programme',
  'Innovation and Technology Payment Programme',
  'NHS Innovation Accelerator',
  'NHS Insights Prioritisation Programme',
  'Pathway Transformation Fund',
  'Rapid Uptake Products Programme',
  'Small Business Research Initiative for Healthcare',
  'Test beds'
] as const;
export type catalogInvolvedAACProgrammes = (typeof catalogInvolvedAACProgrammes)[number];

// Section 2.
// // Section 2.1.
export const catalogKeyHealthInequalities = [
  'MATERNITY',
  'SEVER_MENTAL_ILLNESS',
  'CHRONIC_RESPIRATORY_DISEASE',
  'EARLY_CANCER_DIAGNOSIS',
  'HYPERTENSION_CASE_FINDING',
  'NONE'
] as const;
export type catalogKeyHealthInequalities = (typeof catalogKeyHealthInequalities)[number];

// // Section 2.2.
export const catalogNeedsSupportAnyArea = [
  'RESEARCH_GOVERNANCE',
  'DATA_SHARING',
  'CONFIDENTIAL_PATIENT_DATA',
  'APPROVAL_DATA_STUDIES',
  'UNDERSTANDING_LAWS',
  'DO_NOT_NEED_SUPPORT'
] as const;
export type catalogNeedsSupportAnyArea = (typeof catalogNeedsSupportAnyArea)[number];

// // Section 2.2. Evidences.
export const catalogEvidenceSubmitType = [
  'CLINICAL_OR_CARE',
  'COST_IMPACT_OR_ECONOMIC',
  'OTHER_EFFECTIVENESS',
  'PRE_CLINICAL',
  'REAL_WORLD'
] as const;
export type catalogEvidenceSubmitType = (typeof catalogEvidenceSubmitType)[number];

export const catalogEvidenceType = [
  'DATA_PUBLISHED',
  'NON_RANDOMISED_COMPARATIVE_DATA',
  'NON_RANDOMISED_NON_COMPARATIVE_DATA',
  'CONFERENCE',
  'RANDOMISED_CONTROLLED_TRIAL',
  'UNPUBLISHED_DATA',
  'OTHER'
] as const;
export type catalogEvidenceType = (typeof catalogEvidenceType)[number];

// Section 5.
// // Section 5.1.
export const catalogStandardsType = [
  'CE_UKCA_NON_MEDICAL',
  'CE_UKCA_CLASS_I',
  'CE_UKCA_CLASS_II_A',
  'CE_UKCA_CLASS_II_B',
  'CE_UKCA_CLASS_III',
  'IVD_GENERAL',
  'IVD_SELF_TEST',
  'IVD_ANNEX_LIST_A',
  'IVD_ANNEX_LIST_B',
  'MARKETING',
  'CQC',
  'DTAC',
  'OTHER'
] as const;
export type catalogStandardsType = (typeof catalogStandardsType)[number];
