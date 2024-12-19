import Joi from 'joi';

import { InnovationStatusEnum, InnovationTaskStatusEnum } from '@innovations/shared/enums';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import { JoiHelper } from '@innovations/shared/helpers';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';

enum orderFields {
  displayId = 'displayId',
  section = 'section',
  innovationName = 'innovationName',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  status = 'status'
}

export type QueryParamsType = PaginationQueryParamsType<orderFields> & {
  innovationId?: string;
  innovationName?: string;
  sections?: CurrentCatalogTypes.InnovationSections[];
  status?: InnovationTaskStatusEnum[];
  innovationStatus?: InnovationStatusEnum[];
  createdByMe?: boolean;
  createdByMyUnit?: boolean;
  fields: 'notifications'[];
};
export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({
  orderKeys: Object.keys(orderFields)
})
  .append<QueryParamsType>({
    innovationId: JoiHelper.AppCustomJoi().string().guid().optional(),
    innovationName: JoiHelper.AppCustomJoi().decodeURIString().allow(null, '').optional(),
    sections: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(
        JoiHelper.AppCustomJoi()
          .string()
          .valid(...CurrentCatalogTypes.InnovationSections)
      )
      .optional(),
    status: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(
        JoiHelper.AppCustomJoi()
          .string()
          .valid(...Object.values(InnovationTaskStatusEnum))
      )
      .optional(),
    innovationStatus: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(
        JoiHelper.AppCustomJoi()
          .string()
          .valid(...Object.values(InnovationStatusEnum))
      )
      .optional(),
    createdByMe: Joi.boolean().optional(),
    createdByMyUnit: Joi.boolean().optional().default(true),
    fields: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(JoiHelper.AppCustomJoi().string().valid('notifications'))
      .optional()
  })
  .required();
