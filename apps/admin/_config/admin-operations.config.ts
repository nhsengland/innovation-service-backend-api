import { ServiceRoleEnum } from '@admin/shared/enums';

// export enum AdminOperationsEnum {
//   LOCK_USER = 'LOCK_USER',
//   UPDATE_USER_ROLE = 'UPDATE_USER_ROLE',
//   CHANGE_UNIT = 'CHANGE_UNIT'
// }

export const AdminOperationTypeValues = ['LOCK_USER', 'UPDATE_USER_ROLE', 'CHANGE_UNIT'] as const;
export type AdminOperationType = typeof AdminOperationTypeValues[number];




// export enum AdminOperationRulesEnum {
//   AssessmentUserIsNotTheOnlyOne = 'assessmentUserIsNotTheOnlyOne',
//   LastAccessorUserOnOrganisationUnit = 'lastAccessorUserOnOrganisationUnit',
//   LastAccessorFromUnitProvidingSupport = 'lastAccessorFromUnitProvidingSupport',
// }
export type AdminRuleType = 'AssessmentUserIsNotTheOnlyOne' | 'LastAccessorUserOnOrganisationUnit' | 'LastAccessorFromUnitProvidingSupport';


export type ValidationResult = {
  rule: AdminRuleType,
  valid: boolean,
  data?: {
    // organisationUnit?: { id: string, name: string, acronym: string },
    // supports?: { count: number, innovations: { id: string, name: string }[] }
  }
};


export const AdminOperationsRulesMapper: Record<AdminOperationType, { [userTypeKey in ServiceRoleEnum]?: AdminRuleType[] }> = {

  'LOCK_USER': {
    [ServiceRoleEnum.ASSESSMENT]: ['AssessmentUserIsNotTheOnlyOne'],
    [ServiceRoleEnum.ACCESSOR]: ['LastAccessorUserOnOrganisationUnit', 'LastAccessorFromUnitProvidingSupport'],
    [ServiceRoleEnum.QUALIFYING_ACCESSOR]: ['LastAccessorUserOnOrganisationUnit', 'LastAccessorFromUnitProvidingSupport']
  },

  'UPDATE_USER_ROLE': {
    [ServiceRoleEnum.ACCESSOR]: ['LastAccessorUserOnOrganisationUnit']
  },

  'CHANGE_UNIT': {
    [ServiceRoleEnum.ACCESSOR]: ['LastAccessorFromUnitProvidingSupport', 'LastAccessorUserOnOrganisationUnit']
  }

};
