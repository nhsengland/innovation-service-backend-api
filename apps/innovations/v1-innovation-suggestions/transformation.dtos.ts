import type { InnovationSuggestionAccessor } from '../_types/innovation.types';

export type ResponseDTO = {
  accessors: InnovationSuggestionAccessor[];
  assessment: {
    suggestedOrganisations: {
      id: string;
      name: string;
      acronym: string | null;
    }[];
  };
};
