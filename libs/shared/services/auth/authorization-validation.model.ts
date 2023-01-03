import 'reflect-metadata';

import {
  InnovationStatusEnum, InnovationSupportStatusEnum,
  AccessorOrganisationRoleEnum,
  ServiceRoleEnum, UserTypeEnum,
} from '../../enums';
import { ForbiddenError } from '../../errors';
import type { DomainContextType, DomainUserInfoType } from '../../types';

import type { DomainServiceType } from '../interfaces';


export enum AuthErrorsEnum {
  AUTH_USER_NOT_LOADED = 'AUTH.0001',
  AUTH_USER_NOT_ACTIVE = 'AUTH.0002',
  AUTH_USER_UNAUTHORIZED = 'AUTH.0003',
  AUTH_USER_NOT_SELF = 'AUTH.0004',
  AUTH_USER_TYPE_NOT_ALLOWED = 'AUTH.0005',
  AUTH_USER_ROLE_NOT_ALLOWED = 'AUTH.0006',
  AUTH_USER_WITHOUT_ORGANISATION = 'AUTH.0007',
  AUTH_USER_ORGANISATION_NOT_ALLOWED = 'AUTH.0008',
  AUTH_USER_ORGANISATION_ROLE_NOT_ALLOWED = 'AUTH.0009',
  AUTH_USER_ORGANISATION_UNIT_NOT_ALLOWED = 'AUTH.0010',
  AUTH_INNOVATION_NOT_LOADED = 'AUTH.0101',
  AUTH_INNOVATION_UNAUTHORIZED = 'AUTH.0102',
  AUTH_INNOVATION_STATUS_NOT_ALLOWED = 'AUTH.0103',
  AUTH_MISSING_ORGANISATION_UNIT_CONTEXT = 'AUTH.0201',
}

enum UserValidationKeys {
  checkSelfUser = 'selfUserValidation',
  checkAdminType = 'adminTypeValidation',
  checkAssessmentType = 'assessmentTypeValidation',
  checkAccessorType = 'accessorTypeValidation',
  checkInnovatorType = 'innovatorTypeValidation'
}
enum InnovationValidationKeys {
  checkInnovation = 'innovationValidation'
}

export class AuthorizationValidationModel {

  private user: { identityId?: string, data?: DomainUserInfoType } = {};
  private innovation: { id?: string, data?: undefined | { id: string, name: string, status: InnovationStatusEnum } } = {};
  private domainContext: { userType?: UserTypeEnum, organisationUnitId?: string , data?: DomainContextType  } = { };

  private userValidations = new Map<UserValidationKeys, () => null | AuthErrorsEnum>();
  private innovationValidations = new Map<InnovationValidationKeys, () => null | AuthErrorsEnum>();

  constructor(
    private domainService: DomainServiceType
  ) { }


  setUser(identityId: string): this {
    this.user = { identityId };
    return this;
  }

  setInnovation(innovationId: string): this {
    this.innovation = { id: innovationId };
    return this;
  }

  setContext(context: { userType?: UserTypeEnum, organisationUnitId?: string }): this {
    this.domainContext = context;
    return this;
  }

  getUserInfo(): DomainUserInfoType {
    if (this.user.data) { return this.user.data; }
    throw new ForbiddenError(AuthErrorsEnum.AUTH_USER_NOT_LOADED);
  }

  getContext(): DomainContextType {
    if (this.domainContext.data) { return this.domainContext.data; }
    throw new ForbiddenError(AuthErrorsEnum.AUTH_MISSING_ORGANISATION_UNIT_CONTEXT);
  }

  getInnovationInfo(): { id: string, name: string, status: InnovationStatusEnum } {
    if (this.innovation.data) { return this.innovation.data; }
    throw new ForbiddenError(AuthErrorsEnum.AUTH_INNOVATION_NOT_LOADED);
  }


  // User validations.
  checkSelfUser(identityId: string): this {
    this.userValidations.set(UserValidationKeys.checkSelfUser, () => this.selfUserValidation(identityId));
    return this;
  }
  private selfUserValidation(userId: string): null | AuthErrorsEnum {
    return this.user.data?.id === userId ? null : AuthErrorsEnum.AUTH_USER_NOT_SELF;
  }

  checkAdminType(data?: { role?: ServiceRoleEnum[] }): this {
    this.userValidations.set(UserValidationKeys.checkAdminType, () => this.adminTypeValidation(data));
    return this;
  }

  private adminTypeValidation(data?: { role?: ServiceRoleEnum[] }): null | AuthErrorsEnum {

    let error: null | AuthErrorsEnum = null;

    if (this.user.data?.type !== 'ADMIN') {
      error = AuthErrorsEnum.AUTH_USER_TYPE_NOT_ALLOWED;
    }
    if (!error && data?.role && !data.role.some(role => this.user.data?.roles.includes(role))) {
      error = AuthErrorsEnum.AUTH_USER_ROLE_NOT_ALLOWED;
    }

    return error;

  }

  checkAssessmentType(): this {
    this.userValidations.set(UserValidationKeys.checkAssessmentType, () => this.assessmentTypeValidation());
    return this;
  }
  private assessmentTypeValidation(): null | AuthErrorsEnum {
    return this.user.data?.type === 'ASSESSMENT' ? null : AuthErrorsEnum.AUTH_USER_TYPE_NOT_ALLOWED;
  }

  checkAccessorType(data?: { organisationRole?: AccessorOrganisationRoleEnum[], organisationId?: string, organisationUnitId?: string }): this {
    this.userValidations.set(UserValidationKeys.checkAccessorType, () => this.accessorTypeValidation(data));
    return this;
  }
  private accessorTypeValidation(data?: { organisationRole?: AccessorOrganisationRoleEnum[], organisationId?: string, organisationUnitId?: string }): null | AuthErrorsEnum {

    let error: null | AuthErrorsEnum = null;

    if (this.user.data?.type !== 'ACCESSOR') {
      error = AuthErrorsEnum.AUTH_USER_TYPE_NOT_ALLOWED;
    }
    if (!error && this.user.data?.organisations.length === 0) { // Accessors should ALWAYS have an organisation. This is just a sanity check!
      error = AuthErrorsEnum.AUTH_USER_WITHOUT_ORGANISATION;
    }
    if (!error && data?.organisationRole && !data.organisationRole.some(role => role === this.domainContext.data?.organisation.role)) {
      error = AuthErrorsEnum.AUTH_USER_ORGANISATION_ROLE_NOT_ALLOWED;
    }
    if (!error && data?.organisationId && data.organisationId !== this.domainContext.data?.organisation.id) {
      error = AuthErrorsEnum.AUTH_USER_ORGANISATION_NOT_ALLOWED;
    }
    if (!error && data?.organisationUnitId && data.organisationUnitId !== this.domainContext.data?.organisation.organisationUnit.id) {
      error = AuthErrorsEnum.AUTH_USER_ORGANISATION_UNIT_NOT_ALLOWED;
    }

    return error;

  }

  checkInnovatorType(data?: { organisationId?: string, organisationUnitId?: string }): this {
    this.userValidations.set(UserValidationKeys.checkInnovatorType, () => this.innovatorTypeValidation(data));
    return this;
  }
  private innovatorTypeValidation(data?: { organisationId?: string, organisationUnitId?: string }): null | AuthErrorsEnum {

    let error: null | AuthErrorsEnum = null;

    if (this.user.data?.type !== 'INNOVATOR') {
      error = AuthErrorsEnum.AUTH_USER_TYPE_NOT_ALLOWED;
    }
    if (!error && this.user.data?.organisations.length === 0) { // Innovators should ALWAYS have an organisation. This is just a sanity check!
      error = AuthErrorsEnum.AUTH_USER_WITHOUT_ORGANISATION;
    }
    if (!error && data?.organisationId && data.organisationId !== this.domainContext.data?.organisation.id) {
      error = AuthErrorsEnum.AUTH_USER_ORGANISATION_NOT_ALLOWED;
    }
    if (!error && data?.organisationUnitId && data.organisationUnitId !== this.domainContext.data?.organisation.organisationUnit.id) {
      error = AuthErrorsEnum.AUTH_USER_ORGANISATION_UNIT_NOT_ALLOWED;
    }

    return error;

  }

  // Innovation validations.
  checkInnovation(data?: { status?: InnovationStatusEnum[] }): this {
    this.innovationValidations.set(InnovationValidationKeys.checkInnovation, () => this.innovationValidation(data));
    return this;
  }
  private innovationValidation(data?: { status?: InnovationStatusEnum[] }): null | AuthErrorsEnum {

    let error: null | AuthErrorsEnum = null;

    if (!this.innovation.data) {
      error = AuthErrorsEnum.AUTH_INNOVATION_UNAUTHORIZED;
    }
    if (!error && data?.status && !data.status.some(status => status === this.innovation.data?.status)) {
      error = AuthErrorsEnum.AUTH_INNOVATION_STATUS_NOT_ALLOWED;
    }

    return error;

  }

  async verify(): Promise<this> {

    let validations: (null | AuthErrorsEnum)[] = [];

    if (!this.user.identityId) { throw new ForbiddenError(AuthErrorsEnum.AUTH_USER_NOT_LOADED); }
    if (!this.user.data) { this.user.data = await this.fetchUserData(this.user.identityId); }

    // organisation unit context is only required for accessor type users.
    if (this.user.data?.type === UserTypeEnum.ACCESSOR) {
      await this.getOrganisationUnitContextData(this.user.data, this.domainContext.organisationUnitId);
    }

    if (!this.user.data.isActive) {
      throw new ForbiddenError(AuthErrorsEnum.AUTH_USER_NOT_ACTIVE);
    }

    // User validations. (Only if there's anything to validate).
    if (this.userValidations.size > 0) {

      this.userValidations.forEach(checkMethod => validations.push(checkMethod())); // This will run the validation itself and return the result to the array.
      if (!validations.some(item => item === null)) {
        const error = validations.find(item => item !== null) || AuthErrorsEnum.AUTH_USER_UNAUTHORIZED;
        throw new ForbiddenError(error);
      }

    }

    // Innovation validations. (Only if there's anything to validate).
    if (this.innovationValidations.size > 0) {

      validations = [];
      if (!this.innovation.id) { throw new ForbiddenError(AuthErrorsEnum.AUTH_INNOVATION_NOT_LOADED); }
      
      if (!this.innovation.data) { this.innovation.data = await this.fetchInnovationData(this.user.data, this.innovation.id, this.domainContext.data); }

      this.innovationValidations.forEach(checkMethod => validations.push(checkMethod())); // This will run the validation itself and return the result to the array.
      if (!validations.some(item => item === null)) {
        const error = validations.find(item => item !== null) || AuthErrorsEnum.AUTH_USER_UNAUTHORIZED;
        throw new ForbiddenError(error);
      }

    }

    return this;

  }


  private async getOrganisationUnitContextData(userData: DomainUserInfoType, organisationUnitId?: string): Promise<void> {
    
    if (!this.user.identityId) { throw new ForbiddenError(AuthErrorsEnum.AUTH_USER_NOT_LOADED); }
    // if an organisation unit was not issued, use the first organisation unit of 
    // the first organisation on a user's organisation list as the context.
    const organisationUnit = organisationUnitId || userData.organisations[0]?.organisationUnits[0]?.id;

    if (!organisationUnit) { throw new ForbiddenError(AuthErrorsEnum.AUTH_MISSING_ORGANISATION_UNIT_CONTEXT); }

    // if issued organisation unit is not present in the user's organisation units, throw an error.
    if (!this.user.data?.organisations[0]?.organisationUnits.some(u => u.id === organisationUnit)) {
      throw new ForbiddenError(AuthErrorsEnum.AUTH_USER_ORGANISATION_UNIT_NOT_ALLOWED);
    }

    if (!this.domainContext.data) { this.domainContext.data = await this.fetchOrganisationUnitContextData(organisationUnit, userData.identityId); }
  }

  // Data fetching methods.
  private async fetchUserData(identityId: string): Promise<DomainUserInfoType> {
    return this.domainService.users.getUserInfo({ identityId });
  }

  private async fetchOrganisationUnitContextData(organisationUnitId: string, identityId: string): Promise<DomainContextType> {
    return this.domainService.context.getContextInfo(organisationUnitId, identityId)
  }

  private async fetchInnovationData(user: DomainUserInfoType, innovationId: string, context?: DomainContextType): Promise<undefined | { id: string, name: string, status: InnovationStatusEnum }> {

    const query = this.domainService.innovations.innovationRepository.createQueryBuilder('innovation');
    query.where('innovation.id = :innovationId', { innovationId });

    if (user.type === UserTypeEnum.INNOVATOR) {
      query.andWhere('innovation.owner_id = :ownerId', { ownerId: user.id });
    }

    if (user.type === UserTypeEnum.ASSESSMENT) {
      query.andWhere('innovation.status IN (:...assessmentInnovationStatus)', { assessmentInnovationStatus: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT, InnovationStatusEnum.NEEDS_ASSESSMENT, InnovationStatusEnum.IN_PROGRESS] });
    }

    if (user.type === UserTypeEnum.ACCESSOR) {

      // Sanity checks!
      if (!context || !context.organisation.id || !context.organisation.role || !context.organisation.organisationUnit.id) {
        throw new ForbiddenError(AuthErrorsEnum.AUTH_INNOVATION_UNAUTHORIZED);
      }

      query.innerJoin('innovation.organisationShares', 'innovationShares');
      query.andWhere('innovation.status IN (:...accessorInnovationStatus)', { accessorInnovationStatus: [InnovationStatusEnum.IN_PROGRESS, InnovationStatusEnum.COMPLETE] });
      query.andWhere('innovationShares.id = :accessorOrganisationId', { accessorOrganisationId: context.organisation.id });

      if (context.organisation.role === AccessorOrganisationRoleEnum.ACCESSOR) {
        query.innerJoin('innovation.innovationSupports', 'innovationSupports');
        query.andWhere('innovationSupports.status IN (:...supportStatuses)', { supportStatuses: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.COMPLETE] });
        query.andWhere('innovationSupports.organisation_unit_id = :organisationUnitId ', { organisationUnitId: context.organisation.organisationUnit.id });
      }

    }

    const innovation = await query.getOne();
    return (innovation ? { id: innovation.id, name: innovation.name, status: innovation.status } : undefined);

  }

}
