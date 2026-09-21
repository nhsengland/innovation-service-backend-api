import Joi from 'joi';

import {
  InnovationGroupedStatusEnum,
  InnovationSupportStatusEnum,
  MaturityLevelCatalogueType,
  ProgressAreasCatalogType,
  ServiceRoleEnum
} from '@innovations/shared/enums';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import { JoiHelper } from '@innovations/shared/helpers';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import { InnovationLocationEnum } from '../_enums/innovation.enums';
import type { InnovationListFilters } from '../_services/innovations.service';
import { DateFilterFieldsType, InnovationListSelectType } from '../_services/innovations.service';

export type QueryParamsType = PaginationQueryParamsType<InnovationListSelectType & 'relevance'> &
  InnovationListFilters & {
    fields: InnovationListSelectType[];
    type?: 'csv';
  };

export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({
  orderKeys: ['relevance', ...Object.values(InnovationListSelectType)]
})
  .append<QueryParamsType>({
    type: Joi.string().valid('csv').optional(),
    careSettings: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(
        JoiHelper.AppCustomJoi()
          .string()
          .valid(...CurrentCatalogTypes.catalogCareSettings)
      )
      .optional(),
    categories: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(
        JoiHelper.AppCustomJoi()
          .string()
          .valid(...CurrentCatalogTypes.catalogCategory)
      )
      .optional(),
    dateFilters: JoiHelper.AppCustomJoi()
      .stringArrayOfObjects()
      .items(
        Joi.object({
          field: JoiHelper.AppCustomJoi()
            .string()
            .valid(...DateFilterFieldsType)
            .required(),
          startDate: Joi.date().optional(),
          endDate: Joi.date().optional()
        })
      )
      .optional(),
    diseasesAndConditions: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(JoiHelper.AppCustomJoi().string().max(100))
      .optional(),
    engagingOrganisations: JoiHelper.AppCustomJoi().stringArray().items(JoiHelper.AppCustomJoi().string()).optional(),
    engagingUnits: JoiHelper.AppCustomJoi().stringArray().items(JoiHelper.AppCustomJoi().string().uuid()).optional(),
    fields: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(
        JoiHelper.AppCustomJoi()
          .string()
          .valid(...Object.values(InnovationListSelectType))
      )
      .min(1)
      .required(),
    groupedStatuses: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(
        JoiHelper.AppCustomJoi()
          .string()
          .valid(...Object.values(InnovationGroupedStatusEnum).filter(v => v !== InnovationGroupedStatusEnum.WITHDRAWN))
      ) // withdrawn is not allowed filter except for admin
      .optional(),
    involvedAACProgrammes: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(
        JoiHelper.AppCustomJoi()
          .string()
          .valid(...CurrentCatalogTypes.catalogInvolvedAACProgrammes)
      )
      .optional(),
    keyHealthInequalities: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(
        JoiHelper.AppCustomJoi()
          .string()
          .valid(...CurrentCatalogTypes.catalogKeyHealthInequalities)
      )
      .optional(),
    locations: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(
        JoiHelper.AppCustomJoi()
          .string()
          .valid(...Object.values(InnovationLocationEnum))
      )
      .optional(),
    search: JoiHelper.AppCustomJoi().decodeURIString().trim().max(TEXTAREA_LENGTH_LIMIT.xs).allow(null, '').optional(),
    areas: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(
        JoiHelper.AppCustomJoi()
          .string()
          .valid(...CurrentCatalogTypes.catalogAreas)
      )
      .optional(),
    maturityLevels: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(
        JoiHelper.AppCustomJoi()
          .string()
          .valid(...MaturityLevelCatalogueType)
      )
      .optional(),
      progressAreas: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(
        JoiHelper.AppCustomJoi()
          .string()
          .valid(...ProgressAreasCatalogType)
      )
      .optional()
  })
  .when('$userType', {
    switch: [
      // {
      //   is: ServiceRoleEnum.INNOVATOR,
      //   then: Joi.object({
      //     hasAccessThrough: JoiHelper.AppCustomJoi()
      //       .stringArray()
      //       .items(JoiHelper.AppCustomJoi().string().valid(...HasAccessThroughKeys))
      //       .default(['owner', 'collaborator'])
      //       .min(1)
      //   })
      // },
      {
        is: ServiceRoleEnum.ASSESSMENT,
        then: Joi.object({
          assignedToMe: Joi.boolean().optional(),
          latestWorkedByMe: Joi.boolean().optional().forbidden()
        })
      },
      {
        is: ServiceRoleEnum.ACCESSOR,
        then: Joi.object({
          assignedToMe: Joi.boolean().optional(),
          closedByMyOrganisation: Joi.boolean().optional().forbidden(),
          suggestedOnly: Joi.boolean().optional(),
          supportStatuses: JoiHelper.AppCustomJoi()
            .stringArray()
            .items(
              JoiHelper.AppCustomJoi()
                .string()
                .valid(InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.CLOSED)
            )
            .optional()
        })
      },
      {
        is: ServiceRoleEnum.QUALIFYING_ACCESSOR,
        then: Joi.object({
          assignedToMe: Joi.boolean().optional(),
          closedByMyOrganisation: Joi.boolean().optional().forbidden(),
          suggestedOnly: Joi.boolean().optional(),
          supportStatuses: JoiHelper.AppCustomJoi()
            .stringArray()
            .items(
              JoiHelper.AppCustomJoi()
                .string()
                .valid(...Object.values(InnovationSupportStatusEnum))
            )
            .optional()
        })
      },
      {
        is: ServiceRoleEnum.ADMIN,
        then: Joi.object({
          groupedStatuses: JoiHelper.AppCustomJoi()
            .stringArray()
            .items(
              JoiHelper.AppCustomJoi()
                .string()
                .valid(...Object.values(InnovationGroupedStatusEnum))
            )
            .optional(),
          supportStatuses: JoiHelper.AppCustomJoi()
            .stringArray()
            .items(
              JoiHelper.AppCustomJoi()
                .string()
                .valid(...Object.values(InnovationSupportStatusEnum))
            )
            .optional(),
          supportUnit: Joi.when('supportStatuses', {
            is: Joi.exist(),
            then: JoiHelper.AppCustomJoi().string().uuid().required()
          })
        })
      }
    ]
  })
  .required();
