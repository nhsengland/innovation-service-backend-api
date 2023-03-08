import type { InnovationCollaboratorStatusEnum } from "@innovations/shared/enums";

export type ResponseDTO = {
  count: number,
  data: {
    id: string;
    name?: string;
    collaboratorRole?: string;
    email?: string;
    status: InnovationCollaboratorStatusEnum
  }[]
}
