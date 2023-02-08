import Joi from 'joi';
import type { UserRoleEntity } from '../entities';
import type { ActivityEnum } from '../enums/activity.enums';
import type { InnovationSectionEnum, InnovationSupportStatusEnum } from '../enums/innovation.enums';
import type { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum } from '../enums/organisation.enums';
import { ServiceRoleEnum } from '../enums/user.enums';
import type { DateISOType } from './date.types';


// User domain types.
export type DomainUserInfoType = {
  id: string,
  identityId: string,
  email: string,
  displayName: string,
  roles: UserRoleEntity[],
  phone: null | string,
  isActive: boolean,
  passwordResetAt: null | DateISOType,
  firstTimeSignInAt: null | DateISOType,
  surveyId: null | string,
  organisations: {
    id: string,
    name: string,
    acronym: null | string,
    role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum,
    isShadow: boolean,
    size: null | string,
    organisationUnits: { id: string, name: string, acronym: string, organisationUnitUser: { id: string } }[]
  }[],
}


export type InnovatorDomainContextType = {
  id: string,
  identityId: string,
  organisation: {
    id: string,
    name: string,
    acronym: string | null,
    role: InnovatorOrganisationRoleEnum,
    isShadow: boolean,
    size: string | null,
    // organisationUser: { id: string },
    organisationUnit?: never
  },
  currentRole: {
    id: string,
    role: ServiceRoleEnum.INNOVATOR,
  },
}

export type AssessmentDomainContextType = {
  id: string,
  identityId: string,
  organisation?: never,
  currentRole: {
    id: string,
    role: ServiceRoleEnum.ASSESSMENT,
  },
}

export type AccessorDomainContextType = {
  id: string,
  identityId: string,
  organisation: {
    id: string,
    name: string,
    acronym: string | null,
    role: AccessorOrganisationRoleEnum,
    size: string | null,
    isShadow: boolean,
    // organisationUser: { id: string },
    organisationUnit: { id: string, name: string, acronym: string, organisationUnitUser: { id: string } }
  },
  currentRole: {
    id: string,
    role: ServiceRoleEnum.ACCESSOR | ServiceRoleEnum.QUALIFYING_ACCESSOR,
  },
}

export type AdminDomainContextType = {
  id: string,
  identityId: string,
  organisation?: never,
  currentRole: {
    id: string,
    role: ServiceRoleEnum.ADMIN,
  },
}

export type DomainContextType = AdminDomainContextType | AccessorDomainContextType | AssessmentDomainContextType | InnovatorDomainContextType;

// helpers for type checking
export const isInnovatorDomainContextType = (value: DomainContextType): value is InnovatorDomainContextType => {
  return value.currentRole.role === ServiceRoleEnum.INNOVATOR;
};
export const isAAssessmentDomainContextType = (value: DomainContextType): value is AssessmentDomainContextType => {
  return value.currentRole.role === ServiceRoleEnum.ASSESSMENT;
};
export const isAccessorDomainContextType = (value: DomainContextType): value is AccessorDomainContextType => {
  return value.currentRole.role === ServiceRoleEnum.ACCESSOR || value.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR;
};
export const isAdminDomainContextType = (value: DomainContextType): value is AdminDomainContextType => {
  return value.currentRole.role === ServiceRoleEnum.ADMIN;
};

// TODO - improve this type.
export const DomainContextSchema = Joi.object<DomainContextType>({
  id: Joi.string().uuid().required(),
  identityId: Joi.string().uuid().required(),
  organisation: Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().allow('').required(),
    acronym: Joi.string().allow(null).required(),
    role: Joi.string().required(),
    isShadow: Joi.boolean().required(),
    size: Joi.string().allow(null).required(),
    organisationUnit: Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().required(),
      acronym: Joi.string().required(),
      organisationUnitUser: Joi.object({
        id: Joi.string().uuid().required(),
      }).required(),
    }).allow(null),
  }).allow(null),
  currentRole: Joi.object({
    id: Joi.string().uuid().optional(),
    role: Joi.string().valid(...Object.values(ServiceRoleEnum), '').optional(),
  }).required(),
});


// Organisations types.
export type OrganisationWithUnitsType = {
  id: string, name: string, acronym: null | string,
  units: { id: string, name: string, acronym: string }[]
}


// Innovation domain types.
// // This is the type of the params column on ActivityLog table.
export type ActivityLogDBParamsType = {

  actionUserId: string;
  actionUserRole: ServiceRoleEnum;
  actionUserOrganisationUnit: string;
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
    params: { sectionId: InnovationSectionEnum, actionId: string, comment: { value: string }, role: ServiceRoleEnum }
  },
  [ActivityEnum.ACTION_STATUS_SUBMITTED_UPDATE]: {
    params: { sectionId: InnovationSectionEnum, totalActions: number }
  },
  [ActivityEnum.ACTION_STATUS_COMPLETED_UPDATE]: {
    params: { actionId: string }
  },
  [ActivityEnum.ACTION_STATUS_REQUESTED_UPDATE]: {
    params: { actionId: string }
  },
  [ActivityEnum.ACTION_STATUS_CANCELLED_UPDATE]: {
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
