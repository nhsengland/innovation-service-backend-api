import type { AdminService } from './admin.service';
import type { AdminTermsOfUseService } from './admin-terms-of-use.service';
import type { AdminOrganisationsService } from './admin-organisations.service';
import type { AdminUsersService } from './admin-users.service';

export type AdminServiceType = typeof AdminService.prototype;
export const AdminServiceSymbol = Symbol('AdminService');

export type AdminTermsOfUseServiceType = typeof AdminTermsOfUseService.prototype;
export const AdminTermsOfUseServiceSymbol = Symbol('AdminTermsOfUseService');

export type AdminOrganisationsServiceType = typeof AdminOrganisationsService.prototype;
export const AdminOrganisationsServiceSymbol = Symbol('AdminOrganisationsService');

export type AdminUsersServiceType = typeof AdminUsersService.prototype;
export const AdminUsersServiceSymbol = Symbol('AdminUsersService');