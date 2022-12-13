import type { AdminService } from './admin.service';
import type { AdminTermsOfUseService } from './admin-terms-of-use.service';

export type AdminServiceType = typeof AdminService.prototype;
export const AdminServiceSymbol = Symbol('AdminService');

export type AdminTermsOfUseServiceType = typeof AdminTermsOfUseService.prototype;
export const AdminTermsOfUseServiceSymbol = Symbol('AdminTermsOfUseService')
