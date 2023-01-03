import type { ActivityEnum } from '../enums/activity.enums';
import type { InnovationSectionEnum, InnovationSupportStatusEnum } from '../enums/innovation.enums';
import type { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum } from '../enums/organisation.enums';
import type { ServiceRoleEnum, UserTypeEnum } from '../enums/user.enums';
import type { DateISOType } from './date.types';


// User domain types.
export type DomainUserInfoType = {
  id: string,
  identityId: string,
  email: string,
  displayName: string,
  type: UserTypeEnum,
  roles: ServiceRoleEnum[],
  phone: null | string,
  isActive: boolean,
  passwordResetAt: null | DateISOType,
  firstTimeSignInAt: null | DateISOType,
  surveyId: null | string,
  organisations: {
    id: string,
    name: string,
    role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum,
    isShadow: boolean,
    size: null | string,
    organisationUnits: { id: string, name: string, acronym: string }[]
  }[]
}

export type DomainContextType = {
  organisation: {
    id: string,
    organisationUser: { id: string }
    name: string,
    acronym: null | string,
    role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum,
    isShadow: boolean,
    size: null | string,
    organisationUnit: { id: string, name: string, acronym: string, organisationUnitUser: { id: string } }
  }
} | null;


// Organisations types.
export type OrganisationWithUnitsType = {
  id: string, name: string, acronym: null | string,
  units: { id: string, name: string, acronym: string }[]
}


// Innovation domain types.
// // This is the type of the params column on ActivityLog table.
export type ActivityLogDBParamsType = {

  actionUserId: string;
  interveningUserId?: string;

  assessmentId?: string;
  sectionId?: InnovationSectionEnum;
  actionId?: string;
  innovationSupportStatus?: InnovationSupportStatusEnum;

  organisations?: string[]; // This holds the name, not id's.
  organisationUnit?: string; // This holds the name, not id.
  comment?: { id?: string; value: string; }; // Some descriptions (ex: actions), are stored as a comment, hence, without an id.
  totalActions?: number;

  thread?: {
    id: string;
    subject: string;
    messageId: string;
  };

  assessment?: {
    id: string;
  };

  reassessment?: {
    id: string;
  };

}

// // This is the type of the list of activities.
export type ActivityLogListParamsType = ActivityLogDBParamsType & {
  actionUserName: string;
  interveningUserName?: string;
}

export type ActivitiesParamsType<T extends ActivityEnum> = Required<ActivityLogTemplatesType[T]>['params'];

export type ActivityLogTemplatesType = {
  [ActivityEnum.INNOVATION_CREATION]: {
    params: Record<string, never>
  },
  [ActivityEnum.OWNERSHIP_TRANSFER]: {
    params: { interveningUserId: string }
  },
  [ActivityEnum.SHARING_PREFERENCES_UPDATE]: {
    params: { organisations: string[] }
  },
  [ActivityEnum.SECTION_DRAFT_UPDATE]: {
    params: { sectionId: InnovationSectionEnum }
  },
  [ActivityEnum.SECTION_SUBMISSION]: {
    params: { sectionId: InnovationSectionEnum }
  },
  INNOVATION_SUBMISSION: {
    params: Record<string, never>
  },
  [ActivityEnum.NEEDS_ASSESSMENT_START]: {
    params: { comment: { id: string, value: string } }
  },
  [ActivityEnum.NEEDS_ASSESSMENT_COMPLETED]: {
    params: { assessmentId: string }
  },
  [ActivityEnum.NEEDS_ASSESSMENT_EDITED]: {
    params: { assessmentId: string }
  },
  [ActivityEnum.ORGANISATION_SUGGESTION]: { // TODO: I believe that this is misleading. organisations param, is being populated with units!
    params: { organisations: string[] }
  },
  [ActivityEnum.SUPPORT_STATUS_UPDATE]: {
    params: { innovationSupportStatus: InnovationSupportStatusEnum, organisationUnit: string, comment: { id: string, value: string } }
  },
  [ActivityEnum.ACTION_CREATION]: {
    params: { sectionId: InnovationSectionEnum, actionId: string, comment: { value: string } }
  },
  [ActivityEnum.ACTION_STATUS_IN_REVIEW_UPDATE]: {
    params: { sectionId: InnovationSectionEnum, totalActions: number }
  },
  [ActivityEnum.ACTION_STATUS_COMPLETED_UPDATE]: {
    params: { actionId: string }
  },
  [ActivityEnum.ACTION_STATUS_REQUESTED_UPDATE]: {
    params: { actionId: string }
  },
  [ActivityEnum.ACTION_STATUS_DECLINED_UPDATE]: {
    params: { actionId: string, interveningUserId: string, comment: { id: string, value: string } }
  },
  [ActivityEnum.COMMENT_CREATION]: {
    params: { comment: { id: string, value: string } }
  },
  [ActivityEnum.THREAD_CREATION]: {
    params: { thread: { id: string, subject: string }, message: { id: string } }
  }
  [ActivityEnum.THREAD_MESSAGE_CREATION]: {
    params: { thread: { id: string, subject: string }, message: { id: string } }
  },
  [ActivityEnum.NEEDS_ASSESSMENT_REASSESSMENT_REQUESTED]: {
    params: { assessment: { id: string }, reassessment: { id: string } }
  },
  [ActivityEnum.INNOVATION_PAUSE]: {
    params: { message: string }
  }
}

// This is the type for B2C user info.
export type IdentityUserInfo = { identityId: string, displayName: string, email: string, mobilePhone: null | string, isActive: boolean, passwordResetAt: null | DateISOType, lastLoginAt: null | DateISOType }
