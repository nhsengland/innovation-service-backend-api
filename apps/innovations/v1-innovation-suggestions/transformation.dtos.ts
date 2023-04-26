import type { InnovationSuggestionAccessor } from '../_types/innovation.types';

export type ResponseDTO = {
  accessors?: InnovationSuggestionAccessor[];
  assessment?: {
    id?: string;
    suggestedOrganisationUnits?: {
      id: string;
      name: string;
      acronym: string | null;
      organisation: {
        id: string;
        name: string;
        acronym: string | null;
      };
    }[];
  };
};
