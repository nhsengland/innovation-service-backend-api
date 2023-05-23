import type { StatisticsResponse } from '../_config/statistics.config';
import type { statistics } from './validation.schemas';

export type ResponseDTO = Partial<{ [k in (typeof statistics)[number]]: StatisticsResponse<k> }>;
