import Joi from 'joi';

import type { ActivityEnum } from '../enums/activity.enums';
import type { InnovationSupportLogTypeEnum, InnovationSupportStatusEnum } from '../enums/innovation.enums';
import { ServiceRoleEnum } from '../enums/user.enums';
import { JoiHelper } from '../helpers/joi.helper';
import type { CurrentCatalogTypes } from '../schemas/innovation-record';

export type RoleType = {
  id: string;
  role: ServiceRoleEnum;
  isActive: boolean;
  organisation?: { id: string; name: string; acronym: string | null };
  organisationUnit?: { id: string; name: string; acronym: string };
};

export type CreateRolesType =
  | { role: ServiceRoleEnum.ASSESSMENT | ServiceRoleEnum.ADMIN }
  | {
      role: ServiceRoleEnum.ACCESSOR | ServiceRoleEnum.QUALIFYING_ACCESSOR;
      organisationId: string;
      unitIds: string[];
    };

export const CreateRolesSchema = Joi.object<CreateRolesType>({
  role: JoiHelper.AppCustomJoi()
    .string()
    .valid(
      ServiceRoleEnum.ADMIN,
      ServiceRoleEnum.ASSESSMENT,
      ServiceRoleEnum.ACCESSOR,
      ServiceRoleEnum.QUALIFYING_ACCESSOR
    )
    .required()
    .description('Role of the user.')
})
  .when('.role', {
    is: JoiHelper.AppCustomJoi().string().valid(ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR),
    then: Joi.object({
      organisationId: JoiHelper.AppCustomJoi()
        .string()
        .guid()
        .required()
        .description('Id of the organisation.')
        .required(),
      unitIds: Joi.array()
        .items(JoiHelper.AppCustomJoi().string().guid())
        .required()
        .description('Ids of the organisation units.')
        .required()
        .min(1)
    })
  })
  .required();

// User domain types.
export type DomainUserInfoType = {
  id: string;
  identityId: string;
  email: string;
  displayName: string;
  roles: RoleType[];
  phone: null | string;
  isActive: boolean;
  lockedAt: null | Date;
  passwordResetAt: null | Date;
  firstTimeSignInAt: null | Date;
};

// This is mostly the same as DomainUserInfoType, but with some fields removed.
export type DomainUserIdentityInfo = {
  id: string;
  identityId: string;
  displayName: string;
  roles: Pick<RoleType, 'id' | 'isActive' | 'role'>[];
  email: string;
  mobilePhone: null | string;
  isActive: boolean;
  lastLoginAt: null | Date;
};

export type InnovatorDomainContextType = {
  id: string;
  identityId: string;
  organisation: {
    id: string;
    name: string;
    acronym: string | null;
    organisationUnit?: never;
  };
  currentRole: {
    id: string;
    role: ServiceRoleEnum.INNOVATOR;
  };
};

export type AssessmentDomainContextType = {
  id: string;
  identityId: string;
  organisation?: never;
  currentRole: {
    id: string;
    role: ServiceRoleEnum.ASSESSMENT;
  };
};

export type AccessorDomainContextType = {
  id: string;
  identityId: string;
  organisation: {
    id: string;
    name: string;
    acronym: string | null;
    organisationUnit: { id: string; name: string; acronym: string };
  };
  currentRole: {
    id: string;
    role: ServiceRoleEnum.ACCESSOR | ServiceRoleEnum.QUALIFYING_ACCESSOR;
  };
};

export type AdminDomainContextType = {
  id: string;
  identityId: string;
  organisation?: never;
  currentRole: {
    id: string;
    role: ServiceRoleEnum.ADMIN;
  };
};

export type DomainContextType =
  | AdminDomainContextType
  | AccessorDomainContextType
  | AssessmentDomainContextType
  | InnovatorDomainContextType;

// helpers for type checking
export const isInnovatorDomainContextType = (value: DomainContextType): value is InnovatorDomainContextType => {
  return value.currentRole.role === ServiceRoleEnum.INNOVATOR;
};
export const isAssessmentDomainContextType = (value: DomainContextType): value is AssessmentDomainContextType => {
  return value.currentRole.role === ServiceRoleEnum.ASSESSMENT;
};
export const isAccessorDomainContextType = (value: DomainContextType): value is AccessorDomainContextType => {
  return (
    value.currentRole.role === ServiceRoleEnum.ACCESSOR ||
    value.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR
  );
};
export const isAdminDomainContextType = (value: DomainContextType): value is AdminDomainContextType => {
  return value.currentRole.role === ServiceRoleEnum.ADMIN;
};

// TODO - improve this type.
export const DomainContextSchema = Joi.object<DomainContextType>({
  id: JoiHelper.AppCustomJoi().string().uuid().required(),
  identityId: JoiHelper.AppCustomJoi().string().uuid().required(),
  organisation: Joi.when('$currentRole.role', {
    is: ServiceRoleEnum.INNOVATOR,
    then: Joi.object({
      id: JoiHelper.AppCustomJoi().string().uuid().required(),
      name: JoiHelper.AppCustomJoi().string().allow('').required(),
      acronym: JoiHelper.AppCustomJoi().string().allow(null).required(),
      role: JoiHelper.AppCustomJoi().string().required(),
      isShadow: Joi.boolean().required(),
      size: JoiHelper.AppCustomJoi().string().allow(null).required()
    })
      .allow(null)
      .required()
  })

    // TODO - CHECK IF JOI ALLOWS OVERRIDING THE DEFAULT OBJECT
    .when('$currentRole.role', {
      is: ServiceRoleEnum.ADMIN,
      then: Joi.forbidden()
    })
    .when('$currentRole.role', {
      is: ServiceRoleEnum.ASSESSMENT,
      then: Joi.forbidden()
    })
    .when('$currentRole.role', {
      is: ServiceRoleEnum.ACCESSOR,
      then: Joi.object({
        id: JoiHelper.AppCustomJoi().string().uuid().required(),
        name: JoiHelper.AppCustomJoi().string().allow('').required(),
        acronym: JoiHelper.AppCustomJoi().string().allow(null).required(),
        role: JoiHelper.AppCustomJoi().string().required(),
        isShadow: Joi.boolean().required(),
        size: JoiHelper.AppCustomJoi().string().allow(null).required(),
        organisationUnit: Joi.object({
          id: JoiHelper.AppCustomJoi().string().uuid().required(),
          name: JoiHelper.AppCustomJoi().string().required(),
          acronym: JoiHelper.AppCustomJoi().string().required(),
          organisationUnitUser: Joi.object({
            id: JoiHelper.AppCustomJoi().string().uuid().required()
          }).required()
        }).required()
      })
    })
    .when('$currentRole.role', {
      is: ServiceRoleEnum.QUALIFYING_ACCESSOR,
      then: Joi.object({
        id: JoiHelper.AppCustomJoi().string().uuid().required(),
        name: JoiHelper.AppCustomJoi().string().allow('').required(),
        acronym: JoiHelper.AppCustomJoi().string().allow(null).required(),
        role: JoiHelper.AppCustomJoi().string().required(),
        isShadow: Joi.boolean().required(),
        size: JoiHelper.AppCustomJoi().string().allow(null).required(),
        organisationUnit: Joi.object({
          id: JoiHelper.AppCustomJoi().string().uuid().required(),
          name: JoiHelper.AppCustomJoi().string().required(),
          acronym: JoiHelper.AppCustomJoi().string().required(),
          organisationUnitUser: Joi.object({
            id: JoiHelper.AppCustomJoi().string().uuid().required()
          }).required()
        }).required()
      })
    }),
  currentRole: Joi.object({
    id: JoiHelper.AppCustomJoi().string().uuid().optional(),
    role: JoiHelper.AppCustomJoi()
      .string()
      .valid(...Object.values(ServiceRoleEnum), '')
      .optional()
  }).required()
});

// Organisations types.
export type OrganisationWithUnitsType = {
  id: string;
  name: string;
  acronym: null | string;
  units: { id: string; name: string; acronym: string }[];
};

// Innovation domain types.
// // This is the type of the params column on ActivityLog table.
export type ActivityLogDBParamsType = {
  interveningUserId?: string | null;

  assessmentId?: string;
  sectionId?: CurrentCatalogTypes.InnovationSections;
  taskId?: string;
  actionUserRole?: ServiceRoleEnum;
  innovationSupportStatus?: InnovationSupportStatusEnum;

  organisations?: string[]; // This holds the name, not id's.
  organisationUnit?: string; // This holds the name, not id.
  comment?: { id?: string; value: string }; // Some descriptions (ex: tasks), are stored as a comment, hence, without an id.
  totalTasks?: number;

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

  message?: string | { id: string };

  progressUpdate?: {
    id: string;
    createdAt: Date;
  };
};

// // This is the type of the list of activities.
export type ActivityLogListParamsType = ActivityLogDBParamsType & {
  actionUserName: string;
  interveningUserName?: string;
};

export type ActivitiesParamsType<T extends ActivityEnum> = Required<ActivityLogTemplatesType[T]>['params'];

// TODO: TechDebt the sectionKeyEnum might not be true if different documment versions have different keys
export type ActivityLogTemplatesType = {
  [ActivityEnum.INNOVATION_CREATION]: {
    params: Record<string, never>;
  };
  [ActivityEnum.OWNERSHIP_TRANSFER]: {
    params: { interveningUserId: string | null };
  };
  [ActivityEnum.SHARING_PREFERENCES_UPDATE]: {
    params: { organisations: string[] };
  };
  [ActivityEnum.SECTION_DRAFT_UPDATE]: {
    params: { sectionId: CurrentCatalogTypes.InnovationSections };
  };
  [ActivityEnum.SECTION_SUBMISSION]: {
    params: { sectionId: CurrentCatalogTypes.InnovationSections };
  };
  INNOVATION_SUBMISSION: {
    params: Record<string, never>;
  };
  [ActivityEnum.NEEDS_ASSESSMENT_START]: {
    params: { comment: { id: string; value: string } };
  };
  [ActivityEnum.NEEDS_ASSESSMENT_START_EDIT]: {
    params: { assessmentId: string };
  };
  [ActivityEnum.NEEDS_ASSESSMENT_COMPLETED]: {
    params: { assessmentId: string };
  };
  [ActivityEnum.NEEDS_ASSESSMENT_EDITED]: {
    params: { assessmentId: string };
  };
  [ActivityEnum.ORGANISATION_SUGGESTION]: {
    // TODO: I believe that this is misleading. organisations param, is being populated with units!
    params: { organisations: string[] };
  };
  [ActivityEnum.SUPPORT_STATUS_UPDATE]: {
    params: {
      innovationSupportStatus: InnovationSupportStatusEnum;
      organisationUnit: string;
      comment: { id: string; value: string };
    };
  };
  [ActivityEnum.SUPPORT_PROGRESS_UPDATE]: {
    params: {
      organisationUnit: string;
      progressUpdate: {
        id: string;
        date: Date;
      };
    };
  };
  [ActivityEnum.TASK_CREATION]: {
    params: {
      sectionId: CurrentCatalogTypes.InnovationSections;
      taskId: string;
      comment: { value: string };
      role: ServiceRoleEnum;
    };
  };
  [ActivityEnum.TASK_STATUS_DONE_UPDATE]: {
    params: { taskId: string };
  };
  [ActivityEnum.TASK_STATUS_OPEN_UPDATE]: {
    params: { taskId: string };
  };
  [ActivityEnum.TASK_STATUS_CANCELLED_UPDATE]: {
    params: { taskId: string };
  };
  [ActivityEnum.TASK_STATUS_DECLINED_UPDATE]: {
    params: { taskId: string; interveningUserId: string; comment: { id: string; value: string } };
  };
  [ActivityEnum.COMMENT_CREATION]: {
    params: { comment: { id: string; value: string } };
  };
  [ActivityEnum.THREAD_CREATION]: {
    params: { thread: { id: string; subject: string }; message: { id: string } };
  };
  [ActivityEnum.THREAD_MESSAGE_CREATION]: {
    params: { thread: { id: string; subject: string }; message: { id: string } };
  };
  [ActivityEnum.NEEDS_ASSESSMENT_REASSESSMENT_REQUESTED]: {
    params: { assessment: { id: string }; reassessment: { id: string } };
  };
  [ActivityEnum.INNOVATION_PAUSE]: {
    params: { message: string };
  };
};

// This is the type for B2C user info.
export type IdentityUserInfo = {
  identityId: string;
  displayName: string;
  email: string;
  mobilePhone: null | string;
  isActive: boolean;
  passwordResetAt: null | Date;
  lastLoginAt: null | Date;
};

// Support Log Types
export type SupportLogParams = {
  description: string;
} & (
  | SupportLogStatusUpdate
  | SupportLogAccessorSuggestion
  | SupportLogProgressUpdate
  | SupportLogAssessmentSuggestion
  | SupportLogInnovationArchive
  | SupportLogInnovatorStopSharing
);

export type SupportLogStatusUpdate = {
  type: InnovationSupportLogTypeEnum.STATUS_UPDATE;
  supportStatus: InnovationSupportStatusEnum;
  unitId: string;
};

export type SupportLogAccessorSuggestion = {
  type: InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION;
  supportStatus: InnovationSupportStatusEnum;
  unitId: string;
  suggestedOrganisationUnits: string[];
};

export type SupportLogProgressUpdate = {
  type: InnovationSupportLogTypeEnum.PROGRESS_UPDATE;
  supportStatus: InnovationSupportStatusEnum;
  unitId: string;
  params: SimpleProgressUpdateParams | OneLevelProgressUpdateParams | TwoLevelProgressUpdateParams;
};
type SimpleProgressUpdateParams = { title: string };
type OneLevelProgressUpdateParams = { categories: string[] };
type TwoLevelProgressUpdateParams = { category: string; subCategories: string[] };

export type SupportLogAssessmentSuggestion = {
  type: InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION;
  suggestedOrganisationUnits: string[];
  params: { assessmentId: string };
};

export type SupportLogInnovationArchive = {
  type: InnovationSupportLogTypeEnum.INNOVATION_ARCHIVED;
  supportStatus: InnovationSupportStatusEnum;
  unitId: string;
};

export type SupportLogInnovatorStopSharing = {
  type: InnovationSupportLogTypeEnum.STOP_SHARE;
  supportStatus: InnovationSupportStatusEnum;
  unitId: string;
};
