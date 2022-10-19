import Joi from 'joi';

import { InnovationActionStatusEnum, InnovationSectionCatalogueEnum } from '@innovations/shared/enums';
import { type PaginationQueryParamsType, JoiHelper } from '@innovations/shared/helpers';

enum orderFields {
  displayId = 'displayId',
  section = 'section',
  innovationName = 'innovationName',
  createdAt = 'createdAt',
  status = 'status',
}

export type QueryParamsType = PaginationQueryParamsType<orderFields> & {
  innovationId: string;
  openActions: boolean;
  status: InnovationActionStatusEnum[];
  sections: InnovationSectionCatalogueEnum[];
  innovationName: string;
}
export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({ orderKeys: Object.keys(orderFields) }).append<QueryParamsType>({
  innovationId: Joi.string().guid().optional(),
  sections: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(InnovationSectionCatalogueEnum))).optional(),
  status: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(InnovationActionStatusEnum))).optional(),
  innovationName: Joi.string().trim().allow(null, '').optional(),
  openActions: Joi.boolean().optional()
}).required();
