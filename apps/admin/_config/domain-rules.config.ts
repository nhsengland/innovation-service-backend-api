import { UserTypeEnum } from '@admin/shared/enums';

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


export const RuleMapper: { [operationKey in DomainOperationEnum]: { [userTypeKey in UserTypeEnum]?: DomainOperationRulesEnum[] } } = {

  'LOCK_USER': {
    [UserTypeEnum.ASSESSMENT]: [DomainOperationRulesEnum.AssessmentUserIsNotTheOnlyOne],
    [UserTypeEnum.ACCESSOR]: [
      DomainOperationRulesEnum.LastAccessorUserOnOrganisationUnit,
      DomainOperationRulesEnum.LastAccessorFromUnitProvidingSupport
    ]
  },

  'UPDATE_USER_ROLE': {
    [UserTypeEnum.ACCESSOR]: [DomainOperationRulesEnum.LastAccessorUserOnOrganisationUnit]
  },

  'CHANGE_UNIT': {
    [UserTypeEnum.ACCESSOR]: [
      DomainOperationRulesEnum.LastAccessorFromUnitProvidingSupport,
      DomainOperationRulesEnum.LastAccessorUserOnOrganisationUnit
    ]
  }

};
