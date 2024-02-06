import type { InnovationSupportStatusEnum } from '@innovations/shared/enums';

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
    title: string;
    message: string;
    file?: { id: string; name: string; url: string };
  };
};

type InnovationArchivedData = {
  type: 'INNOVATION_ARCHIVED';
  params: { supportStatus: InnovationSupportStatusEnum; message: string };
};

type StopShareData = {
  type: 'STOP_SHARE';
  params: { supportStatus: InnovationSupportStatusEnum };
};
