import type { TermsOfUseService } from './terms-of-use.service';
import type { OrganisationsService } from './organisations.service';

export type TermsOfUseServiceType = typeof TermsOfUseService.prototype;
export const TermsOfUseServiceSymbol = Symbol('TermsOfUseService');

export type OrganisationsServiceType = typeof OrganisationsService.prototype;
export const OrganisationsServiceSymbol = Symbol('OrganisationsService');
