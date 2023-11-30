import type { InnovationSectionStatusEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  section: {
    section: string;
    status: InnovationSectionStatusEnum;
    submittedAt: null | Date;
    submittedBy?: { name: string; displayTag: string };
    openTasksCount: number;
  };
  data: Record<string, any>;
}[];
