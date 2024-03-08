import type { InnovationCollaboratorStatusEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  id: string;
  name?: string;
  role?: string;
  email: string;
  status: InnovationCollaboratorStatusEnum;
  innovation: {
    id: string;
    name: string;
    owner?: {
      id: string;
      name?: string;
    };
  };
  invitedAt: Date;
};
