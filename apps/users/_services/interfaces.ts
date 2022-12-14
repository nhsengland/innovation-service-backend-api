import type { IdentityOperationsService } from './identity-operations.service';
import type { NotificationsService } from './notifications.service';
import type { OrganisationsService } from './organisations.service';
import type { StatisticsService } from './statistics.service';
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

export type NotificationsServiceType = typeof NotificationsService.prototype;
export const NotificationsServiceSymbol = Symbol('NotificationsService');

export type StatisticsServiceType = typeof StatisticsService.prototype;
export const StatisticsServiceSymbol = Symbol('StatisticsService');

export type IdentityOperationsServiceType = typeof IdentityOperationsService.prototype;
export const IdentityOperationsServiceSymbol = Symbol('IdentityOperationsService')