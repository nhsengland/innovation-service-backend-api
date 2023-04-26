import { ServiceRoleEnum } from '@admin/shared/enums';

export const AdminOperationType = {
  LOCK_USER: 'LOCK_USER',
  UPDATE_USER_ROLE: 'UPDATE_USER_ROLE',
  CHANGE_UNIT: 'CHANGE_UNIT',
} as const;
export type AdminOperationType = (typeof AdminOperationType)[keyof typeof AdminOperationType];

export const AdminRuleType = {
  AssessmentUserIsNotTheOnlyOne: 'AssessmentUserIsNotTheOnlyOne',
  LastQualifyingAccessorUserOnOrganisationUnit: 'LastQualifyingAccessorUserOnOrganisationUnit',
  LastUserOnOrganisationUnit: 'LastUserOnOrganisationUnit',
  NoInnovationsSupportedOnlyByThisUser: 'NoInnovationsSupportedOnlyByThisUser',
} as const;
export type AdminRuleType = (typeof AdminRuleType)[keyof typeof AdminRuleType];

export type ValidationResult = {
  rule: AdminRuleType;
  valid: boolean;
  data?: {
    supports?: { count: number; innovations: { id: string; name: string }[] };
  };
};

export const AdminOperationsRulesMapper: Record<
  AdminOperationType,
  { [userTypeKey in ServiceRoleEnum]?: AdminRuleType[] }
> = {
  LOCK_USER: {
    [ServiceRoleEnum.ASSESSMENT]: [AdminRuleType.AssessmentUserIsNotTheOnlyOne],
    [ServiceRoleEnum.QUALIFYING_ACCESSOR]: [
      AdminRuleType.LastQualifyingAccessorUserOnOrganisationUnit,
      AdminRuleType.LastUserOnOrganisationUnit,
      AdminRuleType.NoInnovationsSupportedOnlyByThisUser,
    ],
    [ServiceRoleEnum.ACCESSOR]: [
      AdminRuleType.LastUserOnOrganisationUnit,
      AdminRuleType.NoInnovationsSupportedOnlyByThisUser,
    ],
  },

  UPDATE_USER_ROLE: {
    [ServiceRoleEnum.ACCESSOR]: [AdminRuleType.LastUserOnOrganisationUnit],
  },

  CHANGE_UNIT: {
    [ServiceRoleEnum.ACCESSOR]: [
      AdminRuleType.NoInnovationsSupportedOnlyByThisUser,
      AdminRuleType.LastUserOnOrganisationUnit,
    ],
  },
};
