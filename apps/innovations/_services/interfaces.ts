import type { InnovationsService } from './innovations.service';
import type { InnovationTransferService } from './innovation-transfer.service'
import type { InnovationSectionsService } from './innovation-sections.service';
import type { InnovationAssessmentsService } from './innovation-assessments.service';
import type { InnovationThreadsService } from './innovation-threads.service';

export type InnovationsServiceType = typeof InnovationsService.prototype;
export const InnovationsServiceSymbol = Symbol('InnovationsService');

export type InnovationTransferServiceType = typeof InnovationTransferService.prototype;
export const InnovationTransferServiceSymbol = Symbol('InnovationTransferService');

export type InnovationSectionsServiceType = typeof InnovationSectionsService.prototype;
export const InnovationSectionsServiceSymbol = Symbol('InnovationSectionsService');

export type InnovationAssessmentsServiceType = typeof InnovationAssessmentsService.prototype;
export const InnovationAssessmentsServiceSymbol = Symbol('InnovationAssessmentsService');

export type InnovationThreadsServiceType = typeof InnovationThreadsService.prototype;
export const InnovationThreadsServiceSymbol = Symbol('InnovationThreadsService');