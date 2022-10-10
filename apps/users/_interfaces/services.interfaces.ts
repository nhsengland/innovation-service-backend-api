import type { InnovationsService } from '../_services/innovations.service';
import type { UsersService } from '../_services/users.service';
import type { OrganisationsService } from '../_services/organisations.service';
import type { SurveyService } from '../_services/survey.service';


export type InnovationsServiceType = typeof InnovationsService.prototype;
export const InnovationsServiceSymbol = Symbol('InnovationsService');

export type OrganisationsServiceType = typeof OrganisationsService.prototype;
export const OrganisationsServiceSymbol = Symbol('OrganisationsService');

export type UsersServiceType = typeof UsersService.prototype;
export const UsersServiceSymbol = Symbol('UsersService');

export type SurveyServiceType = typeof SurveyService.prototype;
export const SurveyServiceSymbol = Symbol('SurveyService');