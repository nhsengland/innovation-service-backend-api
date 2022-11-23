import type { AdminService } from './admin.service';


export type AdminServiceType = typeof AdminService.prototype;
export const AdminServiceSymbol = Symbol('AdminService');
