import type { InnovationSectionCatalogueEnum, InnovationSupportStatusEnum } from '../enums/innovation.enums';
import type { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum } from '../enums/organisation.enums';
import type { ServiceRoleEnum, UserTypeEnum } from '../enums/user.enums';


// User domain types.
export type DomainUserInfoType = {
  id: string;
  identityId: string;
  email: string;
  displayName: string;
  type: UserTypeEnum;
  roles: ServiceRoleEnum[];
  phone: null | string;
  isActive: boolean;
  passwordResetOn: null | string;
  organisations: {
    id: string;
    name: string;
    role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum;
    isShadow: boolean;
    size: null | string;
    organisationUnits: { id: string; name: string; acronym: string; }[];
  }[];
  firstTimeSignInAt: null | Date;
  surveyId: null | string;
}


// Organisations types.
export type OrganisationWithUnitsType = {
  id: string; name: string; acronym: string;
  units: { id: string; name: string; acronym: string; }[];
}


// Innovation domain types.
// // This is the type of the params column on ActivityLog table.
export type ActivityLogDBParamsType = {

  actionUserId: string;
  interveningUserId?: string;

  assessmentId?: string;
  sectionId?: InnovationSectionCatalogueEnum;
  actionId?: string;
  innovationSupportStatus?: InnovationSupportStatusEnum;

  organisations?: string[]; // This holds the name, not id's.
  organisationUnit?: string; // This holds the name, not id.
  comment?: { id?: string; value: string; }; // Some descriptions (ex: actions), are stored as a comment, hence, without an id.
  totalActions?: number;

}

// // This is the type of the list of activities.
export type ActivityLogListParamsType = ActivityLogDBParamsType & {
  actionUserName: string;
  interveningUserName?: string;
}

export type ActivitiesParamsType<T extends keyof ActivityLogTemplatesType> = Required<ActivityLogTemplatesType[T]>['params'];

export type ActivityLogTemplatesType = {
  INNOVATION_CREATION: {
    params: Record<string, never>
  },
  OWNERSHIP_TRANSFER: {
    params: { interveningUserId: string }
  },
  SHARING_PREFERENCES_UPDATE: {
    params: { organisations: string[] }
  },
  SECTION_DRAFT_UPDATE: {
    params: { sectionId: InnovationSectionCatalogueEnum }
  },
  SECTION_SUBMISSION: {
    params: { sectionId: InnovationSectionCatalogueEnum }
  },
  INNOVATION_SUBMISSION: {
    params: Record<string, never>
  },
  NEEDS_ASSESSMENT_START: {
    params: { comment: { id: string, value: string } }
  },
  NEEDS_ASSESSMENT_COMPLETED: {
    params: { assessmentId: string }
  },
  ORGANISATION_SUGGESTION: { // TODO: I believe that this is misleading. organisations param, is being populated with units!
    params: { organisations: string[] }
  },
  SUPPORT_STATUS_UPDATE: {
    params: { innovationSupportStatus: InnovationSupportStatusEnum, organisationUnit: string, comment: { id: string, value: string } }
  },
  ACTION_CREATION: {
    params: { sectionId: InnovationSectionCatalogueEnum, actionId: string, comment: { value: string } }
  },
  ACTION_STATUS_IN_REVIEW_UPDATE: {
    params: { sectionId: InnovationSectionCatalogueEnum, totalActions: number }
  },
  ACTION_STATUS_COMPLETED_UPDATE: {
    params: { actionId: string, comment: { id: string, value: string } }
  },
  ACTION_STATUS_DECLINED_UPDATE: {
    params: { actionId: string, interveningUserId: string, comment: { id: string, value: string } }
  },
  COMMENT_CREATION: {
    params: { comment: { id: string, value: string } }
  }
}
