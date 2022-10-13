export type ResponseDTO = Array<{
  id: string;
  name: string;
  acronym: string;
  organisationUnits?: { id: string; name: string; acronym: string; }[];
}>
