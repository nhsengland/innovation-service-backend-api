import type { InnovationListFullResponseType } from '../_services/innovations.service';

export type ResponseDTO = {
  count: number;
  data: Partial<Omit<InnovationListFullResponseType, 'statistics'>>;
};
