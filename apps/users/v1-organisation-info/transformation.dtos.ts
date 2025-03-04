type AdminResponseDTO = {
  id: string;
  name: string;
  acronym: string | null;
  summary: string | null;
  website: string | null;
  organisationUnits: {
    id: string;
    name: string;
    acronym: string;
    isActive: boolean;
    userCount: number;
  }[];
  isActive: boolean;
};

type RegularResponseDTO = Pick<AdminResponseDTO, 'id' | 'name' | 'acronym' | 'summary' | 'website' | 'isActive'>;

export type ResponseDTO = AdminResponseDTO | RegularResponseDTO;
