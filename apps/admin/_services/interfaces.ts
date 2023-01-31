import type { TermsOfUseService } from './terms-of-use.service';
import type { OrganisationsService } from './organisations.service';
import type { UsersService } from './users.service';
import type { ValidationService } from './validation.service';

export type TermsOfUseServiceType = typeof TermsOfUseService.prototype;
export const TermsOfUseServiceSymbol = Symbol('TermsOfUseService');

export type OrganisationsServiceType = typeof OrganisationsService.prototype;
export const OrganisationsServiceSymbol = Symbol('OrganisationsService');

export type UsersServiceType = typeof UsersService.prototype;
export const UsersServiceSymbol = Symbol('UsersService');

export type ValidationServiceType = typeof ValidationService.prototype;
export const ValidationServiceSymbol = Symbol('ValidationService');