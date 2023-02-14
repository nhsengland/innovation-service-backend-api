import 'reflect-metadata';

import {
  AccessorOrganisationRoleEnum, InnovationStatusEnum, InnovationSupportStatusEnum, InnovatorOrganisationRoleEnum, ServiceRoleEnum
} from '../../enums';
import { ForbiddenError, UnprocessableEntityError } from '../../errors';
import type { AccessorDomainContextType, AuthContextType, DomainContextType, DomainUserInfoType, InnovatorDomainContextType } from '../../types';

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
  AUTH_USER_TYPE_UNKNOWN = 'AUTH.0011',
  AUTH_INNOVATION_NOT_LOADED = 'AUTH.0101',
  AUTH_INNOVATION_UNAUTHORIZED = 'AUTH.0102',
  AUTH_INNOVATION_STATUS_NOT_ALLOWED = 'AUTH.0103',
  AUTH_MISSING_ORGANISATION_UNIT_CONTEXT = 'AUTH.0201',
  AUTH_MISSING_ORGANISATION_CONTEXT = 'AUTH.0202',
  AUTH_MISSING_CURRENT_ROLE = 'AUTH.0203',
  AUTH_MISSING_DOMAIN_CONTEXT = 'AUTH.0204',
  AUTH_INCONSISTENT_DATABASE_STATE = 'AUTH.0203',
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
  private domainContext: { role?: ServiceRoleEnum, organisationUnitId?: string, organisationId?: string, data?: DomainContextType } = {};

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

  setContext(context: AuthContextType): this {
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

    if (this.domainContext.data?.currentRole.role !== ServiceRoleEnum.ADMIN) {
      error = AuthErrorsEnum.AUTH_USER_TYPE_NOT_ALLOWED;
    }
    if (!error && data?.role && !data.role.some(role => this.user.data?.roles.map(r => r.role).includes(role))) {
      error = AuthErrorsEnum.AUTH_USER_ROLE_NOT_ALLOWED;
    }

    return error;

  }

  checkAssessmentType(): this {
    this.userValidations.set(UserValidationKeys.checkAssessmentType, () => this.assessmentTypeValidation());
    return this;
  }
  private assessmentTypeValidation(): null | AuthErrorsEnum {
    return this.domainContext.data?.currentRole.role === ServiceRoleEnum.ASSESSMENT ? null : AuthErrorsEnum.AUTH_USER_TYPE_NOT_ALLOWED;
  }

  checkAccessorType(data?: { organisationRole?: AccessorOrganisationRoleEnum[], organisationId?: string, organisationUnitId?: string }): this {
    this.userValidations.set(UserValidationKeys.checkAccessorType, () => this.accessorTypeValidation(data));
    return this;
  }
  private accessorTypeValidation(data?: { organisationRole?: AccessorOrganisationRoleEnum[], organisationId?: string, organisationUnitId?: string }): null | AuthErrorsEnum {

    let error: null | AuthErrorsEnum = null;

    if (![ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR].includes(this.domainContext.data?.currentRole.role as ServiceRoleEnum)) {
      error = AuthErrorsEnum.AUTH_USER_TYPE_NOT_ALLOWED;
    }

    if (!this.domainContext.data?.organisation) {
      error = AuthErrorsEnum.AUTH_MISSING_ORGANISATION_CONTEXT;
    }

    if (!this.domainContext.data?.organisation?.organisationUnit) {
      error = AuthErrorsEnum.AUTH_MISSING_ORGANISATION_UNIT_CONTEXT;
    }

    if (!error && this.user.data?.organisations.length === 0) { // Accessors should ALWAYS have an organisation. This is just a sanity check!
      error = AuthErrorsEnum.AUTH_USER_WITHOUT_ORGANISATION;
    }
    if (!error && data?.organisationRole && !data.organisationRole.some(role => role === this.domainContext.data?.organisation!.role)) {
      error = AuthErrorsEnum.AUTH_USER_ORGANISATION_ROLE_NOT_ALLOWED;
    }
    if (!error && data?.organisationId && data.organisationId !== this.domainContext.data?.organisation!.id) {
      error = AuthErrorsEnum.AUTH_USER_ORGANISATION_NOT_ALLOWED;
    }
    if (!error && data?.organisationUnitId && data.organisationUnitId !== this.domainContext.data?.organisation!.organisationUnit?.id) {
      error = AuthErrorsEnum.AUTH_USER_ORGANISATION_UNIT_NOT_ALLOWED;
    }

    return error;

  }

  checkInnovatorType(data?: { organisationId?: string }): this {
    this.userValidations.set(UserValidationKeys.checkInnovatorType, () => this.innovatorTypeValidation(data));
    return this;
  }
  private innovatorTypeValidation(data?: { organisationId?: string }): null | AuthErrorsEnum {

    let error: null | AuthErrorsEnum = null;

    if (this.domainContext.data?.currentRole.role !== ServiceRoleEnum.INNOVATOR) {
      error = AuthErrorsEnum.AUTH_USER_TYPE_NOT_ALLOWED;
    }

    if (!this.domainContext.data?.organisation) {
      error = AuthErrorsEnum.AUTH_MISSING_ORGANISATION_CONTEXT;
    }

    if (!error && this.user.data?.organisations.length === 0) { // Innovators should ALWAYS have an organisation. This is just a sanity check!
      error = AuthErrorsEnum.AUTH_USER_WITHOUT_ORGANISATION;
    }

    if (!error && data?.organisationId && data.organisationId !== this.domainContext.data?.organisation!.id) {
      error = AuthErrorsEnum.AUTH_USER_ORGANISATION_NOT_ALLOWED;
    }
    // As an innovator you don't have an organisation unit.
    // We should remove this?

    // if (!error && data?.organisationUnitId && data.organisationUnitId !== this.domainContext.data?.organisation.organisationUnit?.id) {
    //   error = AuthErrorsEnum.AUTH_USER_ORGANISATION_UNIT_NOT_ALLOWED;
    // }

    return error;

  }

  // Innovation validations.
  checkInnovation(data?: { status?: InnovationStatusEnum[] | { [key in UserTypeEnum]?: InnovationStatusEnum[] } }): this {
    this.innovationValidations.set(InnovationValidationKeys.checkInnovation, () => this.innovationValidation(data));
    return this;
  }
  private innovationValidation(data?: { status?: InnovationStatusEnum[] | { [key in UserTypeEnum]?: InnovationStatusEnum[] } }): null | AuthErrorsEnum {

    let error: null | AuthErrorsEnum = null;

    if (!this.innovation.data) {
      error = AuthErrorsEnum.AUTH_INNOVATION_UNAUTHORIZED;
    }

    const domainContext = this.getContext();
    if (!error && data?.status && domainContext.userType) {

      const status = Array.isArray(data.status) ? data.status : data.status[domainContext.userType];

      if (!(status ?? []).some(status => status === this.innovation.data?.status)) {
        error = AuthErrorsEnum.AUTH_INNOVATION_STATUS_NOT_ALLOWED;
      }

    }

    return error;

  }

  async verify(): Promise<this> {

    let validations: (null | AuthErrorsEnum)[] = [];

    if (!this.user.identityId) { throw new ForbiddenError(AuthErrorsEnum.AUTH_USER_NOT_LOADED); }
    if (!this.user.data) { this.user.data = await this.fetchUserData(this.user.identityId); }

    if (!this.domainContext.data?.currentRole) {

      // get user role from db

      const userRole = await this.domainService.context.getUserContextRole(this.user.identityId, this.domainContext.role);

      if (!userRole) {
        throw new ForbiddenError(AuthErrorsEnum.AUTH_MISSING_CURRENT_ROLE);
      }
      
      // Assigns the correct domainContext based on the user type
      const currentRole = { id: userRole.id, role: userRole.role };

      switch(currentRole.role) {
        case ServiceRoleEnum.INNOVATOR:
          this.domainContext.data = {
            ...this.getInnovatorDomainContextType(this.user.data, currentRole ,this.domainContext.organisationId),
            currentRole: {
              id: currentRole.id,
              role: currentRole.role,
            },
          };
          break;
        case ServiceRoleEnum.QUALIFYING_ACCESSOR:
        case ServiceRoleEnum.ACCESSOR:
          this.domainContext.data = this.getAccessorDomainContextType(this.user.data, currentRole, this.domainContext.organisationUnitId);
          break;
        case ServiceRoleEnum.ASSESSMENT:
          this.domainContext.data = {
            id: this.user.data.id,
            identityId: this.user.data.identityId,
            currentRole: {
              id: currentRole.id,
              role: currentRole.role,
            },
          };
          break;
        case ServiceRoleEnum.ADMIN:
          this.domainContext.data = {
            id: this.user.data.id,
            identityId: this.user.data.identityId,
            currentRole: {
              id: currentRole.id,
              role: currentRole.role,
            },
          };
          break;
        default:
          throw new UnprocessableEntityError(AuthErrorsEnum.AUTH_USER_TYPE_UNKNOWN);
      }
    }

    if (!this.user.data.roles.map(r => r.role).includes(this.domainContext.data?.currentRole.role as ServiceRoleEnum)) {
      throw new ForbiddenError(AuthErrorsEnum.AUTH_USER_TYPE_NOT_ALLOWED);
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
      if (!this.domainContext.data) { throw new ForbiddenError(AuthErrorsEnum.AUTH_MISSING_DOMAIN_CONTEXT); }
      if (!this.innovation.data) { this.innovation.data = await this.fetchInnovationData(this.user.data, this.innovation.id, this.domainContext.data); }

      this.innovationValidations.forEach(checkMethod => validations.push(checkMethod())); // This will run the validation itself and return the result to the array.
      if (!validations.some(item => item === null)) {
        const error = validations.find(item => item !== null) || AuthErrorsEnum.AUTH_USER_UNAUTHORIZED;
        throw new ForbiddenError(error);
      }

    }

    return this;

  }


  private getAccessorDomainContextType(userData: DomainUserInfoType, currentRole: {id: string; role: ServiceRoleEnum}, organisationUnitId?: string): AccessorDomainContextType {

    const role = currentRole;

    if (role.role !== ServiceRoleEnum.QUALIFYING_ACCESSOR && role.role !== ServiceRoleEnum.ACCESSOR) {
      throw new ForbiddenError(AuthErrorsEnum.AUTH_USER_TYPE_NOT_ALLOWED);
    }

    if (!this.user.identityId) { throw new ForbiddenError(AuthErrorsEnum.AUTH_USER_NOT_LOADED); }
    // if an organisation unit was not issued, use the first organisation unit of
    // the first organisation on a user's organisation list as the context.

    // If no organisation unit was issued, use the first organisation unit of the first organisation on a user's organisation list as the context.
    organisationUnitId = organisationUnitId ?? userData.organisations[0]?.organisationUnits[0]?.id ?? '';

    // Using '' as false on purpose.
    if (!organisationUnitId) {
      throw new ForbiddenError(AuthErrorsEnum.AUTH_MISSING_ORGANISATION_UNIT_CONTEXT);
    }
    
    const organisation = userData.organisations.find(o => o.organisationUnits.find(ou => ou.id === organisationUnitId) );
    const organisationUnit = organisation?.organisationUnits.find(ou => ou.id === organisationUnitId);

    // if issued organisation unit is not present in the user's organisation units, throw an error.
    if (!organisation || !organisationUnit) {
      throw new ForbiddenError(AuthErrorsEnum.AUTH_USER_ORGANISATION_UNIT_NOT_ALLOWED);
    }

    if(organisation.role !== AccessorOrganisationRoleEnum.ACCESSOR && organisation.role !== AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR) { 
      throw new ForbiddenError(AuthErrorsEnum.AUTH_INCONSISTENT_DATABASE_STATE);
    }

    return {
      id: userData.id,
      identityId: userData.identityId,
      organisation: {
        id: organisation.id,
        name: organisation.name,
        acronym: organisation.acronym,
        role: organisation.role,
        size: organisation.size,
        isShadow: organisation.isShadow,
        organisationUnit: {
          id: organisationUnit.id,
          name: organisationUnit.name,
          acronym: organisationUnit.acronym,
          organisationUnitUser: {
            id: organisationUnit.organisationUnitUser.id,
          }
        },
      },
      currentRole: { id: role.id, role: role.role },
    };
  }

  private getInnovatorDomainContextType(userData: DomainUserInfoType, currentRole: {id: string; role: ServiceRoleEnum },organisationId?: string): InnovatorDomainContextType {

    const role = currentRole;

    if (role.role !== ServiceRoleEnum.INNOVATOR) {
      throw new ForbiddenError(AuthErrorsEnum.AUTH_USER_TYPE_NOT_ALLOWED);
    }

    if (!this.user.identityId) { throw new ForbiddenError(AuthErrorsEnum.AUTH_USER_NOT_LOADED); }
    // if an organisation unit was not issued, use the first organisation unit of
    // the first organisation on a user's organisation list as the context.
    const organisation = organisationId ? userData.organisations.find(o => o.id === organisationId) : userData.organisations[0];
    
    // if issued organisation is not present in the user's organisations, throw an error.
    if (!organisation) {
      throw new ForbiddenError(AuthErrorsEnum.AUTH_USER_ORGANISATION_NOT_ALLOWED);
    }

    if(organisation.role !== InnovatorOrganisationRoleEnum.INNOVATOR_OWNER) {
      throw new ForbiddenError(AuthErrorsEnum.AUTH_INCONSISTENT_DATABASE_STATE);
    }

    return {
      id: userData.id,
      identityId: userData.identityId,
      organisation: {
        id: organisation.id,
        name: organisation.name,
        acronym: organisation.acronym,
        role: organisation.role,
        size: organisation.size,
        isShadow: organisation.isShadow,
      },
      currentRole: { id: role.id, role: role.role },
    };
  }

  // Data fetching methods.
  private async fetchUserData(identityId: string): Promise<DomainUserInfoType> {
    return this.domainService.users.getUserInfo({ identityId });
  }

  /** @deprecated no need to query the database
  private async fetchOrganisationUnitContextData(organisationUnitId: string, identityId: string): Promise<DomainContextType> {
    const unitContext = await this.domainService.context.getContextFromUnitInfo(organisationUnitId, identityId);
    return this.domainContext.data = {
      ...this.domainContext.data,
      ...unitContext
    };
  }
  */

  /** @deprecated no need to query the database
  private async fetchOrganisationContextData(organisationId: string, identityId: string): Promise<DomainContextType> {
    const orgContext = await this.domainService.context.getContextFromOrganisationInfo(organisationId, identityId);
    return this.domainContext.data = {
      ...this.domainContext.data,
      ...orgContext
    };
  }
  */

  private async fetchInnovationData(user: DomainUserInfoType, innovationId: string, context: DomainContextType): Promise<undefined | { id: string, name: string, status: InnovationStatusEnum }> {

    const query = this.domainService.innovations.innovationRepository.createQueryBuilder('innovation');
    query.where('innovation.id = :innovationId', { innovationId });

    if (context.currentRole.role === ServiceRoleEnum.INNOVATOR) {
      query.andWhere('innovation.owner_id = :ownerId', { ownerId: user.id });
    }

    if (context.currentRole.role === ServiceRoleEnum.ASSESSMENT) {
      query.andWhere('innovation.status IN (:...assessmentInnovationStatus)', { assessmentInnovationStatus: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT, InnovationStatusEnum.NEEDS_ASSESSMENT, InnovationStatusEnum.IN_PROGRESS] });
    }

    if (context.currentRole.role === ServiceRoleEnum.ACCESSOR || context.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {

      // Sanity checks!
      if (!context ||
        !context.organisation ||
        !context.organisation.id ||
        !context.organisation.role ||
        !context.organisation.organisationUnit ||
        !context.organisation.organisationUnit.id) {
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
