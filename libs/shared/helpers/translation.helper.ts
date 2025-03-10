const TRANSLATIONS = {
  DEFAULT_MESSAGES: {
    EXPORT_REQUEST: {
      // TODO: This will be cleaned up after archive feature
      WITHDRAW: 'Since the innovator withdrew his innovation, this export request was automatically rejected.',
      STOP_SHARING:
        'This export request was rejected automatically, as the innovator has stopped sharing their innovation with this organisation.',
      ARCHIVE: 'This export request was rejected automatically, as the innovator has archived this innovation.'
    }
  },
  SUPPORT_STATUS: {
    SUGGESTED: 'Suggested',
    ENGAGING: 'Engaging',
    WAITING: 'Waiting',
    UNASSIGNED: 'Unassigned',
    UNSUITABLE: 'Unsuitable',
    CLOSED: 'Closed'
  },
  EVIDENCE_SUBMIT_TYPES: {
    CLINICAL_OR_CARE: 'Evidence of clinical or care outcomes',
    COST_IMPACT_OR_ECONOMIC: 'Evidence of cost impact, efficiency gains and/or economic modelling',
    OTHER_EFFECTIVENESS: 'Other evidence of effectiveness (for example environmental or social)',
    PRE_CLINICAL: 'Pre-clinical evidence',
    REAL_WORLD: 'Real world evidence'
  },
  SECTION: {
    INNOVATION_DESCRIPTION: 'Description of innovation',
    UNDERSTANDING_OF_NEEDS: 'Detailed understanding of needs and benefits',
    EVIDENCE_OF_EFFECTIVENESS: 'Evidence of impact and benefit',
    MARKET_RESEARCH: 'Market research',
    CURRENT_CARE_PATHWAY: 'Current care pathway',
    TESTING_WITH_USERS: 'Testing with users',
    REGULATIONS_AND_STANDARDS: 'Regulatory approvals, standards and certifications',
    INTELLECTUAL_PROPERTY: 'Intellectual property',
    REVENUE_MODEL: 'Revenue Model',
    COST_OF_INNOVATION: 'Cost of your innovation',
    DEPLOYMENT: 'Deployment'
  },
  SERVICE_ROLES: {
    ADMIN: 'Administrator',
    ASSESSMENT: 'Needs Assessor',
    INNOVATOR: 'Innovator',
    ACCESSOR: 'Accessor',
    QUALIFYING_ACCESSOR: 'Qualifying Accessor'
  },
  TEAMS: {
    ADMIN: 'Service administrators',
    ASSESSMENT: 'Needs assessment team'
  },
  ARCHIVE_REASONS: {
    DEVELOP_FURTHER: 'Developing innovation further ',
    HAVE_ALL_SUPPORT: 'I have all the support I need',
    DECIDED_NOT_TO_PURSUE: 'I have decided not to pursue this innovation',
    ALREADY_LIVE_NHS: 'Innovation already live in the NHS',
    OTHER_DONT_WANT_TO_SAY: 'Other reason or I do not want to say',
    SIX_MONTHS_INACTIVITY: 'Innovation inactive for 6 months',
    OWNER_ACCOUNT_DELETED: 'Innovation owner deleted the account',
    LEGACY: 'LEGACY'
  }
};

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & string]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]> extends infer U extends string ? U : never}`
    : `${Key}`;
}[keyof ObjectType & string];

type TranslationsType = typeof TRANSLATIONS;

export class TranslationHelper {
  static translate(key: NestedKeyOf<TranslationsType>): string {
    let translation: any = TRANSLATIONS;
    const keys = key.split('.');
    for (const key of keys) {
      translation = translation[key as keyof TranslationsType];
    }
    return translation;
  }
}
