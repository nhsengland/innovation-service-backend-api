import type { InnovationSupportStatusEnum } from '@innovations/shared/enums';
import type { SupportLogProgressUpdate } from '@innovations/shared/types';

export type SupportSummaryUnitInfo = {
  id: string;
  createdAt: Date;
  createdBy: { id: string; name: string; displayRole?: string };
} & (SupportUpdateData | SuggestedOrganisationData | ProgressUpdateData | InnovationArchivedData | StopShareData);

type SupportUpdateData = {
  type: 'SUPPORT_UPDATE';
  params: {
    supportStatus: InnovationSupportStatusEnum;
    message: string;
  };
};

type SuggestedOrganisationData = {
  type: 'SUGGESTED_ORGANISATION';
  params: {
    suggestedByName?: string;
    message?: string;
  };
};

type ProgressUpdateData = {
  type: 'PROGRESS_UPDATE';
  params: {
    message: string;
    file?: { id: string; name: string; url: string };
  } & SupportLogProgressUpdate['params'];
};

type InnovationArchivedData = {
  type: 'INNOVATION_ARCHIVED';
  params: { supportStatus: InnovationSupportStatusEnum; message: string };
};

type StopShareData = {
  type: 'STOP_SHARE';
  params: { supportStatus: InnovationSupportStatusEnum };
};
