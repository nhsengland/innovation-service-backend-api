import Joi from 'joi';

import { InnovationCategoryCatalogueEnum, InnovationGroupedStatusEnum, InnovationStatusEnum, InnovationSupportStatusEnum } from '@innovations/shared/enums';
import { JoiHelper, PaginationQueryParamsType } from '@innovations/shared/helpers';

import type { DateISOType, TypeFromArray } from '@innovations/shared/types';
import { AssessmentSupportFilterEnum, InnovationLocationEnum } from '../_enums/innovation.enums';

const DateFilterKeys = ['submittedAt'] as const;
const FieldsKeys = ['isAssessmentOverdue', 'assessment', 'supports', 'notifications', 'statistics', 'groupedStatus'] as const;

enum orderFields {
  name = 'name',
  location = 'location',
  mainCategory = 'mainCategory',
  submittedAt = 'submittedAt',
  updatedAt = 'updatedAt',
  assessmentStartedAt = 'assessmentStartedAt',
  assessmentFinishedAt = 'assessmentFinishedAt'
}


export type QueryParamsType = PaginationQueryParamsType<orderFields> & {
  name?: string,
  mainCategories?: InnovationCategoryCatalogueEnum[],
  locations?: InnovationLocationEnum[],
  status: InnovationStatusEnum[],
  assessmentSupportStatus?: AssessmentSupportFilterEnum,
  supportStatuses?: InnovationSupportStatusEnum[],
  groupedStatuses?: InnovationGroupedStatusEnum[],
  engagingOrganisations?: string[],
  assignedToMe?: boolean,
  suggestedOnly?: boolean,
  latestWorkedByMe?: boolean,
  dateFilter?: {
    field: TypeFromArray<typeof DateFilterKeys>,
    startDate?: DateISOType,
    endDate?: DateISOType
  }[],
  fields?: TypeFromArray<typeof FieldsKeys>[]
}


export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({ orderKeys: Object.keys(orderFields) }).append<QueryParamsType>({
  name: JoiHelper.AppCustomJoi().decodeURIString().trim().allow(null, '').optional(),
  mainCategories: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(InnovationCategoryCatalogueEnum))).optional(),
  locations: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(InnovationLocationEnum))).optional(),
  status:
    Joi.when('$userType', {
      is: 'ASSESSMENT',
      then: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT, InnovationStatusEnum.NEEDS_ASSESSMENT, InnovationStatusEnum.IN_PROGRESS)).required()
    }).when('$userType', {
      is: 'ACCESSOR',
      then: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(InnovationStatusEnum.IN_PROGRESS, InnovationStatusEnum.COMPLETE)).required(),
      otherwise: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(InnovationStatusEnum))).optional()
    }),
  assessmentSupportStatus: Joi.string().valid(...Object.values(AssessmentSupportFilterEnum)).optional(),
  engagingOrganisations: JoiHelper.AppCustomJoi().stringArray().items(Joi.string()).optional(),
  supportStatuses: Joi.when('$userOrganisationRole', {
    is: 'ACCESSOR',
    then: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.COMPLETE)).optional(),
    otherwise: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(InnovationSupportStatusEnum))).optional()
  }),
  groupedStatuses: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(InnovationGroupedStatusEnum))).optional(),
  assignedToMe: Joi.boolean().optional().default(false),
  suggestedOnly: Joi.boolean().optional().default(false),
  latestWorkedByMe: Joi.boolean().optional().default(false),
  dateFilter: JoiHelper.AppCustomJoi().stringArrayOfObjects().items(
    Joi.object({
      field: Joi.string().valid(...DateFilterKeys).required(),
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional()
    })
  ).optional(),
  fields: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...FieldsKeys)).optional(),
})
  // make order field forbidden if latestWorkedByMe is true (this would be easier with xor but order has default value)
  .fork('order', (schema) => Joi.when('latestWorkedByMe', { is: true, then: schema.forbidden(), otherwise: schema.optional() })).messages({ 'any.unknown': 'order field is not allowed when latestWorkedByMe is true' })
  .required()
