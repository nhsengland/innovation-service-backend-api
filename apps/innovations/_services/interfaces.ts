import type { InnovationActionsService } from './innovation-actions.service';
import type { InnovationAssessmentsService } from './innovation-assessments.service';
import type { InnovationSectionsService } from './innovation-sections.service';
import type { InnovationSupportsService } from './innovation-supports.service';
import type { InnovationThreadsService } from './innovation-threads.service';
import type { InnovationTransferService } from './innovation-transfer.service'
import type { InnovationsService } from './innovations.service';
import type { PDFService } from './pdf.service';


export type InnovationActionsServiceType = typeof InnovationActionsService.prototype;
export const InnovationActionsServiceSymbol = Symbol('InnovationActionsService');

export type InnovationAssessmentsServiceType = typeof InnovationAssessmentsService.prototype;
export const InnovationAssessmentsServiceSymbol = Symbol('InnovationAssessmentsService');

export type InnovationSectionsServiceType = typeof InnovationSectionsService.prototype;
export const InnovationSectionsServiceSymbol = Symbol('InnovationSectionsService');

export type InnovationSupportsServiceType = typeof InnovationSupportsService.prototype;
export const InnovationSupportsServiceSymbol = Symbol('InnovationSupportsService');

export type InnovationThreadsServiceType = typeof InnovationThreadsService.prototype;
export const InnovationThreadsServiceSymbol = Symbol('InnovationThreadsService');

export type InnovationTransferServiceType = typeof InnovationTransferService.prototype;
export const InnovationTransferServiceSymbol = Symbol('InnovationTransferService');

export type InnovationsServiceType = typeof InnovationsService.prototype;
export const InnovationsServiceSymbol = Symbol('InnovationsService');

export type PDFServiceType = typeof PDFService.prototype;
export const PDFServiceSymbol = Symbol('PDFService');