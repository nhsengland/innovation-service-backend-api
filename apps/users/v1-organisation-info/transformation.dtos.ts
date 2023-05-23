export type ResponseDTO = {
  id: string;
  name: string;
  acronym: string | null;
  organisationUnits: {
    id: string;
    name: string;
    acronym: string;
    isActive: boolean;
    userCount: number;
  }[];
  isActive: boolean;
};
