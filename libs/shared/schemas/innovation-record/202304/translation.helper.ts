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
