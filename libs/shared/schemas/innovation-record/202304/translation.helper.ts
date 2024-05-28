import Joi from 'joi';
import { DocumentValidationSchema202304Map } from './document.schema';
import type { DocumentType202304 } from './document.types';

// This will be replaced in the future this is only here in the meanwhile while the IR gets refactored
const categoriesTranslation = {
  MEDICAL_DEVICE: 'Medical device',
  IN_VITRO_DIAGNOSTIC: 'In vitro diagnostic',
  PHARMACEUTICAL: 'Pharmaceutical',
  DIGITAL: 'Digital (including apps, platforms, software)',
  AI: 'Artificial intelligence (AI)',
  EDUCATION: 'Education or training of workforce',
  PPE: 'Personal protective equipment (PPE)',
  MODELS_CARE: 'Models of care and clinical pathways',
  ESTATES_FACILITIES: 'Estates and facilities',
  TRAVEL_TRANSPORT: 'Travel and transport',
  FOOD_NUTRITION: 'Food and nutrition',
  DATA_MONITORING: 'Data and monitoring',
  OTHER: 'Other'
};

const yesNoTranslation = {
  YES: 'Yes',
  NO: 'No'
};

const yesNotYetNoTranslation = {
  YES: 'Yes',
  NOT_YET: 'Not yet',
  NO: 'No'
};

const yesNotYetTranslation = {
  YES: 'Yes',
  NOT_YET: 'Not yet'
};

const translation = {
  INNOVATION_DESCRIPTION: {
    categories: categoriesTranslation,
    mainCategory: categoriesTranslation,
    areas: {
      COVID_19: 'COVID-19',
      DATA_ANALYTICS_AND_RESEARCH: 'Data, analytics and research',
      DIGITALISING_SYSTEM: 'Digitalising the system',
      IMPROVING_SYSTEM_FLOW: 'Improving system flow',
      INDEPENDENCE_AND_PREVENTION: 'Independence and prevention',
      OPERATIONAL_EXCELLENCE: 'Operational excellence',
      PATIENT_ACTIVATION_AND_SELF_CARE: 'Patient activation and self-care',
      PATIENT_SAFETY: 'Patient safety and quality improvement',
      WORKFORCE_RESOURCE_OPTIMISATION: 'Workforce resource optimisation',
      NET_ZERO_GREENER_INNOVATION: 'Net zero NHS or greener innovation'
    },
    careSettings: {
      ACADEMIA: 'Academia',
      ACUTE_TRUSTS_INPATIENT: 'Acute trust - inpatient',
      ACUTE_TRUSTS_OUTPATIENT: 'Acute trust - outpatient',
      AMBULANCE: 'Ambulance',
      CARE_HOMES_CARE_SETTING: 'Care homes or care setting',
      END_LIFE_CARE: 'End of life care (EOLC)',
      ICS: 'ICS',
      INDUSTRY: 'Industry',
      LOCAL_AUTHORITY_EDUCATION: 'Local authority - education',
      MENTAL_HEALTH: 'Mental health',
      PHARMACY: 'Pharmacies',
      PRIMARY_CARE: 'Primary care',
      SOCIAL_CARE: 'Social care',
      THIRD_SECTOR_ORGANISATIONS: 'Third sector organisations',
      URGENT_AND_EMERGENCY: 'Urgent and emergency',
      OTHER: ''
    },
    mainPurpose: {
      PREVENT_CONDITION: 'Preventing a condition or symptom from happening or worsening',
      PREDICT_CONDITION: 'Predicting the occurence of a condition or symptom',
      DIAGNOSE_CONDITION: 'Diagnosing a condition',
      MONITOR_CONDITION: 'Monitoring a condition, treatment or therapy',
      PROVIDE_TREATMENT: 'Providing treatment or therapy',
      MANAGE_CONDITION: 'Managing a condition',
      ENABLING_CARE: 'Enabling care, services or communication',
      RISKS_CLIMATE_CHANGE:
        'Supporting the NHS to mitigate the risks or effects of climate change and severe weather conditions'
    }
    // already a string involvedAACProgrammes: {}
  },
  UNDERSTANDING_OF_NEEDS: {
    impactDiseaseCondition: yesNoTranslation,
    diseasesConditionsImpact: {
      BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS: `Blood and immune system conditions`,
      BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_ALLERGIES: `Blood and immune system conditions - Allergies`,
      BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_ANAPHYLAXIS: `Blood and immune system conditions - Anaphylaxis`,
      BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_BLOOD_CONDITIONS: `Blood and immune system conditions - Blood conditions`,
      BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_LYMPHOEDEMA: `Blood and immune system conditions - Lymphoedema`,
      BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_SYSTEMIC_LUPUS_ERYTHEMATOSUS: `Blood and immune system conditions - Systemic lupus erythematosus`,
      CANCER: `Cancer`,
      CANCER_BLADDER_CANCER: `Cancer - Bladder cancer`,
      CANCER_BLOOD_AND_BONE_MARROW_CANCERS: `Cancer - Blood and bone marrow cancers`,
      CANCER_BRAIN_CANCERS: `Cancer - Brain cancers`,
      CANCER_BREAST_CANCER: `Cancer - Breast cancer`,
      CANCER_CERVICAL_CANCER: `Cancer - Cervical cancer`,
      CANCER_COLORECTAL_CANCER: `Cancer - Colorectal cancer`,
      CANCER_COMPLICATIONS_OF_CANCER: `Cancer - Complications of cancer`,
      CANCER_ENDOMETRIAL_CANCERS: `Cancer - Endometrial cancers`,
      CANCER_HEAD_AND_NECK_CANCERS: `Cancer - Head and neck cancers`,
      CANCER_LIVER_CANCERS: `Cancer - Liver cancers`,
      CANCER_LUNG_CANCER: `Cancer - Lung cancer`,
      CANCER_METASTASES: `Cancer - Metastases`,
      CANCER_OESOPHAGEAL_CANCER: `Cancer - Oesophageal cancer`,
      CANCER_OVARIAN_CANCER: `Cancer - Ovarian cancer`,
      CANCER_PANCREATIC_CANCER: `Cancer - Pancreatic cancer`,
      CANCER_PENILE_AND_TESTICULAR_CANCER: `Cancer - Penile and testicular cancer`,
      CANCER_PERITONEAL_CANCER: `Cancer - Peritoneal cancer`,
      CANCER_PROSTATE_CANCER: `Cancer - Prostate cancer`,
      CANCER_RENAL_CANCER: `Cancer - Renal cancer`,
      CANCER_SARCOMA: `Cancer - Sarcoma`,
      CANCER_SKIN_CANCER: `Cancer - Skin cancer`,
      CANCER_STOMACH_CANCER: `Cancer - Stomach cancer`,
      CANCER_THYROID_CANCER: `Cancer - Thyroid cancer`,
      CANCER_UPPER_AIRWAYS_TRACT_CANCERS: `Cancer - Upper airways tract cancers`,
      CARDIOVASCULAR_CONDITIONS: `Cardiovascular conditions`,
      CARDIOVASCULAR_CONDITIONS_ACUTE_CORONARY_SYNDROMES: `Cardiovascular conditions - Acute coronary syndromes`,
      CARDIOVASCULAR_CONDITIONS_AORTIC_ANEURYSMS: `Cardiovascular conditions - Aortic aneurysms`,
      CARDIOVASCULAR_CONDITIONS_CRANIAL_ANEURYSMS: `Cardiovascular conditions - Cranial aneurysms`,
      CARDIOVASCULAR_CONDITIONS_EMBOLISM_AND_THROMBOSIS: `Cardiovascular conditions - Embolism and thrombosis`,
      CARDIOVASCULAR_CONDITIONS_HEART_FAILURE: `Cardiovascular conditions - Heart failure`,
      CARDIOVASCULAR_CONDITIONS_HEART_RHYTHM_CONDITIONS: `Cardiovascular conditions - Heart rhythm conditions`,
      CARDIOVASCULAR_CONDITIONS_HYPERTENSION: `Cardiovascular conditions - Hypertension`,
      CARDIOVASCULAR_CONDITIONS_PERIPHERAL_CIRCULATORY_CONDITIONS: `Cardiovascular conditions - Peripheral circulatory conditions`,
      CARDIOVASCULAR_CONDITIONS_STABLE_ANGINA: `Cardiovascular conditions - Stable angina`,
      CARDIOVASCULAR_CONDITIONS_STROKE_AND_TRANSIENT_ISCHAEMIC_ATTACK: `Cardiovascular conditions - Stroke and transient ischaemic attack`,
      CARDIOVASCULAR_CONDITIONS_STRUCTURAL_HEART_DEFECTS: `Cardiovascular conditions - Structural heart defects`,
      CARDIOVASCULAR_CONDITIONS_VARICOSE_VEINS: `Cardiovascular conditions - Varicose veins`,
      CHRONIC_AND_NEUROPATHIC_PAIN: `Chronic and neuropathic pain`,
      CHRONIC_FATIGUE_SYNDROME: `Chronic fatigue syndrome`,
      CYSTIC_FIBROSIS: `Cystic fibrosis`,
      DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS: `Diabetes and other endocrinal, nutritional and metabolic conditions`,
      DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_ADRENAL_DYSFUNCTION: `Diabetes and other endocrinal, nutritional and metabolic conditions - Adrenal dysfunction`,
      DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_DIABETES: `Diabetes and other endocrinal, nutritional and metabolic conditions - Diabetes`,
      DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_FAILURE_TO_THRIVE: `Diabetes and other endocrinal, nutritional and metabolic conditions - Failure to thrive`,
      DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_LIPID_DISORDERS: `Diabetes and other endocrinal, nutritional and metabolic conditions - Lipid disorders`,
      DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_MALNUTRITION: `Diabetes and other endocrinal, nutritional and metabolic conditions - Malnutrition`,
      DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_METABOLIC_CONDITIONS: `Diabetes and other endocrinal, nutritional and metabolic conditions - Metabolic conditions`,
      DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_OBESITY: `Diabetes and other endocrinal, nutritional and metabolic conditions - Obesity`,
      DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_THYROID_DISORDERS: `Diabetes and other endocrinal, nutritional and metabolic conditions - Thyroid disorders`,
      DIGESTIVE_TRACT_CONDITIONS: `Digestive tract conditions`,
      DIGESTIVE_TRACT_CONDITIONS_CHOLELITHIASIS_AND_CHOLECYSTITIS: `Digestive tract conditions - Cholelithiasis and cholecystitis`,
      DIGESTIVE_TRACT_CONDITIONS_COELIAC_DISEASE: `Digestive tract conditions - Coeliac disease`,
      DIGESTIVE_TRACT_CONDITIONS_CONSTIPATION: `Digestive tract conditions - Constipation`,
      DIGESTIVE_TRACT_CONDITIONS_DIARRHOEA_AND_VOMITING: `Digestive tract conditions - Diarrhoea and vomiting`,
      DIGESTIVE_TRACT_CONDITIONS_DIVERTICULAR_DISEASE: `Digestive tract conditions - Diverticular disease`,
      DIGESTIVE_TRACT_CONDITIONS_FAECAL_INCONTINENCE: `Digestive tract conditions - Faecal incontinence`,
      DIGESTIVE_TRACT_CONDITIONS_GASTRO_OESOPHAGEAL_REFLUX_INCLUDING_BARRETTS_OESOPHAGUS: `Digestive tract conditions - Gastro-oesophageal reflux, including Barrett's oesophagus`,
      DIGESTIVE_TRACT_CONDITIONS_GASTROPARESIS: `Digestive tract conditions - Gastroparesis`,
      DIGESTIVE_TRACT_CONDITIONS_HAEMORRHOIDS_AND_OTHER_ANAL_CONDITIONS: `Digestive tract conditions - Haemorrhoids and other anal conditions`,
      DIGESTIVE_TRACT_CONDITIONS_HERNIA: `Digestive tract conditions - Hernia`,
      DIGESTIVE_TRACT_CONDITIONS_INFLAMMATORY_BOWEL_DISEASE: `Digestive tract conditions - Inflammatory bowel disease`,
      DIGESTIVE_TRACT_CONDITIONS_IRRITABLE_BOWEL_SYNDROME: `Digestive tract conditions - Irritable bowel syndrome`,
      DIGESTIVE_TRACT_CONDITIONS_LOWER_GASTROINTESTINAL_LESIONS: `Digestive tract conditions - Lower gastrointestinal lesions`,
      DIGESTIVE_TRACT_CONDITIONS_PANCREATITIS: `Digestive tract conditions - Pancreatitis`,
      DIGESTIVE_TRACT_CONDITIONS_UPPER_GASTROINTESTINAL_BLEEDING: `Digestive tract conditions - Upper gastrointestinal bleeding`,
      EAR_NOSE_AND_THROAT_CONDITIONS: `Ear, nose and throat conditions`,
      EYE_CONDITIONS: `Eye conditions`,
      FERTILITY_PREGNANCY_AND_CHILDBIRTH: `Fertility, pregnancy and childbirth`,
      FERTILITY_PREGNANCY_AND_CHILDBIRTH_CONTRACEPTION: `Fertility, pregnancy and childbirth - Contraception`,
      FERTILITY_PREGNANCY_AND_CHILDBIRTH_FERTILITY: `Fertility, pregnancy and childbirth - Fertility`,
      FERTILITY_PREGNANCY_AND_CHILDBIRTH_INTRAPARTUM_CARE: `Fertility, pregnancy and childbirth - Intrapartum care`,
      FERTILITY_PREGNANCY_AND_CHILDBIRTH_POSTNATAL_CARE: `Fertility, pregnancy and childbirth - Postnatal care`,
      FERTILITY_PREGNANCY_AND_CHILDBIRTH_PREGNANCY: `Fertility, pregnancy and childbirth - Pregnancy`,
      FERTILITY_PREGNANCY_AND_CHILDBIRTH_TERMINATION_OF_PREGNANCY_SERVICES: `Fertility, pregnancy and childbirth - Termination of pregnancy services`,
      GYNAECOLOGICAL_CONDITIONS: `Gynaecological conditions`,
      GYNAECOLOGICAL_CONDITIONS_ENDOMETRIOSIS_AND_FIBROIDS: `Gynaecological conditions - Endometriosis and fibroids`,
      GYNAECOLOGICAL_CONDITIONS_HEAVY_MENSTRUAL_BLEEDING: `Gynaecological conditions - Heavy menstrual bleeding`,
      GYNAECOLOGICAL_CONDITIONS_MENOPAUSE: `Gynaecological conditions - Menopause`,
      GYNAECOLOGICAL_CONDITIONS_UTERINE_PROLAPSE: `Gynaecological conditions - Uterine prolapse`,
      GYNAECOLOGICAL_CONDITIONS_VAGINAL_CONDITIONS: `Gynaecological conditions - Vaginal conditions`,
      INFECTIONS: `Infections`,
      INFECTIONS_ANTIMICROBIAL_STEWARDSHIP: `Infections - Antimicrobial stewardship`,
      INFECTIONS_BITES_AND_STINGS: `Infections - Bites and stings`,
      INFECTIONS_COVID_19: `Infections - COVID-19`,
      INFECTIONS_FEVERISH_ILLNESS: `Infections - Feverish illness`,
      INFECTIONS_HEALTHCARE_ASSOCIATED_INFECTIONS: `Infections - Healthcare-associated infections`,
      INFECTIONS_HIV_AND_AIDS: `Infections - HIV and AIDS`,
      INFECTIONS_INFLUENZA: `Infections - Influenza`,
      INFECTIONS_MENINGITIS_AND_MENINGOCOCCAL_SEPTICAEMIA: `Infections - Meningitis and meningococcal septicaemia`,
      INFECTIONS_SEPSIS: `Infections - Sepsis`,
      INFECTIONS_SKIN_INFECTIONS: `Infections - Skin infections`,
      INFECTIONS_TUBERCULOSIS: `Infections - Tuberculosis`,
      INJURIES_ACCIDENTS_AND_WOUNDS: `Injuries, accidents and wounds`,
      KIDNEY_CONDITIONS: `Kidney conditions`,
      KIDNEY_CONDITIONS_ACUTE_KIDNEY_INJURY: `Kidney conditions - Acute kidney injury`,
      KIDNEY_CONDITIONS_CHRONIC_KIDNEY_DISEASE: `Kidney conditions - Chronic kidney disease`,
      KIDNEY_CONDITIONS_RENAL_STONES: `Kidney conditions - Renal stones`,
      LIVER_CONDITIONS: `Liver conditions`,
      LIVER_CONDITIONS_CHRONIC_LIVER_DISEASE: `Liver conditions - Chronic liver disease`,
      LIVER_CONDITIONS_HEPATITIS: `Liver conditions - Hepatitis`,
      MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS: `Mental health and behavioural conditions`,
      MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_ADDICTION: `Mental health and behavioural conditions - Addiction`,
      MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_ALCOHOL_USE_DISORDERS: `Mental health and behavioural conditions - Alcohol-use disorders`,
      MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_ANXIETY: `Mental health and behavioural conditions - Anxiety`,
      MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_ATTENTION_DEFICIT_DISORDER: `Mental health and behavioural conditions - Attention deficit disorder`,
      MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_AUTISM: `Mental health and behavioural conditions - Autism`,
      MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_BIPOLAR_DISORDER: `Mental health and behavioural conditions - Bipolar disorder`,
      MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_DELIRIUM: `Mental health and behavioural conditions - Delirium`,
      MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_DEMENTIA: `Mental health and behavioural conditions - Dementia`,
      MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_DEPRESSION: `Mental health and behavioural conditions - Depression`,
      MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_DRUG_MISUSE: `Mental health and behavioural conditions - Drug misuse`,
      MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_EATING_DISORDERS: `Mental health and behavioural conditions - Eating disorders`,
      MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_MENTAL_HEALTH_SERVICES: `Mental health and behavioural conditions - Mental health services`,
      MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_PERSONALITY_DISORDERS: `Mental health and behavioural conditions - Personality disorders`,
      MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_PSYCHOSIS_AND_SCHIZOPHRENIA: `Mental health and behavioural conditions - Psychosis and schizophrenia`,
      MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_SELF_HARM: `Mental health and behavioural conditions - Self-harm`,
      MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_SUICIDE_PREVENTION: `Mental health and behavioural conditions - Suicide prevention`,
      MULTIPLE_LONG_TERM_CONDITIONS: `Multiple long-term conditions`,
      MUSCULOSKELETAL_CONDITIONS: `Musculoskeletal conditions`,
      MUSCULOSKELETAL_CONDITIONS_ARTHRITIS: `Musculoskeletal conditions - Arthritis`,
      MUSCULOSKELETAL_CONDITIONS_FRACTURES: `Musculoskeletal conditions - Fractures`,
      MUSCULOSKELETAL_CONDITIONS_HIP_CONDITIONS: `Musculoskeletal conditions - Hip conditions`,
      MUSCULOSKELETAL_CONDITIONS_JOINT_REPLACEMENT: `Musculoskeletal conditions - Joint replacement`,
      MUSCULOSKELETAL_CONDITIONS_KNEE_CONDITIONS: `Musculoskeletal conditions - Knee conditions`,
      MUSCULOSKELETAL_CONDITIONS_LOW_BACK_PAIN: `Musculoskeletal conditions - Low back pain`,
      MUSCULOSKELETAL_CONDITIONS_MAXILLOFACIAL_CONDITIONS: `Musculoskeletal conditions - Maxillofacial conditions`,
      MUSCULOSKELETAL_CONDITIONS_OSTEOPOROSIS: `Musculoskeletal conditions - Osteoporosis`,
      MUSCULOSKELETAL_CONDITIONS_SPINAL_CONDITIONS: `Musculoskeletal conditions - Spinal conditions`,
      NEUROLOGICAL_CONDITIONS: `Neurological conditions`,
      NEUROLOGICAL_CONDITIONS_EPILEPSY: `Neurological conditions - Epilepsy`,
      NEUROLOGICAL_CONDITIONS_HEADACHES: `Neurological conditions - Headaches`,
      NEUROLOGICAL_CONDITIONS_METASTATIC_SPINAL_CORD_COMPRESSION: `Neurological conditions - Metastatic spinal cord compression`,
      NEUROLOGICAL_CONDITIONS_MOTOR_NEURONE_DISEASE: `Neurological conditions - Motor neurone disease`,
      NEUROLOGICAL_CONDITIONS_MULTIPLE_SCLEROSIS: `Neurological conditions - Multiple sclerosis`,
      NEUROLOGICAL_CONDITIONS_PARKINSONS_DISEASE_TREMOR_AND_DYSTONIA: `Neurological conditions - Parkinson's disease, tremor and dystonia`,
      NEUROLOGICAL_CONDITIONS_SPASTICITY: `Neurological conditions - Spasticity`,
      NEUROLOGICAL_CONDITIONS_TRANSIENT_LOSS_OF_CONSCIOUSNESS: `Neurological conditions - Transient loss of consciousness`,
      ORAL_AND_DENTAL_HEALTH: `Oral and dental health`,
      RESPIRATORY_CONDITIONS: `Respiratory conditions`,
      RESPIRATORY_CONDITIONS_ASTHMA: `Respiratory conditions - Asthma`,
      RESPIRATORY_CONDITIONS_CHRONIC_OBSTRUCTIVE_PULMONARY_DISEASE: `Respiratory conditions - Chronic obstructive pulmonary disease`,
      RESPIRATORY_CONDITIONS_CYSTIC_FIBROSIS: `Respiratory conditions - Cystic fibrosis`,
      RESPIRATORY_CONDITIONS_MESOTHELIOMA: `Respiratory conditions - Mesothelioma`,
      RESPIRATORY_CONDITIONS_PNEUMONIA: `Respiratory conditions - Pneumonia`,
      RESPIRATORY_CONDITIONS_PULMONARY_FIBROSIS: `Respiratory conditions - Pulmonary fibrosis`,
      RESPIRATORY_CONDITIONS_RESPIRATORY_INFECTIONS: `Respiratory conditions - Respiratory infections`,
      SKIN_CONDITIONS: `Skin conditions`,
      SKIN_CONDITIONS_ACNE: `Skin conditions - Acne`,
      SKIN_CONDITIONS_DIABETIC_FOOT: `Skin conditions - Diabetic foot`,
      SKIN_CONDITIONS_ECZEMA: `Skin conditions - Eczema`,
      SKIN_CONDITIONS_PRESSURE_ULCERS: `Skin conditions - Pressure ulcers`,
      SKIN_CONDITIONS_PSORIASIS: `Skin conditions - Psoriasis`,
      SKIN_CONDITIONS_WOUND_MANAGEMENT: `Skin conditions - Wound management`,
      SLEEP_AND_SLEEP_CONDITIONS: `Sleep and sleep conditions`,
      UROLOGICAL_CONDITIONS: `Urological conditions`,
      UROLOGICAL_CONDITIONS_LOWER_URINARY_TRACT_SYMPTOMS: `Urological conditions - Lower urinary tract symptoms`,
      UROLOGICAL_CONDITIONS_URINARY_INCONTINENCE: `Urological conditions - Urinary incontinence`,
      UROLOGICAL_CONDITIONS_URINARY_TRACT_INFECTION: `Urological conditions - Urinary tract infection`
    },
    estimatedCarbonReductionSavings: yesNotYetNoTranslation,
    carbonReductionPlan: {
      YES: 'Yes, I have one',
      WORKING_ON: 'I am working on one',
      NO: 'No, I do not have one'
    },
    keyHealthInequalities: {
      MATERNITY: 'Maternity',
      SEVER_MENTAL_ILLNESS: 'Severe mental illness',
      CHRONIC_RESPIRATORY_DISEASE: 'Chronic respiratory disease',
      EARLY_CANCER_DIAGNOSIS: 'Early cancer diagnosis',
      HYPERTENSION_CASE_FINDING: 'Hypertension case finding and optimal management and lipid optimal management',
      NONE: 'None of those listed'
    },
    completedHealthInequalitiesImpactAssessment: yesNoTranslation,
    hasProductServiceOrPrototype: yesNoTranslation
  },
  EVIDENCE_OF_EFFECTIVENESS: {
    hasEvidence: yesNotYetTranslation,
    currentlyCollectingEvidence: yesNoTranslation,
    needsSupportAnyArea: {
      RESEARCH_GOVERNANCE: 'Research governance, including research ethics approvals',
      DATA_SHARING: 'Accessing and sharing health and care data',
      CONFIDENTIAL_PATIENT_DATA: 'Use of confidential patient data',
      APPROVAL_DATA_STUDIES: 'Approval of data studies',
      UNDERSTANDING_LAWS: 'Understanding the laws that regulate the use of health and care data',
      SEPARATOR: 'SEPARATOR',
      DO_NOT_NEED_SUPPORT: 'No, I do not need support'
    }
  },
  MARKET_RESEARCH: {
    hasMarketResearch: {
      YES: 'Yes',
      IN_PROGRESS: "I'm currently doing market research",
      NOT_YET: 'Not yet'
    },
    optionBestDescribesInnovation: {
      ONE_OFF_INNOVATION: 'A one-off innovation, or the first of its kind',
      BETTER_ALTERNATIVE: 'A better alternative to those that already exist',
      EQUIVALENT_ALTERNATIVE: 'An equivalent alternative to those that already exist',
      COST_EFFECT_ALTERNATIVE: 'A more cost-effect alternative to those that already exist',
      NOT_SURE: 'I am not sure'
    }
  },
  CURRENT_CARE_PATHWAY: {
    innovationPathwayKnowledge: {
      PATHWAY_EXISTS_AND_CHANGED: 'There is a pathway, and my innovation changes it',
      PATHWAY_EXISTS_AND_FITS: 'There is a pathway, and my innovation fits in to it',
      NO_PATHWAY: 'There is no current care pathway',
      DONT_KNOW: 'I do not know',
      NOT_PART_PATHWAY: 'Does not form part of a care pathway'
    }
  },
  TESTING_WITH_USERS: {
    involvedUsersDesignProcess: {
      YES: 'Yes',
      IN_PROGRESS: 'I am in the process of involving users in the design',
      NOT_YET: 'Not yet'
    },
    testedWithIntendedUsers: {
      YES: 'Yes',
      IN_PROGRESS: 'I am in the process of testing with users',
      NOT_YET: 'Not yet'
    },
    intendedUserGroupsEngaged: {
      CLINICAL_SOCIAL_CARE_WORKING_INSIDE_UK:
        'Clinical or social care professionals working in the UK health and social care system',
      CLINICAL_SOCIAL_CARE_WORKING_OUTSIDE_UK: 'Clinical or social care professionals working outside the UK',
      NON_CLINICAL_HEALTHCARE: 'Non-clinical healthcare staff',
      PATIENTS: 'Patients',
      SERVICE_USERS: 'Service users',
      CARERS: 'Carers',
      OTHER: ''
    }
  },
  REGULATIONS_AND_STANDARDS: {
    hasRegulationKnowledge: {
      CLINICAL_SOCIAL_CARE_WORKING_INSIDE_UK:
        'Clinical or social care professionals working in the UK health and social care system',
      CLINICAL_SOCIAL_CARE_WORKING_OUTSIDE_UK: 'Clinical or social care professionals working outside the UK',
      NON_CLINICAL_HEALTHCARE: 'Non-clinical healthcare staff',
      PATIENTS: 'Patients',
      SERVICE_USERS: 'Service users',
      CARERS: 'Carers'
    },
    standards: {
      type: {
        CE_UKCA_NON_MEDICAL: 'Non-medical device',
        CE_UKCA_CLASS_I: 'Class I medical device',
        CE_UKCA_CLASS_II_A: 'Class IIa medical device',
        CE_UKCA_CLASS_II_B: 'Class IIb medical device',
        CE_UKCA_CLASS_III: 'Class III medical device',
        IVD_GENERAL: 'IVD general',
        IVD_SELF_TEST: 'IVD self-test',
        IVD_ANNEX_LIST_A: 'IVD Annex II List A',
        IVD_ANNEX_LIST_B: 'IVD Annex II List B',
        MARKETING: 'Marketing authorisation for medicines',
        CQC: 'Care Quality Commission (CQC) registration, as I am providing a regulated activity',
        DTAC: 'Digital Technology Assessment Criteria (DTAC)',
        OTHER: 'Other'
      },
      hasMet: {
        YES: 'Yes',
        IN_PROGRESS: 'I am actively working towards it',
        NOT_YET: 'Not yet'
      }
    }
  },
  INTELLECTUAL_PROPERTY: {
    hasPatents: {
      HAS_AT_LEAST_ONE: 'I have one or more patents',
      APPLIED_AT_LEAST_ONE: 'I have applied for one or more patents',
      HAS_NONE: 'I do not have any patents, but believe I have freedom to operate'
    },
    hasOtherIntellectual: yesNoTranslation
  },
  REVENUE_MODEL: {
    hasRevenueModel: {
      YES: 'Yes',
      NO: 'No',
      DONT_KNOW: 'I do not know'
    },
    revenues: {
      ADVERTISING: 'Advertising',
      DIRECT_PRODUCT_SALES: 'Direct product sales',
      FEE_FOR_SERVICE: 'Fee for service',
      LEASE: 'Lease',
      SALES_OF_CONSUMABLES_OR_ACCESSORIES: 'Sales of consumables or accessories',
      SUBSCRIPTION: 'Subscription',
      OTHER: 'Other'
    },
    hasFunding: {
      YES: 'Yes',
      NO: 'No',
      NOT_RELEVANT: 'Not relevant'
    }
  },
  COST_OF_INNOVATION: {
    hasCostKnowledge: {
      DETAILED_ESTIMATE: 'Yes, I have a detailed estimate',
      ROUGH_IDEA: 'Yes, I have a rough idea',
      NO: 'No'
    },
    patientsRange: {
      UP_10000: 'Up to 10,000 per year',
      BETWEEN_10000_500000: '10,000 to half a million per year',
      MORE_THAN_500000: 'More than half a million per year',
      NOT_SURE: 'I am not sure',
      NOT_RELEVANT: 'Not relevant to my innovation'
    },
    costComparison: {
      CHEAPER: 'My innovation is cheaper to purchase',
      COSTS_MORE_WITH_SAVINGS:
        'My innovation costs more to purchase, but has greater benefits that will lead to overall cost savings',
      COSTS_MORE:
        'My innovation costs more to purchase and has greater benefits, but will lead to higher costs overall',
      NOT_SURE: 'I am not sure'
    }
  },
  DEPLOYMENT: {
    hasDeployPlan: yesNoTranslation,
    isDeployed: yesNoTranslation,
    hasResourcesToScale: {
      YES: 'Yes',
      NO: 'No',
      NOT_SURE: 'I am not sure'
    }
  },
  evidences: {
    evidenceSubmitType: {
      CLINICAL_OR_CARE: 'Evidence of clinical or care outcomes',
      COST_IMPACT_OR_ECONOMIC: 'Evidence of cost impact, efficiency gains and/or economic modelling',
      OTHER_EFFECTIVENESS: 'Other evidence of effectiveness (for example environmental or social)',
      PRE_CLINICAL: 'Pre-clinical evidence',
      REAL_WORLD: 'Real world evidence'
    },
    evidenceType: {
      DATA_PUBLISHED: 'Data published, but not in a peer reviewed journal',
      NON_RANDOMISED_COMPARATIVE_DATA: 'Non-randomised comparative data published in a peer reviewed journal',
      NON_RANDOMISED_NON_COMPARATIVE_DATA: 'Non-randomised non-comparative data published in a peer reviewed journal',
      CONFERENCE: 'Poster or abstract presented at a conference',
      RANDOMISED_CONTROLLED_TRIAL: 'Randomised controlled trial published in a peer reviewed journal',
      UNPUBLISHED_DATA: 'Unpublished data',
      OTHER: 'Other'
    }
  }
};

export const translate = (source: any, dict: any = translation): any => {
  // if the source is an array apply translate to all entries
  if (Array.isArray(source)) {
    return source.map((v: any) => translate(v, dict));
  } else if (source && typeof source === 'object') {
    // if the source is an object apply translate to all entries (null is type object)
    const res: any = {};
    for (const [key, value] of Object.entries(source)) {
      if (key in dict) {
        res[key] = translate(value, dict[key]);
      } else {
        res[key] = value;
      }
    }
    return res;
  } else if (typeof source === 'string') {
    // if the source is a string use the dictionary value if it exists
    return dict[source] ?? source;
  } else {
    // fallback to the original value
    return source;
  }
};

export const translateValue = (fields: string[], value: string): string => {
  let dict: Record<string, any> = translation;
  for (const field of fields) {
    if (dict && typeof dict === 'object' && field in dict) {
      dict = dict[field as keyof typeof dict];
    } else {
      return value;
    }
  }
  const translated = dict && typeof dict === 'object' ? dict[value] : value;
  return typeof translated === 'string' ? translated : value;
};

// This is a naive implementation of the cleanup, not doing anything on the validation errors for now
export const cleanup = (source: Record<string, any>): DocumentType202304 => {
  const result = Joi.object(DocumentValidationSchema202304Map).validate(source, {
    abortEarly: false,
    stripUnknown: true
  });
  return result.value;
};
