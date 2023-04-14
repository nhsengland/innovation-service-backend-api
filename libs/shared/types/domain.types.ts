import Joi from 'joi';
import type { ActivityEnum } from '../enums/activity.enums';
import type { InnovationSupportStatusEnum } from '../enums/innovation.enums';
import type { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum } from '../enums/organisation.enums';
import { ServiceRoleEnum } from '../enums/user.enums';
import type { CurrentCatalogTypes } from '../schemas/innovation-record';


export type RoleType = {
  id: string,
  role: ServiceRoleEnum,
  lockedAt: Date | null, 
  organisation?: {
    id: string,
    name: string,
    acronym: string | null
  },
  organisationUnit?: {
    id: string,
    name: string,
    acronym: string
  }
}

// User domain types.
export type DomainUserInfoType = {
  id: string,
  identityId: string,
  email: string,
  displayName: string,
  roles: RoleType[],
  phone: null | string,
  isActive: boolean,
  lockedAt: null | Date,
  passwordResetAt: null | Date,
  firstTimeSignInAt: null | Date,
  surveyId: null | string,
  organisations: {
    id: string,
    name: string,
    acronym: null | string,
    role: InnovatorOrganisationRoleEnum | AccessorOrganisationRoleEnum,
    isShadow: boolean,
    size: null | string,
    description: null | string,
    registrationNumber: null | string,
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
    organisationUnit: { id: string, name: string, acronym: string }
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
  organisation: Joi.when('$currentRole.role', {
    is: ServiceRoleEnum.INNOVATOR,
    then: Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().allow('').required(),
      acronym: Joi.string().allow(null).required(),
      role: Joi.string().required(),
      isShadow: Joi.boolean().required(),
      size: Joi.string().allow(null).required(),
      }).allow(null).required(),
    })

  // TODO - CHECK IF JOI ALLOWS OVERRIDING THE DEFAULT OBJECT
  .when('$currentRole.role', {
      is: ServiceRoleEnum.ADMIN,
      then: Joi.forbidden(),
      })
  .when('$currentRole.role', {
      is: ServiceRoleEnum.ASSESSMENT,
      then: Joi.forbidden(),
  })
  .when('$currentRole.role', {
    is: ServiceRoleEnum.ACCESSOR,
    then: Joi.object({
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
      }).required(),
    })
  })
  .when('$currentRole.role', {
    is: ServiceRoleEnum.QUALIFYING_ACCESSOR,
    then: Joi.object({
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
      }).required(),
    })
  }),
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
  sectionId?: CurrentCatalogTypes.InnovationSections;
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

// TODO: TechDebt the sectionKeyEnum might not be true if different documment versions have different keys
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
    params: { sectionId: CurrentCatalogTypes.InnovationSections }
  },
  [ActivityEnum.SECTION_SUBMISSION]: {
    params: { sectionId: CurrentCatalogTypes.InnovationSections }
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
    params: { sectionId: CurrentCatalogTypes.InnovationSections, actionId: string, comment: { value: string }, role: ServiceRoleEnum }
  },
  [ActivityEnum.ACTION_STATUS_SUBMITTED_UPDATE]: {
    params: { sectionId: CurrentCatalogTypes.InnovationSections, totalActions: number }
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
export type IdentityUserInfo = { identityId: string, displayName: string, email: string, mobilePhone: null | string, isActive: boolean, passwordResetAt: null | Date, lastLoginAt: null | Date }
