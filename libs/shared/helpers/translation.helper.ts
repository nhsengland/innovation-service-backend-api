const TRANSLATIONS = {
  DEFAULT_MESSAGES: {
    EXPORT_REQUEST: {
      // TODO: This will be cleaned up after archive feature
      WITHDRAW: 'Since the innovator withdrew his innovation, this export request was automatically rejected.',
      STOP_SHARING: 'This export request was rejected automatically, as the innovator has stopped sharing their innovation with this organisation.',
      ARCHIVE: 'This export request was rejected automatically, as the innovator has archived this innovation.'
    }
  },
  SUPPORT_STATUS: {
    UNASSIGNED: 'Unassigned',
    ENGAGING: 'Engaging',
    WAITING: 'Waiting',
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
