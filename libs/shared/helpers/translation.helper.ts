const TRANSLATIONS = {
  DEFAULT_MESSAGES: {
    EXPORT_REQUEST: {
      STOP_SHARING: "Since the innovator stopped sharing his innovation, this export request was rejected automatically.",
      WITHDRAW: "Since the innovator withdrew his innovation, this export request was automatically rejected.",
    }
  }
}

type NestedKeyOf<ObjectType extends object> =
  { [Key in keyof ObjectType & string]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]> extends infer U extends string ? U : never}`
    : `${Key}`
  }[keyof ObjectType & string];

type TranslationsType = typeof TRANSLATIONS;

export class TranslationHelper {

  static translate(key: NestedKeyOf<TranslationsType>) {
    let translation: any = TRANSLATIONS;
    const keys = key.split(".");
    for (const key of keys) {
      translation = translation[key as keyof TranslationsType];
    }
    return translation;
  }

}
