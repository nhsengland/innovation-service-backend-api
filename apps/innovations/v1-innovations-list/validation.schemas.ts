import Joi from 'joi';

import { InnovationGroupedStatusEnum, InnovationSupportStatusEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import { JoiHelper } from '@innovations/shared/helpers';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import { InnovationLocationEnum } from '../_enums/innovation.enums';
import type { InnovationListFilters } from '../_services/innovations.service';
import { DateFilterFieldsType, HasAccessThroughKeys, InnovationListSelectType } from '../_services/innovations.service';

export type QueryParamsType = PaginationQueryParamsType<InnovationListSelectType> &
  InnovationListFilters & {
    fields: InnovationListSelectType[];
  };

export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({
  orderKeys: Object.values(InnovationListSelectType),
  defaultOrder: {} // The new innovation list doesn't have a default order and enforces the user to order by a selected field
})
  .append<QueryParamsType>({
    careSettings: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(Joi.string().valid(...CurrentCatalogTypes.catalogCareSettings))
      .optional(),
    categories: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(Joi.string().valid(...CurrentCatalogTypes.catalogCategory))
      .optional(),
    dateFilters: JoiHelper.AppCustomJoi()
      .stringArrayOfObjects()
      .items(
        Joi.object({
          field: Joi.string()
            .valid(...DateFilterFieldsType)
            .required(),
          startDate: Joi.date().optional(),
          endDate: Joi.date().optional()
        })
      )
      .optional(),
    diseasesAndConditions: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().max(100)).optional(),
    engagingOrganisations: JoiHelper.AppCustomJoi().stringArray().items(Joi.string()).optional(),
    engagingUnits: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().uuid()).optional(),
    fields: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(Joi.string().valid(...Object.values(InnovationListSelectType)))
      .min(1)
      .required(),
    groupedStatuses: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(
        Joi.string().valid(
          ...Object.values(InnovationGroupedStatusEnum).filter(v => v !== InnovationGroupedStatusEnum.WITHDRAWN)
        )
      ) // withdrawn is not allowed filter except for admin
      .optional(),
    involvedAACProgrammes: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(Joi.string().valid(...CurrentCatalogTypes.catalogInvolvedAACProgrammes))
      .optional(),
    keyHealthInequalities: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(Joi.string().valid(...CurrentCatalogTypes.catalogKeyHealthInequalities))
      .optional(),
    locations: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(Joi.string().valid(...Object.values(InnovationLocationEnum)))
      .optional(),
    search: JoiHelper.AppCustomJoi().decodeURIString().trim().max(TEXTAREA_LENGTH_LIMIT.xs).allow(null, '').optional()
  })
  .when('$userType', {
    switch: [
      {
        is: ServiceRoleEnum.INNOVATOR,
        then: Joi.object({
          hasAccessThrough: JoiHelper.AppCustomJoi()
            .stringArray()
            .items(Joi.string().valid(...HasAccessThroughKeys))
            .default(['owner', 'collaborator'])
            .min(1)
        })
      },
      {
        is: ServiceRoleEnum.ASSESSMENT,
        then: Joi.object({
          assignedToMe: Joi.boolean().optional(),
          latestWorkedByMe: Joi.boolean().optional()
        })
      },
      {
        is: ServiceRoleEnum.ACCESSOR,
        then: Joi.object({
          assignedToMe: Joi.boolean().optional(),
          closedByMyOrganisation: Joi.boolean().optional(),
          supportStatuses: JoiHelper.AppCustomJoi()
            .stringArray()
            .items(Joi.string().valid(InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.CLOSED))
            .optional()
        })
      },
      {
        is: ServiceRoleEnum.QUALIFYING_ACCESSOR,
        then: Joi.object({
          assignedToMe: Joi.boolean().optional(),
          closedByMyOrganisation: Joi.boolean().optional(),
          supportStatuses: JoiHelper.AppCustomJoi()
            .stringArray()
            .items(Joi.string().valid(...Object.values(InnovationSupportStatusEnum), 'UNASSIGNED'))
            .optional()
        })
      },
      {
        is: ServiceRoleEnum.ADMIN,
        then: Joi.object({
          groupedStatuses: JoiHelper.AppCustomJoi()
            .stringArray()
            .items(Joi.string().valid(...Object.values(InnovationGroupedStatusEnum)))
            .optional(),
          supportStatuses: JoiHelper.AppCustomJoi()
            .stringArray()
            .items(Joi.string().valid(...Object.values(InnovationSupportStatusEnum)))
            .optional(),
          supportUnit: Joi.when('supportStatuses', {
            is: Joi.exist(),
            then: Joi.string().uuid().required()
          })
        })
      }
    ]
  })
  .required();
