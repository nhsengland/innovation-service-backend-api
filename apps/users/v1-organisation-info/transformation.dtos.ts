type AdminResponseDTO = {
  id: string;
  name: string;
  acronym: string | null;
  summary: string | null;
  url: string | null;
  organisationUnits: {
    id: string;
    name: string;
    acronym: string;
    isActive: boolean;
    userCount: number;
  }[];
  isActive: boolean;
};

type RegularResponseDTO = Pick<AdminResponseDTO, 'id' | 'name' | 'acronym' | 'summary' | 'url' | 'isActive'>;

export type ResponseDTO = AdminResponseDTO | RegularResponseDTO;
