import type { InnovationSupportStatusEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  id: string;
  status: InnovationSupportStatusEnum;
  engagingAccessors: { id: string; userRoleId: string; name: string }[];
};
