export type ResponseDTO = {
  id: string;
  name: string;
  acronym: string;
  isActive?: boolean;
  organisationUnits?: { id: string; name: string; acronym: string; isActive?: boolean }[];
}[];
