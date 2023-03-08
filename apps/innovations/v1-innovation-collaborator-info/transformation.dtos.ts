import type { InnovationCollaboratorStatusEnum } from "@innovations/shared/enums";
import type { DateISOType } from "@innovations/shared/types";

export type ResponseDTO = {
  id: string;
  name?: string;
  role?: string;
  email: string;
  status: InnovationCollaboratorStatusEnum,
  innovation: {
    id: string,
    name: string,
    description: null | string,
    owner: {
      id: string,
      name?: string
    }
  },
  invitedAt: DateISOType
}
