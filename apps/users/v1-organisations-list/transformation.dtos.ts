export type ResponseDTO = {
  id: string;
  name: string;
  acronym: string;
  organisationUnits?: { id: string; name: string; acronym: string; }[];
}[]
