import { InnovationsService } from './innovations.service';

export type InnovationsServiceType = typeof InnovationsService.prototype;
export const InnovationsServiceSymbol = Symbol('InnovationsService');