import type { OrganisationsService } from './organisations.service';
import type { SurveyService } from './survey.service';
import type { TermsOfUseService } from './terms-of-use.service';
import type { UsersService } from './users.service';


export type OrganisationsServiceType = typeof OrganisationsService.prototype;
export const OrganisationsServiceSymbol = Symbol('OrganisationsService');

export type SurveyServiceType = typeof SurveyService.prototype;
export const SurveyServiceSymbol = Symbol('SurveyService');

export type TermsOfUseServiceType = typeof TermsOfUseService.prototype;
export const TermsOfUseServiceSymbol = Symbol('TermsOfUseService');

export type UsersServiceType = typeof UsersService.prototype;
export const UsersServiceSymbol = Symbol('UsersService');
