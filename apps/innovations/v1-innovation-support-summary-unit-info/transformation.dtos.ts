import type { InnovationSupportStatusEnum } from '@innovations/shared/enums';

export type ResponseDTO = ({
  createdAt: Date;
  createdBy: { id: string; name: string; displayRole?: string };
} & (SupportUpdateData | SuggestedOrganisationData | ProgressUpdateData))[];

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
    suggestedByName: string;
    message?: string;
  };
};

type ProgressUpdateData = {
  type: 'PROGRESS_UPDATE';
  params: {
    title: string;
    message: string;
    file: { id: string; name: string; url: string };
  };
};
