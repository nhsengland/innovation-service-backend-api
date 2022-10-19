import Joi from 'joi';

import { InnovationCategoryCatalogueEnum, InnovationStatusEnum, InnovationSupportStatusEnum } from '@innovations/shared/enums';
import { JoiHelper, PaginationQueryParamsType } from '@innovations/shared/helpers';

import { AssessmentSupportFilterEnum, InnovationLocationEnum } from '../_enums/innovation.enums';


enum orderFields {
  name = 'name',
  location = 'location',
  mainCategory = 'mainCategory',
  submittedAt = 'submittedAt',
  updatedAt = 'updatedAt',
  assessmentStartedAt = 'assessmentStartedAt',
  assessmentFinishedAt = 'assessmentFinishedAt',
  engagingEntities = 'engagingEntities'
}


export type QueryParamsType = PaginationQueryParamsType<orderFields> & {
  name?: string,
  mainCategories?: InnovationCategoryCatalogueEnum[],
  locations?: InnovationLocationEnum[],
  status: InnovationStatusEnum[],
  assessmentSupportStatus?: AssessmentSupportFilterEnum,
  supportStatuses?: InnovationSupportStatusEnum[],
  engagingOrganisations?: string[],
  assignedToMe?: boolean,
  suggestedOnly?: boolean,
  fields?: ('assessment' | 'supports')[]
}


export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({ orderKeys: Object.keys(orderFields) }).append<QueryParamsType>({
  name: Joi.string().trim().allow(null, '').optional(),
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
  assignedToMe: Joi.boolean().optional().default(false),
  suggestedOnly: Joi.boolean().optional().default(false),
  fields: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid('assessment', 'supports')).optional()
}).required();
