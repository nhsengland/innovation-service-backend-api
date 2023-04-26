import type { InnovationActionsService } from './innovation-actions.service';
import type { InnovationAssessmentsService } from './innovation-assessments.service';
import type { InnovationCollaboratorsService } from './innovation-collaborators.service';
import type { InnovationFileService } from './innovation-file.service';
import type { InnovationSectionsService } from './innovation-sections.service';
import type { InnovationSupportsService } from './innovation-supports.service';
import type { InnovationThreadsService } from './innovation-threads.service';
import type { InnovationTransferService } from './innovation-transfer.service';
import type { InnovationsService } from './innovations.service';
import type { PDFService } from './pdf.service';
import type { StatisticsService } from './statistics.service';

export type InnovationActionsServiceType = typeof InnovationActionsService.prototype;
export const InnovationActionsServiceSymbol = Symbol.for('InnovationActionsService');

export type InnovationAssessmentsServiceType = typeof InnovationAssessmentsService.prototype;
export const InnovationAssessmentsServiceSymbol = Symbol.for('InnovationAssessmentsService');

export type InnovationFileServiceType = typeof InnovationFileService.prototype;
export const InnovationFileServiceSymbol = Symbol.for('InnovationFileService');

export type InnovationSectionsServiceType = typeof InnovationSectionsService.prototype;
export const InnovationSectionsServiceSymbol = Symbol.for('InnovationSectionsService');

export type InnovationSupportsServiceType = typeof InnovationSupportsService.prototype;
export const InnovationSupportsServiceSymbol = Symbol.for('InnovationSupportsService');

export type InnovationThreadsServiceType = typeof InnovationThreadsService.prototype;
export const InnovationThreadsServiceSymbol = Symbol.for('InnovationThreadsService');

export type InnovationTransferServiceType = typeof InnovationTransferService.prototype;
export const InnovationTransferServiceSymbol = Symbol.for('InnovationTransferService');

export type InnovationsServiceType = typeof InnovationsService.prototype;
export const InnovationsServiceSymbol = Symbol.for('InnovationsService');

export type InnovationCollaboratorsServiceType = typeof InnovationCollaboratorsService.prototype;
export const InnovationCollaboratorsServiceSymbol = Symbol.for('InnovationCollaboratorsService');

export type PDFServiceType = typeof PDFService.prototype;
export const PDFServiceSymbol = Symbol.for('PDFService');

export type StatisticsServiceType = typeof StatisticsService.prototype;
export const StatisticsServiceSymbol = Symbol.for('StatisticsService');
