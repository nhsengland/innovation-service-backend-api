import type { InnovationCollaboratorStatusEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  userExists: boolean;
  collaboratorStatus: InnovationCollaboratorStatusEnum;
};
