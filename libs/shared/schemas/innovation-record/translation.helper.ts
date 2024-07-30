const evidenceSubmitType = new Map<string, string>([
  ['CLINICAL_OR_CARE', 'Evidence of clinical or care outcomes'],
  ['COST_IMPACT_OR_ECONOMIC', 'Evidence of cost impact, efficiency gains and/or economic modelling'],
  ['OTHER_EFFECTIVENESS', 'Other evidence of effectiveness (for example environmental or social)'],
  ['PRE_CLINICAL', 'Pre-clinical evidence'],
  ['REAL_WORLD', 'Real world evidence']
]);
const evidenceType = new Map<string, string>([
  ['DATA_PUBLISHED', 'Data published, but not in a peer reviewed journal'],
  ['NON_RANDOMISED_COMPARATIVE_DATA', 'Non-randomised comparative data published in a peer reviewed journal'],
  ['NON_RANDOMISED_NON_COMPARATIVE_DATA', 'Non-randomised non-comparative data published in a peer reviewed journal'],
  ['CONFERENCE', 'Poster or abstract presented at a conference'],
  ['RANDOMISED_CONTROLLED_TRIAL', 'Randomised controlled trial published in a peer reviewed journal'],
  ['UNPUBLISHED_DATA', 'Unpublished data'],
  ['OTHER', 'Other']
]);

export const translateEvidences = (evidences: any[]): any => {
  if (!evidences) return [];
  for (const evidence of evidences) {
    if (evidence.evidenceType) {
      evidence.evidenceType = evidenceType.get(evidence.evidenceType) ?? evidence.evidenceType;
    }
    if (evidence.evidenceSubmitType) {
      evidence.evidenceSubmitType = evidenceSubmitType.get(evidence.evidenceSubmitType) ?? evidence.evidenceSubmitType;
    }
  }
  return evidences;
};
