import type { InnovationFileContextTypeEnum, ServiceRoleEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    context: { id?: string; type: InnovationFileContextTypeEnum; name?: string };
    name: string;
    description?: string;
    createdAt: Date;
    createdBy: { name: string; role: ServiceRoleEnum; isOwner?: boolean; orgUnitName?: string };
    file: { id: string; name: string; size?: number; extension: string; url: string };
  }[];
};
