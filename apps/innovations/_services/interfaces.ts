import type { InnovationsService } from './innovations.service';
import type { InnovationTransferService } from './innovation-transfer.service'

export type InnovationsServiceType = typeof InnovationsService.prototype;
export const InnovationsServiceSymbol = Symbol('InnovationsService');
export type InnovationTransferServiceType = typeof InnovationTransferService.prototype;
export const InnovationTransferServiceSymbol = Symbol('InnovationTransferService');
