import { ServiceRoleEnum } from '@admin/shared/enums';

export enum DomainOperationEnum {
  LOCK_USER = 'LOCK_USER',
  UPDATE_USER_ROLE = 'UPDATE_USER_ROLE',
  CHANGE_UNIT = 'CHANGE_UNIT'
}

export enum DomainOperationRulesEnum {
  AssessmentUserIsNotTheOnlyOne = 'assessmentUserIsNotTheOnlyOne',
  LastAccessorUserOnOrganisationUnit = 'lastAccessorUserOnOrganisationUnit',
  LastAccessorFromUnitProvidingSupport = 'lastAccessorFromUnitProvidingSupport',
}


export type ValidationResult = {
  operation: DomainOperationRulesEnum;
  valid: boolean;
  meta?: {
    organisationUnit?: { id: string, name: string, acronym: string },
    supports?: { count: number, innovations: { id: string, name: string }[] }
  };
};


export const RuleMapper: { [operationKey in DomainOperationEnum]: { [userTypeKey in ServiceRoleEnum]?: DomainOperationRulesEnum[] } } = {

  'LOCK_USER': {
    [ServiceRoleEnum.ASSESSMENT]: [DomainOperationRulesEnum.AssessmentUserIsNotTheOnlyOne],
    [ServiceRoleEnum.ACCESSOR]: [
      DomainOperationRulesEnum.LastAccessorUserOnOrganisationUnit,
      DomainOperationRulesEnum.LastAccessorFromUnitProvidingSupport
    ],
    [ServiceRoleEnum.QUALIFYING_ACCESSOR]: [
      DomainOperationRulesEnum.LastAccessorUserOnOrganisationUnit,
      DomainOperationRulesEnum.LastAccessorFromUnitProvidingSupport
    ],
  },

  'UPDATE_USER_ROLE': {
    [ServiceRoleEnum.ACCESSOR]: [DomainOperationRulesEnum.LastAccessorUserOnOrganisationUnit]
  },

  'CHANGE_UNIT': {
    [ServiceRoleEnum.ACCESSOR]: [
      DomainOperationRulesEnum.LastAccessorFromUnitProvidingSupport,
      DomainOperationRulesEnum.LastAccessorUserOnOrganisationUnit
    ]
  }

};
