type Validations = {
  isRequired?: boolean | [boolean, string];
  pattern?: string | [string, string];
  min?: number | [number, string];
  max?: number | [number, string];
  minLength?: number;
  maxLength?: number;
  equalToLength?: number | [number, string];
  async?: any; // Probably Remove
  existsIn?: string[] | [string[], string];
  validEmail?: boolean | [boolean, string];
  postcodeFormat?: boolean | [boolean, string];
  urlFormat?: boolean | [boolean, string];
  equalTo?: string | [string, string];
};

type Base = {
  id: string;
  label: string;
  description?: string;
  validations?: Validations;
  condition?: { id: string, options: string[] };
};

export type Text = Base & {
  dataType: 'text';
  placeholder?: string;
  lengthLimit?: InputLengthLimitType;
};

type Textarea = Base & {
  dataType: 'textarea';
  placeholder?: string;
  lengthLimit?: TextareaLengthLimitType;
};

export type RadioGroup = Base & {
  dataType: 'radio-group';
  items: (
    | {
        id: string;
        label?: string;
        conditional?: Question;
      }
    | { type: 'separator' }
    | { itemsFromAnswer: string }
  )[];
  size?: 'small' | 'normal'; // Just for display purposes
};

type CheckboxArray = Base & {
  dataType: 'checkbox-array';
  items: (
    | string
    | { type: 'separator' }
    | { id: string; label: string; group?: string; conditional?: string; exclusive?: boolean }
  )[];
  size?: 'small' | 'normal';
};

type AutocompleteArray = Base & {
  dataType: 'autocomplete-array';
  items: { id: string; label: string }[];
};

type FieldsGroup = Base & {
  dataType: 'fields-group';
  field: Question;
  addQuestion?: Question;
  addNewLabel: string;
};

export type Question = Text | Textarea | RadioGroup | CheckboxArray | AutocompleteArray | FieldsGroup;

// Others
export const TEXTAREA_LENGTH_LIMIT = {
  xs: 200,
  s: 500,
  m: 1000,
  l: 1500,
  xl: 2000,
  xxl: 4000
};
export type TextareaLengthLimitType = keyof typeof TEXTAREA_LENGTH_LIMIT;

export const INPUT_LENGTH_LIMIT = {
  xs: 100
};
export type InputLengthLimitType = keyof typeof INPUT_LENGTH_LIMIT;
