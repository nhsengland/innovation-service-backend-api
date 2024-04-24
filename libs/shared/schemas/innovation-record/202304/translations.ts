/**
 * File that contains the translations that are on the FE.
 *
 * This is a copy from the file in src/modules/stores/innovation/innovation-record/202304/forms.config.ts
 * cleaned up to remove the unecessary info such as:
 * - Unecessary types such as conditionals, separators. (only the value and label is needed)
 * - Remove the catalogs that are 1 to 1 with the translation (e.g., Portugal -> Portugal)
 */

// TODO: still thinking in transforming this into Maps to be O(1) instead of O(n)

function transformCatalogIntoMap(key: string, catalog: { value: string; label: string }[]): Map<string, string> {
  return new Map(catalog.map(c => [`${key}::${c.value}`, c.label]));
}

// Shared.
export const yesNoItems = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' }
];

export const yesNotYetItems = [
  { value: 'YES', label: 'Yes' },
  { value: 'NOT_YET', label: 'Not yet' }
];

export const yesNotYetNoItems = [
  { value: 'YES', label: 'Yes' },
  { value: 'NOT_YET', label: 'Not yet' },
  { value: 'NO', label: 'No' }
];

// Section 1.
// Section 1.1.
export const locationItems = [
  { value: 'England', label: 'England' },
  { value: 'Scotland', label: 'Scotland' },
  { value: 'Wales', label: 'Wales' },
  { value: 'Northern Ireland', label: 'Northern Ireland' },
  { value: 'Based outside UK', label: "I'm based outside of the UK" }
];

export const categoriesItems = [
  { value: 'MEDICAL_DEVICE', label: 'Medical device' },
  { value: 'IN_VITRO_DIAGNOSTIC', label: 'In vitro diagnostic' },
  { value: 'PHARMACEUTICAL', label: 'Pharmaceutical' },
  { value: 'DIGITAL', label: 'Digital (including apps, platforms, software)' },
  { value: 'AI', label: 'Artificial intelligence (AI)' },
  { value: 'EDUCATION', label: 'Education or training of workforce' },
  { value: 'PPE', label: 'Personal protective equipment (PPE)' },
  { value: 'MODELS_CARE', label: 'Models of care and clinical pathways' },
  { value: 'ESTATES_FACILITIES', label: 'Estates and facilities' },
  { value: 'TRAVEL_TRANSPORT', label: 'Travel and transport' },
  { value: 'FOOD_NUTRITION', label: 'Food and nutrition' },
  { value: 'DATA_MONITORING', label: 'Data and monitoring' }
];

export const areasItems = [
  { value: 'COVID_19', label: 'COVID-19' },
  { value: 'DATA_ANALYTICS_AND_RESEARCH', label: 'Data, analytics and research' },
  { value: 'DIGITALISING_SYSTEM', label: 'Digitalising the system' },
  { value: 'IMPROVING_SYSTEM_FLOW', label: 'Improving system flow' },
  { value: 'INDEPENDENCE_AND_PREVENTION', label: 'Independence and prevention' },
  { value: 'OPERATIONAL_EXCELLENCE', label: 'Operational excellence' },
  { value: 'PATIENT_ACTIVATION_AND_SELF_CARE', label: 'Patient activation and self-care' },
  { value: 'PATIENT_SAFETY', label: 'Patient safety and quality improvement' },
  { value: 'WORKFORCE_RESOURCE_OPTIMISATION', label: 'Workforce resource optimisation' },
  { value: 'NET_ZERO_GREENER_INNOVATION', label: 'Net zero NHS or greener innovation' }
];

export const careSettingsItems = [
  { value: 'ACADEMIA', label: 'Academia' },
  { value: 'ACUTE_TRUSTS_INPATIENT', label: 'Acute trust - inpatient' },
  { value: 'ACUTE_TRUSTS_OUTPATIENT', label: 'Acute trust - outpatient' },
  { value: 'AMBULANCE', label: 'Ambulance' },
  { value: 'CARE_HOMES_CARE_SETTING', label: 'Care homes or care setting' },
  { value: 'END_LIFE_CARE', label: 'End of life care (EOLC)' },
  { value: 'ICS', label: 'ICS' },
  { value: 'INDUSTRY', label: 'Industry' },
  { value: 'LOCAL_AUTHORITY_EDUCATION', label: 'Local authority - education' },
  { value: 'MENTAL_HEALTH', label: 'Mental health' },
  { value: 'PHARMACY', label: 'Pharmacies' },
  { value: 'PRIMARY_CARE', label: 'Primary care' },
  { value: 'SOCIAL_CARE', label: 'Social care' },
  { value: 'THIRD_SECTOR_ORGANISATIONS', label: 'Third sector organisations' },
  { value: 'URGENT_AND_EMERGENCY', label: 'Urgent and emergency' }
];

export const mainPurposeItems = [
  { value: 'PREVENT_CONDITION', label: 'Preventing a condition or symptom from happening or worsening' },
  { value: 'PREDICT_CONDITION', label: 'Predicting the occurence of a condition or symptom' },
  { value: 'DIAGNOSE_CONDITION', label: 'Diagnosing a condition' },
  { value: 'MONITOR_CONDITION', label: 'Monitoring a condition, treatment or therapy' },
  { value: 'PROVIDE_TREATMENT', label: 'Providing treatment or therapy' },
  { value: 'MANAGE_CONDITION', label: 'Managing a condition' },
  { value: 'ENABLING_CARE', label: 'Enabling care, services or communication' },
  {
    value: 'RISKS_CLIMATE_CHANGE',
    label: 'Supporting the NHS to mitigate the risks or effects of climate change and severe weather conditions'
  }
];

// Section 2.
// // Section 2.1.
export const diseasesConditionsImpactItems = [
  { value: 'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS', label: `Blood and immune system conditions` },
  { value: 'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_ALLERGIES', label: `Blood and immune system conditions - Allergies` },
  {
    value: 'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_ANAPHYLAXIS',
    label: `Blood and immune system conditions - Anaphylaxis`
  },
  {
    value: 'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_BLOOD_CONDITIONS',
    label: `Blood and immune system conditions - Blood conditions`
  },
  {
    value: 'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_LYMPHOEDEMA',
    label: `Blood and immune system conditions - Lymphoedema`
  },
  {
    value: 'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_SYSTEMIC_LUPUS_ERYTHEMATOSUS',
    label: `Blood and immune system conditions - Systemic lupus erythematosus`
  },
  { value: 'CANCER', label: `Cancer` },
  { value: 'CANCER_BLADDER_CANCER', label: `Cancer - Bladder cancer` },
  { value: 'CANCER_BLOOD_AND_BONE_MARROW_CANCERS', label: `Cancer - Blood and bone marrow cancers` },
  { value: 'CANCER_BRAIN_CANCERS', label: `Cancer - Brain cancers` },
  { value: 'CANCER_BREAST_CANCER', label: `Cancer - Breast cancer` },
  { value: 'CANCER_CERVICAL_CANCER', label: `Cancer - Cervical cancer` },
  { value: 'CANCER_COLORECTAL_CANCER', label: `Cancer - Colorectal cancer` },
  { value: 'CANCER_COMPLICATIONS_OF_CANCER', label: `Cancer - Complications of cancer` },
  { value: 'CANCER_ENDOMETRIAL_CANCERS', label: `Cancer - Endometrial cancers` },
  { value: 'CANCER_HEAD_AND_NECK_CANCERS', label: `Cancer - Head and neck cancers` },
  { value: 'CANCER_LIVER_CANCERS', label: `Cancer - Liver cancers` },
  { value: 'CANCER_LUNG_CANCER', label: `Cancer - Lung cancer` },
  { value: 'CANCER_METASTASES', label: `Cancer - Metastases` },
  { value: 'CANCER_OESOPHAGEAL_CANCER', label: `Cancer - Oesophageal cancer` },
  { value: 'CANCER_OVARIAN_CANCER', label: `Cancer - Ovarian cancer` },
  { value: 'CANCER_PANCREATIC_CANCER', label: `Cancer - Pancreatic cancer` },
  { value: 'CANCER_PENILE_AND_TESTICULAR_CANCER', label: `Cancer - Penile and testicular cancer` },
  { value: 'CANCER_PERITONEAL_CANCER', label: `Cancer - Peritoneal cancer` },
  { value: 'CANCER_PROSTATE_CANCER', label: `Cancer - Prostate cancer` },
  { value: 'CANCER_RENAL_CANCER', label: `Cancer - Renal cancer` },
  { value: 'CANCER_SARCOMA', label: `Cancer - Sarcoma` },
  { value: 'CANCER_SKIN_CANCER', label: `Cancer - Skin cancer` },
  { value: 'CANCER_STOMACH_CANCER', label: `Cancer - Stomach cancer` },
  { value: 'CANCER_THYROID_CANCER', label: `Cancer - Thyroid cancer` },
  { value: 'CANCER_UPPER_AIRWAYS_TRACT_CANCERS', label: `Cancer - Upper airways tract cancers` },
  { value: 'CARDIOVASCULAR_CONDITIONS', label: `Cardiovascular conditions` },
  {
    value: 'CARDIOVASCULAR_CONDITIONS_ACUTE_CORONARY_SYNDROMES',
    label: `Cardiovascular conditions - Acute coronary syndromes`
  },
  { value: 'CARDIOVASCULAR_CONDITIONS_AORTIC_ANEURYSMS', label: `Cardiovascular conditions - Aortic aneurysms` },
  { value: 'CARDIOVASCULAR_CONDITIONS_CRANIAL_ANEURYSMS', label: `Cardiovascular conditions - Cranial aneurysms` },
  {
    value: 'CARDIOVASCULAR_CONDITIONS_EMBOLISM_AND_THROMBOSIS',
    label: `Cardiovascular conditions - Embolism and thrombosis`
  },
  { value: 'CARDIOVASCULAR_CONDITIONS_HEART_FAILURE', label: `Cardiovascular conditions - Heart failure` },
  {
    value: 'CARDIOVASCULAR_CONDITIONS_HEART_RHYTHM_CONDITIONS',
    label: `Cardiovascular conditions - Heart rhythm conditions`
  },
  { value: 'CARDIOVASCULAR_CONDITIONS_HYPERTENSION', label: `Cardiovascular conditions - Hypertension` },
  {
    value: 'CARDIOVASCULAR_CONDITIONS_PERIPHERAL_CIRCULATORY_CONDITIONS',
    label: `Cardiovascular conditions - Peripheral circulatory conditions`
  },
  { value: 'CARDIOVASCULAR_CONDITIONS_STABLE_ANGINA', label: `Cardiovascular conditions - Stable angina` },
  {
    value: 'CARDIOVASCULAR_CONDITIONS_STROKE_AND_TRANSIENT_ISCHAEMIC_ATTACK',
    label: `Cardiovascular conditions - Stroke and transient ischaemic attack`
  },
  {
    value: 'CARDIOVASCULAR_CONDITIONS_STRUCTURAL_HEART_DEFECTS',
    label: `Cardiovascular conditions - Structural heart defects`
  },
  { value: 'CARDIOVASCULAR_CONDITIONS_VARICOSE_VEINS', label: `Cardiovascular conditions - Varicose veins` },
  { value: 'CHRONIC_AND_NEUROPATHIC_PAIN', label: `Chronic and neuropathic pain` },
  { value: 'CHRONIC_FATIGUE_SYNDROME', label: `Chronic fatigue syndrome` },
  { value: 'CYSTIC_FIBROSIS', label: `Cystic fibrosis` },
  {
    value: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS',
    label: `Diabetes and other endocrinal, nutritional and metabolic conditions`
  },
  {
    value: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_ADRENAL_DYSFUNCTION',
    label: `Diabetes and other endocrinal, nutritional and metabolic conditions - Adrenal dysfunction`
  },
  {
    value: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_DIABETES',
    label: `Diabetes and other endocrinal, nutritional and metabolic conditions - Diabetes`
  },
  {
    value: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_FAILURE_TO_THRIVE',
    label: `Diabetes and other endocrinal, nutritional and metabolic conditions - Failure to thrive`
  },
  {
    value: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_LIPID_DISORDERS',
    label: `Diabetes and other endocrinal, nutritional and metabolic conditions - Lipid disorders`
  },
  {
    value: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_MALNUTRITION',
    label: `Diabetes and other endocrinal, nutritional and metabolic conditions - Malnutrition`
  },
  {
    value: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_METABOLIC_CONDITIONS',
    label: `Diabetes and other endocrinal, nutritional and metabolic conditions - Metabolic conditions`
  },
  {
    value: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_OBESITY',
    label: `Diabetes and other endocrinal, nutritional and metabolic conditions - Obesity`
  },
  {
    value: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_THYROID_DISORDERS',
    label: `Diabetes and other endocrinal, nutritional and metabolic conditions - Thyroid disorders`
  },
  { value: 'DIGESTIVE_TRACT_CONDITIONS', label: `Digestive tract conditions` },
  {
    value: 'DIGESTIVE_TRACT_CONDITIONS_CHOLELITHIASIS_AND_CHOLECYSTITIS',
    label: `Digestive tract conditions - Cholelithiasis and cholecystitis`
  },
  { value: 'DIGESTIVE_TRACT_CONDITIONS_COELIAC_DISEASE', label: `Digestive tract conditions - Coeliac disease` },
  { value: 'DIGESTIVE_TRACT_CONDITIONS_CONSTIPATION', label: `Digestive tract conditions - Constipation` },
  {
    value: 'DIGESTIVE_TRACT_CONDITIONS_DIARRHOEA_AND_VOMITING',
    label: `Digestive tract conditions - Diarrhoea and vomiting`
  },
  {
    value: 'DIGESTIVE_TRACT_CONDITIONS_DIVERTICULAR_DISEASE',
    label: `Digestive tract conditions - Diverticular disease`
  },
  {
    value: 'DIGESTIVE_TRACT_CONDITIONS_FAECAL_INCONTINENCE',
    label: `Digestive tract conditions - Faecal incontinence`
  },
  {
    value: 'DIGESTIVE_TRACT_CONDITIONS_GASTRO_OESOPHAGEAL_REFLUX_INCLUDING_BARRETTS_OESOPHAGUS',
    label: `Digestive tract conditions - Gastro-oesophageal reflux, including Barrett's oesophagus`
  },
  { value: 'DIGESTIVE_TRACT_CONDITIONS_GASTROPARESIS', label: `Digestive tract conditions - Gastroparesis` },
  {
    value: 'DIGESTIVE_TRACT_CONDITIONS_HAEMORRHOIDS_AND_OTHER_ANAL_CONDITIONS',
    label: `Digestive tract conditions - Haemorrhoids and other anal conditions`
  },
  { value: 'DIGESTIVE_TRACT_CONDITIONS_HERNIA', label: `Digestive tract conditions - Hernia` },
  {
    value: 'DIGESTIVE_TRACT_CONDITIONS_INFLAMMATORY_BOWEL_DISEASE',
    label: `Digestive tract conditions - Inflammatory bowel disease`
  },
  {
    value: 'DIGESTIVE_TRACT_CONDITIONS_IRRITABLE_BOWEL_SYNDROME',
    label: `Digestive tract conditions - Irritable bowel syndrome`
  },
  {
    value: 'DIGESTIVE_TRACT_CONDITIONS_LOWER_GASTROINTESTINAL_LESIONS',
    label: `Digestive tract conditions - Lower gastrointestinal lesions`
  },
  { value: 'DIGESTIVE_TRACT_CONDITIONS_PANCREATITIS', label: `Digestive tract conditions - Pancreatitis` },
  {
    value: 'DIGESTIVE_TRACT_CONDITIONS_UPPER_GASTROINTESTINAL_BLEEDING',
    label: `Digestive tract conditions - Upper gastrointestinal bleeding`
  },
  { value: 'EAR_NOSE_AND_THROAT_CONDITIONS', label: `Ear, nose and throat conditions` },
  { value: 'EYE_CONDITIONS', label: `Eye conditions` },
  { value: 'FERTILITY_PREGNANCY_AND_CHILDBIRTH', label: `Fertility, pregnancy and childbirth` },
  {
    value: 'FERTILITY_PREGNANCY_AND_CHILDBIRTH_CONTRACEPTION',
    label: `Fertility, pregnancy and childbirth - Contraception`
  },
  { value: 'FERTILITY_PREGNANCY_AND_CHILDBIRTH_FERTILITY', label: `Fertility, pregnancy and childbirth - Fertility` },
  {
    value: 'FERTILITY_PREGNANCY_AND_CHILDBIRTH_INTRAPARTUM_CARE',
    label: `Fertility, pregnancy and childbirth - Intrapartum care`
  },
  {
    value: 'FERTILITY_PREGNANCY_AND_CHILDBIRTH_POSTNATAL_CARE',
    label: `Fertility, pregnancy and childbirth - Postnatal care`
  },
  { value: 'FERTILITY_PREGNANCY_AND_CHILDBIRTH_PREGNANCY', label: `Fertility, pregnancy and childbirth - Pregnancy` },
  {
    value: 'FERTILITY_PREGNANCY_AND_CHILDBIRTH_TERMINATION_OF_PREGNANCY_SERVICES',
    label: `Fertility, pregnancy and childbirth - Termination of pregnancy services`
  },
  { value: 'GYNAECOLOGICAL_CONDITIONS', label: `Gynaecological conditions` },
  {
    value: 'GYNAECOLOGICAL_CONDITIONS_ENDOMETRIOSIS_AND_FIBROIDS',
    label: `Gynaecological conditions - Endometriosis and fibroids`
  },
  {
    value: 'GYNAECOLOGICAL_CONDITIONS_HEAVY_MENSTRUAL_BLEEDING',
    label: `Gynaecological conditions - Heavy menstrual bleeding`
  },
  { value: 'GYNAECOLOGICAL_CONDITIONS_MENOPAUSE', label: `Gynaecological conditions - Menopause` },
  { value: 'GYNAECOLOGICAL_CONDITIONS_UTERINE_PROLAPSE', label: `Gynaecological conditions - Uterine prolapse` },
  { value: 'GYNAECOLOGICAL_CONDITIONS_VAGINAL_CONDITIONS', label: `Gynaecological conditions - Vaginal conditions` },
  { value: 'INFECTIONS', label: `Infections` },
  { value: 'INFECTIONS_ANTIMICROBIAL_STEWARDSHIP', label: `Infections - Antimicrobial stewardship` },
  { value: 'INFECTIONS_BITES_AND_STINGS', label: `Infections - Bites and stings` },
  { value: 'INFECTIONS_COVID_19', label: `Infections - COVID-19` },
  { value: 'INFECTIONS_FEVERISH_ILLNESS', label: `Infections - Feverish illness` },
  { value: 'INFECTIONS_HEALTHCARE_ASSOCIATED_INFECTIONS', label: `Infections - Healthcare-associated infections` },
  { value: 'INFECTIONS_HIV_AND_AIDS', label: `Infections - HIV and AIDS` },
  { value: 'INFECTIONS_INFLUENZA', label: `Infections - Influenza` },
  {
    value: 'INFECTIONS_MENINGITIS_AND_MENINGOCOCCAL_SEPTICAEMIA',
    label: `Infections - Meningitis and meningococcal septicaemia`
  },
  { value: 'INFECTIONS_SEPSIS', label: `Infections - Sepsis` },
  { value: 'INFECTIONS_SKIN_INFECTIONS', label: `Infections - Skin infections` },
  { value: 'INFECTIONS_TUBERCULOSIS', label: `Infections - Tuberculosis` },
  { value: 'INJURIES_ACCIDENTS_AND_WOUNDS', label: `Injuries, accidents and wounds` },
  { value: 'KIDNEY_CONDITIONS', label: `Kidney conditions` },
  { value: 'KIDNEY_CONDITIONS_ACUTE_KIDNEY_INJURY', label: `Kidney conditions - Acute kidney injury` },
  { value: 'KIDNEY_CONDITIONS_CHRONIC_KIDNEY_DISEASE', label: `Kidney conditions - Chronic kidney disease` },
  { value: 'KIDNEY_CONDITIONS_RENAL_STONES', label: `Kidney conditions - Renal stones` },
  { value: 'LIVER_CONDITIONS', label: `Liver conditions` },
  { value: 'LIVER_CONDITIONS_CHRONIC_LIVER_DISEASE', label: `Liver conditions - Chronic liver disease` },
  { value: 'LIVER_CONDITIONS_HEPATITIS', label: `Liver conditions - Hepatitis` },
  { value: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS', label: `Mental health and behavioural conditions` },
  {
    value: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_ADDICTION',
    label: `Mental health and behavioural conditions - Addiction`
  },
  {
    value: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_ALCOHOL_USE_DISORDERS',
    label: `Mental health and behavioural conditions - Alcohol-use disorders`
  },
  {
    value: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_ANXIETY',
    label: `Mental health and behavioural conditions - Anxiety`
  },
  {
    value: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_ATTENTION_DEFICIT_DISORDER',
    label: `Mental health and behavioural conditions - Attention deficit disorder`
  },
  {
    value: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_AUTISM',
    label: `Mental health and behavioural conditions - Autism`
  },
  {
    value: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_BIPOLAR_DISORDER',
    label: `Mental health and behavioural conditions - Bipolar disorder`
  },
  {
    value: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_DELIRIUM',
    label: `Mental health and behavioural conditions - Delirium`
  },
  {
    value: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_DEMENTIA',
    label: `Mental health and behavioural conditions - Dementia`
  },
  {
    value: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_DEPRESSION',
    label: `Mental health and behavioural conditions - Depression`
  },
  {
    value: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_DRUG_MISUSE',
    label: `Mental health and behavioural conditions - Drug misuse`
  },
  {
    value: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_EATING_DISORDERS',
    label: `Mental health and behavioural conditions - Eating disorders`
  },
  {
    value: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_MENTAL_HEALTH_SERVICES',
    label: `Mental health and behavioural conditions - Mental health services`
  },
  {
    value: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_PERSONALITY_DISORDERS',
    label: `Mental health and behavioural conditions - Personality disorders`
  },
  {
    value: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_PSYCHOSIS_AND_SCHIZOPHRENIA',
    label: `Mental health and behavioural conditions - Psychosis and schizophrenia`
  },
  {
    value: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_SELF_HARM',
    label: `Mental health and behavioural conditions - Self-harm`
  },
  {
    value: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_SUICIDE_PREVENTION',
    label: `Mental health and behavioural conditions - Suicide prevention`
  },
  { value: 'MULTIPLE_LONG_TERM_CONDITIONS', label: `Multiple long-term conditions` },
  { value: 'MUSCULOSKELETAL_CONDITIONS', label: `Musculoskeletal conditions` },
  { value: 'MUSCULOSKELETAL_CONDITIONS_ARTHRITIS', label: `Musculoskeletal conditions - Arthritis` },
  { value: 'MUSCULOSKELETAL_CONDITIONS_FRACTURES', label: `Musculoskeletal conditions - Fractures` },
  { value: 'MUSCULOSKELETAL_CONDITIONS_HIP_CONDITIONS', label: `Musculoskeletal conditions - Hip conditions` },
  { value: 'MUSCULOSKELETAL_CONDITIONS_JOINT_REPLACEMENT', label: `Musculoskeletal conditions - Joint replacement` },
  { value: 'MUSCULOSKELETAL_CONDITIONS_KNEE_CONDITIONS', label: `Musculoskeletal conditions - Knee conditions` },
  { value: 'MUSCULOSKELETAL_CONDITIONS_LOW_BACK_PAIN', label: `Musculoskeletal conditions - Low back pain` },
  {
    value: 'MUSCULOSKELETAL_CONDITIONS_MAXILLOFACIAL_CONDITIONS',
    label: `Musculoskeletal conditions - Maxillofacial conditions`
  },
  { value: 'MUSCULOSKELETAL_CONDITIONS_OSTEOPOROSIS', label: `Musculoskeletal conditions - Osteoporosis` },
  { value: 'MUSCULOSKELETAL_CONDITIONS_SPINAL_CONDITIONS', label: `Musculoskeletal conditions - Spinal conditions` },
  { value: 'NEUROLOGICAL_CONDITIONS', label: `Neurological conditions` },
  { value: 'NEUROLOGICAL_CONDITIONS_EPILEPSY', label: `Neurological conditions - Epilepsy` },
  { value: 'NEUROLOGICAL_CONDITIONS_HEADACHES', label: `Neurological conditions - Headaches` },
  {
    value: 'NEUROLOGICAL_CONDITIONS_METASTATIC_SPINAL_CORD_COMPRESSION',
    label: `Neurological conditions - Metastatic spinal cord compression`
  },
  { value: 'NEUROLOGICAL_CONDITIONS_MOTOR_NEURONE_DISEASE', label: `Neurological conditions - Motor neurone disease` },
  { value: 'NEUROLOGICAL_CONDITIONS_MULTIPLE_SCLEROSIS', label: `Neurological conditions - Multiple sclerosis` },
  {
    value: 'NEUROLOGICAL_CONDITIONS_PARKINSONS_DISEASE_TREMOR_AND_DYSTONIA',
    label: `Neurological conditions - Parkinson's disease, tremor and dystonia`
  },
  { value: 'NEUROLOGICAL_CONDITIONS_SPASTICITY', label: `Neurological conditions - Spasticity` },
  {
    value: 'NEUROLOGICAL_CONDITIONS_TRANSIENT_LOSS_OF_CONSCIOUSNESS',
    label: `Neurological conditions - Transient loss of consciousness`
  },
  { value: 'ORAL_AND_DENTAL_HEALTH', label: `Oral and dental health` },
  { value: 'RESPIRATORY_CONDITIONS', label: `Respiratory conditions` },
  { value: 'RESPIRATORY_CONDITIONS_ASTHMA', label: `Respiratory conditions - Asthma` },
  {
    value: 'RESPIRATORY_CONDITIONS_CHRONIC_OBSTRUCTIVE_PULMONARY_DISEASE',
    label: `Respiratory conditions - Chronic obstructive pulmonary disease`
  },
  { value: 'RESPIRATORY_CONDITIONS_CYSTIC_FIBROSIS', label: `Respiratory conditions - Cystic fibrosis` },
  { value: 'RESPIRATORY_CONDITIONS_MESOTHELIOMA', label: `Respiratory conditions - Mesothelioma` },
  { value: 'RESPIRATORY_CONDITIONS_PNEUMONIA', label: `Respiratory conditions - Pneumonia` },
  { value: 'RESPIRATORY_CONDITIONS_PULMONARY_FIBROSIS', label: `Respiratory conditions - Pulmonary fibrosis` },
  { value: 'RESPIRATORY_CONDITIONS_RESPIRATORY_INFECTIONS', label: `Respiratory conditions - Respiratory infections` },
  { value: 'SKIN_CONDITIONS', label: `Skin conditions` },
  { value: 'SKIN_CONDITIONS_ACNE', label: `Skin conditions - Acne` },
  { value: 'SKIN_CONDITIONS_DIABETIC_FOOT', label: `Skin conditions - Diabetic foot` },
  { value: 'SKIN_CONDITIONS_ECZEMA', label: `Skin conditions - Eczema` },
  { value: 'SKIN_CONDITIONS_PRESSURE_ULCERS', label: `Skin conditions - Pressure ulcers` },
  { value: 'SKIN_CONDITIONS_PSORIASIS', label: `Skin conditions - Psoriasis` },
  { value: 'SKIN_CONDITIONS_WOUND_MANAGEMENT', label: `Skin conditions - Wound management` },
  { value: 'SLEEP_AND_SLEEP_CONDITIONS', label: `Sleep and sleep conditions` },
  { value: 'UROLOGICAL_CONDITIONS', label: `Urological conditions` },
  {
    value: 'UROLOGICAL_CONDITIONS_LOWER_URINARY_TRACT_SYMPTOMS',
    label: `Urological conditions - Lower urinary tract symptoms`
  },
  { value: 'UROLOGICAL_CONDITIONS_URINARY_INCONTINENCE', label: `Urological conditions - Urinary incontinence` },
  { value: 'UROLOGICAL_CONDITIONS_URINARY_TRACT_INFECTION', label: `Urological conditions - Urinary tract infection` }
];

export const estimatedCarbonReductionSavingsItems = [
  { value: 'YES', label: 'Yes' },
  { value: 'NOT_YET', label: 'Not yet, but I have an idea' }, // This one :poops: everything
  { value: 'NO', label: 'No' }
];

export const carbonReductionPlanItems = [
  { value: 'YES', label: 'Yes, I have one' },
  { value: 'WORKING_ON', label: 'I am working on one' },
  { value: 'NO', label: 'No, I do not have one' }
];

export const keyHealthInequalitiesItems = [
  { value: 'MATERNITY', label: 'Maternity' },
  { value: 'SEVER_MENTAL_ILLNESS', label: 'Severe mental illness' },
  { value: 'CHRONIC_RESPIRATORY_DISEASE', label: 'Chronic respiratory disease' },
  { value: 'EARLY_CANCER_DIAGNOSIS', label: 'Early cancer diagnosis' },
  {
    value: 'HYPERTENSION_CASE_FINDING',
    label: 'Hypertension case finding and optimal management and lipid optimal management'
  },
  { value: 'NONE', label: 'None of those listed' }
];

// // Section 2.2.
export const needsSupportAnyAreaItems = [
  { value: 'RESEARCH_GOVERNANCE', label: 'Research governance, including research ethics approvals' },
  { value: 'DATA_SHARING', label: 'Accessing and sharing health and care data' },
  { value: 'CONFIDENTIAL_PATIENT_DATA', label: 'Use of confidential patient data' },
  { value: 'APPROVAL_DATA_STUDIES', label: 'Approval of data studies' },
  { value: 'UNDERSTANDING_LAWS', label: 'Understanding the laws that regulate the use of health and care data' },
  { value: 'DO_NOT_NEED_SUPPORT', label: 'No, I do not need support' }
];

// // Section 2.2. Evidences.
export const evidenceSubmitTypeItems = [
  { value: 'CLINICAL_OR_CARE', label: 'Evidence of clinical or care outcomes' },
  { value: 'COST_IMPACT_OR_ECONOMIC', label: 'Evidence of cost impact, efficiency gains and/or economic modelling' },
  { value: 'OTHER_EFFECTIVENESS', label: 'Other evidence of effectiveness (for example environmental or social)' },
  { value: 'PRE_CLINICAL', label: 'Pre-clinical evidence' },
  { value: 'REAL_WORLD', label: 'Real world evidence' }
];

export const evidenceTypeItems = [
  { value: 'DATA_PUBLISHED', label: 'Data published, but not in a peer reviewed journal' },
  {
    value: 'NON_RANDOMISED_COMPARATIVE_DATA',
    label: 'Non-randomised comparative data published in a peer reviewed journal'
  },
  {
    value: 'NON_RANDOMISED_NON_COMPARATIVE_DATA',
    label: 'Non-randomised non-comparative data published in a peer reviewed journal'
  },
  { value: 'CONFERENCE', label: 'Poster or abstract presented at a conference' },
  { value: 'RANDOMISED_CONTROLLED_TRIAL', label: 'Randomised controlled trial published in a peer reviewed journal' },
  { value: 'UNPUBLISHED_DATA', label: 'Unpublished data' }
];

// Section 3.
// // Section 3.1.
export const hasMarketResearchItems = [
  { value: 'YES', label: 'Yes' },
  { value: 'IN_PROGRESS', label: "I'm currently doing market research" },
  { value: 'NOT_YET', label: 'Not yet' }
];

export const optionBestDescribesInnovationItems = [
  { value: 'ONE_OFF_INNOVATION', label: 'A one-off innovation, or the first of its kind' },
  { value: 'BETTER_ALTERNATIVE', label: 'A better alternative to those that already exist' },
  { value: 'EQUIVALENT_ALTERNATIVE', label: 'An equivalent alternative to those that already exist' },
  { value: 'COST_EFFECT_ALTERNATIVE', label: 'A more cost-effect alternative to those that already exist' },
  { value: 'NOT_SURE', label: 'I am not sure' }
];

// // Section 3.2.
export const innovationPathwayKnowledgeItems = [
  { value: 'PATHWAY_EXISTS_AND_CHANGED', label: 'There is a pathway, and my innovation changes it' },
  { value: 'PATHWAY_EXISTS_AND_FITS', label: 'There is a pathway, and my innovation fits in to it' },
  { value: 'NO_PATHWAY', label: 'There is no current care pathway' },
  { value: 'DONT_KNOW', label: 'I do not know' },
  { value: 'NOT_PART_PATHWAY', label: 'Does not form part of a care pathway' }
];

// Section 4.
// // Section 4.1.
export const involvedUsersDesignProcessItems = [
  { value: 'YES', label: 'Yes' },
  { value: 'IN_PROGRESS', label: 'I am in the process of involving users in the design' },
  { value: 'NOT_YET', label: 'Not yet' }
];

export const testedWithIntendedUsersItems = [
  { value: 'YES', label: 'Yes' },
  { value: 'IN_PROGRESS', label: 'I am in the process of testing with users' },
  { value: 'NOT_YET', label: 'Not yet' }
];

export const intendedUserGroupsEngagedItems = [
  {
    value: 'CLINICAL_SOCIAL_CARE_WORKING_INSIDE_UK',
    label: 'Clinical or social care professionals working in the UK health and social care system'
  },
  {
    value: 'CLINICAL_SOCIAL_CARE_WORKING_OUTSIDE_UK',
    label: 'Clinical or social care professionals working outside the UK'
  },
  { value: 'NON_CLINICAL_HEALTHCARE', label: 'Non-clinical healthcare staff' },
  { value: 'PATIENTS', label: 'Patients' },
  { value: 'SERVICE_USERS', label: 'Service users' },
  { value: 'CARERS', label: 'Carers' }
];

// Section 5.
// // Section 5.1.
export const hasRegulationKnowledgeItems = [
  { value: 'YES_ALL', label: 'Yes, I know all of them' },
  { value: 'YES_SOME', label: 'Yes, I know some of them' },
  { value: 'NO', label: 'No' },
  { value: 'NOT_RELEVANT', label: 'Not relevant' }
];
export const standardsTypeItems = [
  { value: 'CE_UKCA_NON_MEDICAL', label: 'Non-medical device', group: 'UKCA / CE' },
  { value: 'CE_UKCA_CLASS_I', label: 'Class I medical device', group: 'UKCA / CE' },
  { value: 'CE_UKCA_CLASS_II_A', label: 'Class IIa medical device', group: 'UKCA / CE' },
  { value: 'CE_UKCA_CLASS_II_B', label: 'Class IIb medical device', group: 'UKCA / CE' },
  { value: 'CE_UKCA_CLASS_III', label: 'Class III medical device', group: 'UKCA / CE' },
  { value: 'IVD_GENERAL', label: 'IVD general', group: 'In-vitro diagnostics' },
  { value: 'IVD_SELF_TEST', label: 'IVD self-test', group: 'In-vitro diagnostics' },
  { value: 'IVD_ANNEX_LIST_A', label: 'IVD Annex II List A', group: 'In-vitro diagnostics' },
  { value: 'IVD_ANNEX_LIST_B', label: 'IVD Annex II List B', group: 'In-vitro diagnostics' },
  { value: 'MARKETING', label: 'Marketing authorisation for medicines' },
  { value: 'CQC', label: 'Care Quality Commission (CQC) registration, as I am providing a regulated activity' },
  { value: 'DTAC', label: 'Digital Technology Assessment Criteria (DTAC)' }
];

export const standardsHasMetItems = [
  { value: 'YES', label: 'Yes' },
  { value: 'IN_PROGRESS', label: 'I am actively working towards it' },
  { value: 'NOT_YET', label: 'Not yet' }
];

// // Section 5.2.
export const hasPatentsItems = [
  { value: 'HAS_AT_LEAST_ONE', label: 'I have one or more patents' },
  { value: 'APPLIED_AT_LEAST_ONE', label: 'I have applied for one or more patents' },
  { value: 'HAS_NONE', label: 'I do not have any patents, but believe I have freedom to operate' }
];

// Section 6.
// // Section 6.1.
export const hasRevenueModelItems = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
  { value: 'DONT_KNOW', label: 'I do not know' }
];
export const revenuesItems = [
  { value: 'ADVERTISING', label: 'Advertising' },
  { value: 'DIRECT_PRODUCT_SALES', label: 'Direct product sales' },
  { value: 'FEE_FOR_SERVICE', label: 'Fee for service' },
  { value: 'LEASE', label: 'Lease' },
  { value: 'SALES_OF_CONSUMABLES_OR_ACCESSORIES', label: 'Sales of consumables or accessories' },
  { value: 'SUBSCRIPTION', label: 'Subscription' }
];
export const hasFundindItems = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
  { value: 'NOT_RELEVANT', label: 'Not relevant' }
];

// Section 7.
// // Section 7.1.
export const hasCostKnowledgeItems = [
  { value: 'DETAILED_ESTIMATE', label: 'Yes, I have a detailed estimate' },
  { value: 'ROUGH_IDEA', label: 'Yes, I have a rough idea' },
  { value: 'NO', label: 'No' }
];

export const patientRangeItems = [
  { value: 'UP_10000', label: 'Up to 10,000 per year' },
  { value: 'BETWEEN_10000_500000', label: '10,000 to half a million per year' },
  { value: 'MORE_THAN_500000', label: 'More than half a million per year' },
  { value: 'NOT_SURE', label: 'I am not sure' },
  { value: 'NOT_RELEVANT', label: 'Not relevant to my innovation' }
];

export const costComparisonItems = [
  { value: 'CHEAPER', label: 'My innovation is cheaper to purchase' },
  {
    value: 'COSTS_MORE_WITH_SAVINGS',
    label: 'My innovation costs more to purchase, but has greater benefits that will lead to overall cost savings'
  },
  {
    value: 'COSTS_MORE',
    label: 'My innovation costs more to purchase and has greater benefits, but will lead to higher costs overall'
  },
  { value: 'NOT_SURE', label: 'I am not sure' }
];

// Section 8.
// // Section 8.1.
export const hasResourcesToScaleItems = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
  { value: 'NOT_SURE', label: 'I am not sure' }
];

export const InnovationRecordTranslations = new Map([
  ...transformCatalogIntoMap('yesNoItems', yesNoItems),
  ...transformCatalogIntoMap('yesNotYetItems', yesNotYetItems),
  ...transformCatalogIntoMap('yesNotYetNoItems', yesNotYetNoItems),
  ...transformCatalogIntoMap('locationItems', locationItems),
  ...transformCatalogIntoMap('categoriesItems', categoriesItems),
  ...transformCatalogIntoMap('areasItems', areasItems),
  ...transformCatalogIntoMap('careSettingsItems', careSettingsItems),
  ...transformCatalogIntoMap('mainPurposeItems', mainPurposeItems),
  ...transformCatalogIntoMap('diseasesConditionsImpactItems', diseasesConditionsImpactItems),
  ...transformCatalogIntoMap('estimatedCarbonReductionSavingsItems', estimatedCarbonReductionSavingsItems),
  ...transformCatalogIntoMap('carbonReductionPlanItems', carbonReductionPlanItems),
  ...transformCatalogIntoMap('keyHealthInequalitiesItems', keyHealthInequalitiesItems),
  ...transformCatalogIntoMap('needsSupportAnyAreaItems', needsSupportAnyAreaItems),
  ...transformCatalogIntoMap('evidenceSubmitTypeItems', evidenceSubmitTypeItems),
  ...transformCatalogIntoMap('evidenceTypeItems', evidenceTypeItems),
  ...transformCatalogIntoMap('hasMarketResearchItems', hasMarketResearchItems),
  ...transformCatalogIntoMap('optionBestDescribesInnovationItems', optionBestDescribesInnovationItems),
  ...transformCatalogIntoMap('innovationPathwayKnowledgeItems', innovationPathwayKnowledgeItems),
  ...transformCatalogIntoMap('involvedUsersDesignProcessItems', involvedUsersDesignProcessItems),
  ...transformCatalogIntoMap('testedWithIntendedUsersItems', testedWithIntendedUsersItems),
  ...transformCatalogIntoMap('intendedUserGroupsEngagedItems', intendedUserGroupsEngagedItems),
  ...transformCatalogIntoMap('hasRegulationKnowledgeItems', hasRegulationKnowledgeItems),
  ...transformCatalogIntoMap('standardsTypeItems', standardsTypeItems),
  ...transformCatalogIntoMap('standardsHasMetItems', standardsHasMetItems),
  ...transformCatalogIntoMap('hasPatentsItems', hasPatentsItems),
  ...transformCatalogIntoMap('hasRevenueModelItems', hasRevenueModelItems),
  ...transformCatalogIntoMap('revenuesItems', revenuesItems),
  ...transformCatalogIntoMap('hasFundindItems', hasFundindItems),
  ...transformCatalogIntoMap('hasCostKnowledgeItems', hasCostKnowledgeItems),
  ...transformCatalogIntoMap('patientRangeItems', patientRangeItems),
  ...transformCatalogIntoMap('costComparisonItems', costComparisonItems),
  ...transformCatalogIntoMap('hasResourcesToScaleItems', hasResourcesToScaleItems)
]);

// NOTE: this was done by matching the keys in document.schema.ts with the translations in this file
export const FieldsToTranslationMatch = new Map([
  ['categories', 'categoriesItems'],
  ['mainCategory', 'categoriesItems'],
  ['areas', 'areasItems'],
  ['careSettings', 'careSettingsItems'],
  ['mainPurpose', 'mainPurposeItems'],
  ['impactDiseaseCondition', 'yesNoItems'],
  ['impactDiseaseCondition', 'diseasesConditionsImpactItems'],
  ['estimatedCarbonReductionSavings', 'estimatedCarbonReductionSavingsItems'],
  ['carbonReductionPlan', 'carbonReductionPlanItems'],
  ['keyHealthInequalities', 'keyHealthInequalitiesItems'],
  ['completedHealthInequalitiesImpactAssessment', 'yesNoItems'],
  ['hasProductServiceOrPrototype', 'yesNoItems'],
  ['hasEvidence', 'yesNotYetNoItems'],
  ['currentlyCollectingEvidence', 'yesNoItems'],
  ['needsSupportAnyArea', 'needsSupportAnyAreaItems'],
  ['hasMarketResearch', 'hasMarketResearchItems'],
  ['optionBestDescribesInnovation', 'optionBestDescribesInnovationItems'],
  ['innovationPathwayKnowledge', 'innovationPathwayKnowledgeItems'],
  ['involvedUsersDesignProcess', 'involvedUsersDesignProcessItems'],
  ['testedWithIntendedUsers', 'testedWithIntendedUsersItems'],
  ['intendedUserGroupsEngaged', 'intendedUserGroupsEngagedItems'],
  ['hasRegulationKnowledge', 'hasRegulationKnowledgeItems'],
  ['type', 'standardsTypeItems'],
  ['hasMet', 'standardsHasMetItems'],
  ['hasPatents', 'hasPatentsItems'],
  ['hasOtherIntellectual', 'yesNoItems'],
  ['hasRevenueModel', 'hasRevenueModelItems'],
  ['revenues', 'revenuesItems'],
  ['hasFunding', 'hasFundindItems'],
  ['hasCostKnowledge', 'hasCostKnowledgeItems'],
  ['patientsRange', 'patientRangeItems'],
  ['costComparison', 'costComparisonItems'],
  ['hasDeployPlan', 'yesNoItems'],
  ['isDeployed', 'yesNoItems'],
  ['hasResourcesToScale', 'hasResourcesToScaleItems']
]);
