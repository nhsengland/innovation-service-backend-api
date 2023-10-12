import type { InnovationCollaboratorStatusEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    name?: string;
    role?: string;
    email?: string;
    status: InnovationCollaboratorStatusEnum;
    isActive?: boolean;
  }[];
};
