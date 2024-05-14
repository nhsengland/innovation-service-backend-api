import type {
  QueryDslQueryContainer,
  QueryDslRangeQuery,
  SearchHit,
  SearchRequest,
  SearchTotalHits,
  Sort
} from '@elastic/elasticsearch/lib/api/types';
import { ES_ENV } from '@innovations/shared/config';
import type { InnovationListView } from '@innovations/shared/entities';
import { InnovationStatusEnum, InnovationSupportStatusEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import { GenericErrorsEnum, NotImplementedError } from '@innovations/shared/errors';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import type { CurrentElasticSearchDocumentType } from '@innovations/shared/schemas/innovation-record';
import type { DomainService, DomainUsersService, ElasticSearchService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import {
  DomainContextType,
  isAccessorDomainContextType,
  isAssessmentDomainContextType
} from '@innovations/shared/types';
import { inject, injectable } from 'inversify';
import { isArray, isString, mapValues, groupBy, pick } from 'lodash';
import { InnovationLocationEnum } from '../_enums/innovation.enums';
import { BaseService } from './base.service';
import type {
  DateFilterFieldsType,
  InnovationListFilters,
  InnovationListFullResponseType
} from './innovations.service';

type SearchInnovationListSelectType =
  // | keyof Omit<CurrentElasticSearchDocumentType, 'assessment' | 'supports'>
  | keyof Omit<InnovationListView, 'assessment' | 'supports' | 'ownerId'> // TODO: should be changed in the future, keeping the same for simplification proccess
  | 'careSettings'
  | 'otherCareSetting'
  | 'categories'
  | 'countryName'
  | 'diseasesAndConditions'
  | 'mainCategory'
  | 'otherCategoryDescription'
  | 'postcode'
  | 'assessment.id'
  | 'assessment.updatedAt'
  | 'assessment.assignedTo'
  | 'assessment.isExempt'
  | 'support.id'
  | 'support.status'
  | 'support.updatedAt'
  | 'support.updatedBy'
  | 'support.closedReason'
  | 'owner.id'
  | 'owner.name'
  | 'owner.companyName';

const translations = new Map([
  ['careSettings', ['document', 'INNOVATION_DESCRIPTION', 'careSettings']],
  ['otherCareSetting', ['document', 'INNOVATION_DESCRIPTION', 'otherCareSetting']],
  ['categories', ['document', 'INNOVATION_DESCRIPTION', 'categories']],
  ['countryName', ['document', 'INNOVATION_DESCRIPTION', 'countryName']],
  ['diseasesAndConditions', ['document', 'UNDERSTANDING_OF_NEEDS', 'diseasesConditionsImpact']],
  ['mainCategory', ['document', 'INNOVATION_DESCRIPTION', 'mainCategory']],
  ['otherCategoryDescription', ['document', 'INNOVATION_DESCRIPTION', 'otherCategoryDescription']],
  ['postcode', ['document', 'INNOVATION_DESCRIPTION', 'postcode']]
]);

type PickHandlerReturnType<T extends { [k: string]: any }, K extends keyof T> = {
  [k in K]: Awaited<ReturnType<T[k]>>;
};

type InnovationListJoinTypes = SearchInnovationListSelectType extends infer X
  ? X extends `${infer U}.${infer _D}`
    ? U
    : never
  : never;

type InnovationListChildrenType<T extends InnovationListJoinTypes> = SearchInnovationListSelectType extends infer X
  ? X extends `${T}.${infer D}`
    ? D
    : never
  : never;

type SearchQueryBody = SearchRequest & { query: SearchBoolQuery };
type SearchBoolQuery = {
  bool: { must: QueryDslQueryContainer[]; must_not: QueryDslQueryContainer[]; filter: QueryDslQueryContainer[] };
};

@injectable()
export class SearchService extends BaseService {
  private index: string;
  constructor(
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService,
    @inject(SHARED_SYMBOLS.ElasticSearchService) private readonly esService: ElasticSearchService
  ) {
    super();
    this.index = ES_ENV.esInnovationIndexName;
  }

  /**
   * This method builds that data that needs to be ingested in the
   * index. Everytime the IR changes this needs to be updated.
   */
  async ingestAllDocuments(): Promise<void> {
    const data = await this.domainService.innovations.getESDocumentsInformation();
    await this.esService.bulkInsert<CurrentElasticSearchDocumentType>(this.index, data);
  }

  /**
   * Upserts a document for a given innovation.
   * Can be used when an innovation changes and an update on the properties is needed.
   */
  async upsertDocument(innovationId: string): Promise<void> {
    const [data] = await this.domainService.innovations.getESDocumentsInformation([innovationId]);
    if (data) {
      await this.esService.upsertDocument(this.index, data);
    }
  }

  async getDocuments<S extends SearchInnovationListSelectType>(
    domainContext: DomainContextType,
    params: {
      fields: S[];
      pagination: PaginationQueryParamsType<any>;
      filters?: InnovationListFilters;
    }
  ): Promise<{ count: number; data: unknown[] }> {
    if (!params.fields.length) {
      return { count: 0, data: [] };
    }

    const searchQuery: SearchQueryBody = {
      index: this.index,
      sort: [],
      query: { bool: { must: [], must_not: [], filter: [] } }
    };

    // Add Permission Guards according with role
    this.addPermissionGuards(domainContext, searchQuery);

    // filters
    for (const [key, value] of Object.entries(params?.filters ?? {})) {
      // add to do a as any for the filters as the value was evaluated as never but this should be safe to use
      if ((this.filtersHandlers[key as keyof typeof this.filtersHandlers] as any) !== undefined) {
        await (this.filtersHandlers[key as keyof typeof this.filtersHandlers] as any)(
          domainContext,
          searchQuery,
          value
        );
      }
    }

    // pagination and sorting
    const sort: Sort = [];
    Object.entries(params.pagination.order).forEach(([key, value]) => {
      if (value === 'ASC' || value === 'DESC') {
        const order = value === 'ASC' ? 'asc' : 'desc';

        // TODO: find a cleaner way to approach this sort. Like this for now.
        switch (key) {
          case 'owner.name':
          case 'support.updatedBy':
            throw new NotImplementedError(GenericErrorsEnum.NOT_IMPLEMENTED_ERROR, {
              message: 'Sort by name is not allowed'
            });

          case 'support.closedReason':
            throw new NotImplementedError(GenericErrorsEnum.NOT_IMPLEMENTED_ERROR, {
              message: 'Filter not needed yet'
            });

          case 'countryName':
            sort.push({ [`document.INNOVATION_DESCRIPTION.${key}.keyword`]: { order } });
            break;

          case 'name':
            sort.push({ [`${key}.keyword`]: { order } });
            break;

          case 'support.updatedAt':
            if (isAccessorDomainContextType(domainContext)) {
              sort.push({
                'supports.updatedAt': {
                  order,
                  nested: {
                    path: 'supports',
                    filter: {
                      term: { 'supports.unitId': domainContext.organisation.organisationUnit.id }
                    }
                  }
                }
              });
            }
            break;

          case 'relevance':
            // Default is by "relevance"
            break;

          default:
            // TODO: Verify if is nested!
            sort.push({ [key]: { order } });
        }
      }
    });
    searchQuery.from = params.pagination.skip;
    searchQuery.size = params.pagination.take;
    searchQuery.sort = sort;

    const response = await this.esService.client.search<CurrentElasticSearchDocumentType>(searchQuery);

    // console.log(response);
    // for (const i in response.hits.hits) {
    //   const hit: any = response.hits.hits[i];
    //   console.log(`${i}: ${hit?._source.name}`);
    // }

    const handlerMaps: {
      [k in keyof typeof this.postHandlers]: Awaited<ReturnType<(typeof this.postHandlers)[k]>>;
    } = {} as any; // initialization
    for (const key of Object.keys(this.postHandlers) as (keyof typeof this.postHandlers)[]) {
      handlerMaps[key] = (await this.postHandlers[key as keyof typeof handlerMaps](response.hits.hits)) as any;
    }

    const fieldGroups = mapValues(
      groupBy(params.fields, item => item.split('.')[0]),
      v => v.filter(i => i.split('.')[1]).map(item => item.split('.')[1]!)
    );
    return {
      count: (response.hits.total as SearchTotalHits).value ?? 0,
      data: response.hits.hits.map(hit => {
        const doc = hit._source!;

        const res = { highlights: hit.highlight } as any;
        Object.entries(fieldGroups).forEach(([key, value]) => {
          if (key in this.displayHandlers) {
            const handler = this.displayHandlers[key as keyof typeof this.displayHandlers];
            if (handler) {
              res[key] = handler(domainContext, doc, value as any[], handlerMaps); // this any should be safe since it comes from the groupBy
            }
          } else {
            // Handle plain object directly from the view
            if (translations.has(key)) {
              res[key] = translations.get(key)!.reduce((o, k) => (o ? o[k] : null), doc as any);
            } else {
              if (key === 'id') {
                res[key] = hit._id;
              } else {
                res[key] = doc[key as keyof CurrentElasticSearchDocumentType];
              }
            }
          }
        });

        // Extra postProcessing the items if required (this might become handlers in the future, keeping a function for now)
        return isAccessorDomainContextType(domainContext) && !doc.shares.includes(domainContext.organisation.id)
          ? this.cleanupAccessorsNotSharedInnovation(res)
          : res;
      })
    };
  }

  private displayHandlers: {
    [k in 'assessment' | 'support' | 'owner' | 'engagingUnits']: (
      domainContext: DomainContextType,
      item: CurrentElasticSearchDocumentType,
      fields: k extends InnovationListJoinTypes ? InnovationListChildrenType<k>[] : string[],
      postHandlers: { [k in keyof typeof this.postHandlers]: Awaited<ReturnType<(typeof this.postHandlers)[k]>> }
    ) => Partial<InnovationListFullResponseType[k]>;
  } = {
    assessment: this.displayAssessment.bind(this),
    engagingUnits: this.displayEngagingUnits.bind(this),
    support: this.displaySupport.bind(this),
    owner: this.displayOwner.bind(this)
  };

  private displayAssessment(
    _domainContext: DomainContextType,
    item: CurrentElasticSearchDocumentType,
    fields: InnovationListChildrenType<'assessment'>[],
    extra: PickHandlerReturnType<typeof this.postHandlers, 'users'>
  ): Partial<InnovationListFullResponseType['assessment']> {
    const res = {} as any;
    fields.forEach(field => {
      switch (field) {
        case 'assignedTo':
          res[field] = extra.users.get(item.assessment?.assignedToId ?? '')?.displayName ?? null;
          break;
        case 'isExempt':
          res[field] = item.assessment?.isExempt;
          break;
        default:
          res[field] = item.assessment?.[field] ?? null;
      }
    });
    return res;
  }

  private displayEngagingUnits(
    _domainContext: DomainContextType,
    item: CurrentElasticSearchDocumentType,
    _fields: string[],
    extra: PickHandlerReturnType<typeof this.postHandlers, 'users'>
  ): Partial<InnovationListFullResponseType['engagingUnits']> {
    // currently not doing any field selection, just replacing user names
    return (
      item.engagingUnits?.map(unit => ({
        acronym: unit.acronym,
        assignedAccessors:
          unit.assignedAccessors?.map(({ id }) => ({
            id,
            name: extra.users.get(id)?.displayName ?? null
          })) ?? null,
        name: unit.name,
        unitId: unit.unitId
      })) || null
    );
  }

  private displaySupport(
    domainContext: DomainContextType,
    item: CurrentElasticSearchDocumentType,
    fields: InnovationListChildrenType<'support'>[],
    extra: PickHandlerReturnType<typeof this.postHandlers, 'users'>
  ): Partial<InnovationListFullResponseType['support']> {
    if (isAccessorDomainContextType(domainContext)) {
      const support = item.supports.filter(s => s.unitId === domainContext.organisation.organisationUnit.id)[0];
      const updatedBy = extra.users?.get(support?.updatedBy ?? '') ?? null;
      const displayName =
        // Ensuring that updatedBy is always innovator if the innovation is archived or not shared
        item.status === InnovationStatusEnum.ARCHIVED ||
        !item.shares?.length ||
        // if the user has the innovator role (currently exclusive) as the updatedBy is not a role but user id and we can't
        // distinguish if there's multiple roles for the same user
        updatedBy?.roles.some(r => r.role === ServiceRoleEnum.INNOVATOR)
          ? 'Innovator'
          : updatedBy?.displayName ?? null;

      // support is handled differently to remove the nested array since it's only 1 element in this case
      return {
        ...(fields.includes('id') && { id: support?.id ?? null }),
        ...(fields.includes('status') && { status: support?.status ?? InnovationSupportStatusEnum.UNASSIGNED }),
        ...(fields.includes('updatedAt') && { updatedAt: support?.updatedAt }),
        ...(fields.includes('updatedBy') && { updatedBy: displayName }),
        ...(fields.includes('closedReason') && {
          closedReason:
            support?.status === InnovationSupportStatusEnum.CLOSED
              ? !item.shares.some(s => s === domainContext.organisation.id)
                ? 'STOPPED_SHARED'
                : item.status === 'ARCHIVED'
                  ? 'ARCHIVED'
                  : 'CLOSED'
              : null
        })
      };
    }

    return null;
  }

  private displayOwner(
    _domainContext: DomainContextType,
    item: CurrentElasticSearchDocumentType,
    fields: InnovationListChildrenType<'owner'>[],
    extra: PickHandlerReturnType<typeof this.postHandlers, 'users'>
  ): Partial<InnovationListFullResponseType['owner']> {
    if (!item.owner) {
      return null;
    }
    return {
      ...(fields.includes('id') && { id: item.owner.id }),
      ...(fields.includes('name') && { name: extra.users.get(item.owner.id ?? '')?.displayName ?? null }),
      ...(fields.includes('companyName') && { companyName: item.owner.companyName ?? null })
    };
  }

  private readonly filtersHandlers: {
    [k in keyof Partial<InnovationListFilters>]: (
      domainContext: DomainContextType,
      query: SearchQueryBody,
      value: Required<InnovationListFilters>[k]
    ) => void | Promise<void>;
  } = {
    assignedToMe: this.addAssignedToMeFilter.bind(this),
    careSettings: this.addJsonFilter('document.INNOVATION_DESCRIPTION.careSettings').bind(this),
    categories: this.addJsonFilter('document.INNOVATION_DESCRIPTION.categories').bind(this),
    dateFilters: this.addDateFilters.bind(this),
    diseasesAndConditions: this.addJsonFilter('document.UNDERSTANDING_OF_NEEDS.diseasesConditionsImpact').bind(this),
    engagingOrganisations: this.addJsonFilter('engagingOrganisations', { fieldSelector: 'organisationId' }).bind(this),
    engagingUnits: this.addJsonFilter('engagingUnits', { fieldSelector: 'unitId' }).bind(this),
    groupedStatuses: this.addJsonFilter('groupedStatus').bind(this),
    involvedAACProgrammes: this.addJsonFilter('document.INNOVATION_DESCRIPTION.involvedAACProgrammes').bind(this),
    keyHealthInequalities: this.addJsonFilter('document.UNDERSTANDING_OF_NEEDS.keyHealthInequalities').bind(this),
    locations: this.addLocationFilter.bind(this),
    search: this.addSearchFilter.bind(this),
    // suggestedOnly: this.addSuggestedOnlyFilter.bind(this),
    supportStatuses: this.addSupportFilter.bind(this)
  };

  // NOTE: Do we keep the search by email on admin?
  private addSearchFilter(_domainContext: DomainContextType, query: SearchQueryBody, search: string): void {
    const priorities = [
      ['document.INNOVATION_DESCRIPTION.name', 'owner.companyName'],
      ['document.INNOVATION_DESCRIPTION.description'],
      ['document.UNDERSTANDING_OF_NEEDS.problemsTackled'],
      ['document.UNDERSTANDING_OF_NEEDS.impactDiseaseCondition'],
      ['document.INNOVATION_DESCRIPTION.mainPurpose'],
      ['document.UNDERSTANDING_OF_NEEDS.benefitsOrImpact'],
      ['document.INNOVATION_DESCRIPTION.careSettings', 'document.INNOVATION_DESCRIPTION.otherCareSetting'], // NOTE: not sure if other should enter here.
      ['document.TESTING_WITH_USERS.*'],
      [
        'document.REGULATIONS_AND_STANDARDS.standardsType',
        'document.REGULATIONS_AND_STANDARDS.otherRegulationDescription'
      ],
      ['document.INNOVATION_DESCRIPTION.countryName'],
      ['document.INNOVATION_DESCRIPTION.postcode']
    ];
    const fields = priorities.reverse().flatMap((priority, i) => priority.map(p => `${p}^${i + 1}`));

    if (search) {
      const searchQuery = {
        query_string: {
          query: search,
          fields: [...fields, '*'], // NOTE: should the highlights return the name and document.name?
          fuzziness: 'AUTO'
        }
      };
      query.query.bool.must.push(searchQuery);
      query.highlight = { fields: { '*': { order: 'score', highlight_query: searchQuery } } };
    }
  }

  private addAssignedToMeFilter(domainContext: DomainContextType, query: SearchQueryBody, value: boolean): void {
    if (value) {
      if (isAccessorDomainContextType(domainContext)) {
        query.query.bool.must.push({
          nested: {
            path: 'supports',
            query: {
              term: { 'supports.assignedAccessorsRoleIds': domainContext.currentRole.id }
            }
          }
        });
      }
      if (isAssessmentDomainContextType(domainContext)) {
        query.query.bool.must.push({ term: { 'assessment.assignedToId': domainContext.id } });
      }
    }
  }

  private addJsonFilter(
    filterKey: string,
    options?: { fieldSelector: string } // fieldSelector == nested
  ): (_domainContext: DomainContextType, query: SearchQueryBody, value: string | string[]) => void {
    return (_domainContext: DomainContextType, query: SearchQueryBody, value: string | string[]) => {
      const type = isArray(value) ? 'terms' : 'term';

      if (options?.fieldSelector) {
        query.query.bool.must.push({
          nested: {
            path: filterKey,
            query: { [type]: { [`${filterKey}.${options.fieldSelector}`]: value } }
          }
        });
      } else {
        query.query.bool.must.push({ [type]: { [filterKey]: value } });
      }
    };
  }

  private addLocationFilter(
    _domainContext: DomainContextType,
    query: SearchQueryBody,
    locations: InnovationLocationEnum[]
  ): void {
    const should: QueryDslQueryContainer[] = [];

    if (locations.length) {
      if (locations.includes(InnovationLocationEnum['Based outside UK'])) {
        const predefinedLocations = [
          InnovationLocationEnum.England,
          InnovationLocationEnum['Northern Ireland'],
          InnovationLocationEnum.Scotland,
          InnovationLocationEnum.Wales
        ];

        should.push({
          bool: {
            must_not: [{ terms: { 'document.INNOVATION_DESCRIPTION.countryName.keyword': predefinedLocations } }]
          }
        });
      }
      should.push({
        terms: {
          'document.INNOVATION_DESCRIPTION.countryName.keyword': locations.filter(
            l => l !== InnovationLocationEnum['Based outside UK']
          )
        }
      });
    }

    query.query.bool.must.push({ bool: { should, minimum_should_match: 1 } });
  }

  private addSupportFilter(
    domainContext: DomainContextType,
    query: SearchQueryBody,
    supportStatuses: InnovationSupportStatusEnum[]
  ): void {
    if (supportStatuses.length && isAccessorDomainContextType(domainContext)) {
      query.query.bool.must.push({
        bool: {
          should: [
            {
              nested: {
                path: 'supports',
                query: {
                  bool: {
                    must: [
                      { term: { 'supports.unitId': domainContext.organisation.organisationUnit.id } },
                      { terms: { 'supports.status': supportStatuses } }
                    ]
                  }
                }
              }
            },
            {
              bool: {
                must_not: [
                  {
                    nested: {
                      path: 'supports',
                      query: {
                        term: { 'supports.unitId': domainContext.organisation.organisationUnit.id }
                      }
                    }
                  }
                ]
              }
            }
          ],
          minimum_should_match: 1
        }
      });
    }
  }

  private readonly postHandlers = {
    users: this.withUsers.bind(this)
  };

  private async withUsers(
    results: SearchHit<CurrentElasticSearchDocumentType>[]
  ): ReturnType<DomainUsersService['getUsersMap']> {
    const usersSet = new Set<string>();
    for (const hit of results) {
      const doc = hit._source;
      if (doc) {
        [
          doc.owner.id,
          doc.supports[0]?.updatedBy,
          doc.assessment?.assignedToId,
          ...(doc.engagingUnits?.flatMap(u => u.assignedAccessors.map(a => a.id)) || [])
        ]
          .filter(isString)
          .forEach(u => usersSet.add(u));
      }
    }
    return this.domainService.users.getUsersMap({ userIds: [...usersSet] });
  }

  private addDateFilters(
    _domainContext: DomainContextType,
    query: SearchQueryBody,
    dateFilters: { field: DateFilterFieldsType; startDate?: Date; endDate?: Date }[]
  ): void {
    if (dateFilters && dateFilters.length > 0) {
      for (const filter of dateFilters) {
        let filterKey = !filter.field.includes('.') ? filter.field : filter.field;

        // TODO: handle this date filter differently because of nested
        if (filterKey.includes('support')) {
        }

        const range: QueryDslRangeQuery = {};
        if (filter.startDate) {
          range.gte = filter.startDate.toISOString();
        }

        if (filter.endDate) {
          // This is needed because default TimeStamp for a DD/MM/YYYY date is 00:00:00
          const beforeDateWithTimestamp = new Date(filter.endDate);
          beforeDateWithTimestamp.setDate(beforeDateWithTimestamp.getDate() + 1);

          range.lt = beforeDateWithTimestamp.toISOString();
        }

        query.query.bool.must.push({ range: { [filterKey]: range } });
      }
    }
  }

  private addPermissionGuards(domainContext: DomainContextType, query: SearchQueryBody): void {
    if (domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT) {
      query.query.bool.filter.push({ bool: { must_not: { term: { rawStatus: InnovationStatusEnum.CREATED } } } });
    }

    if (isAccessorDomainContextType(domainContext)) {
      query.query.bool.filter.push({ term: { rawStatus: InnovationStatusEnum.IN_PROGRESS } });
      query.query.bool.filter.push({
        bool: {
          should: [
            { term: { shares: domainContext.organisation.id } },
            {
              nested: {
                path: 'supports',
                query: {
                  term: { 'supports.unitId': domainContext.organisation.organisationUnit.id }
                }
              }
            }
          ],
          minimum_should_match: 1
        }
      });
      query.query.bool.filter.push({
        bool: {
          should: [
            { bool: { must_not: { term: { status: InnovationStatusEnum.ARCHIVED } } } },
            {
              nested: {
                path: 'supports',
                query: {
                  term: { 'supports.unitId': domainContext.organisation.organisationUnit.id }
                }
              }
            }
          ],
          minimum_should_match: 1
        }
      });

      if (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR) {
        query.query.bool.filter.push({
          nested: {
            path: 'supports',
            query: {
              bool: {
                must: [
                  { term: { 'supports.unitId': domainContext.organisation.organisationUnit.id } },
                  {
                    terms: {
                      'supports.status': [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.CLOSED]
                    }
                  }
                ]
              }
            }
          }
        });
      }
    }

    if (domainContext.currentRole.role !== ServiceRoleEnum.ADMIN) {
      query.query.bool.filter.push({ bool: { must_not: { term: { rawStatus: InnovationStatusEnum.WITHDRAWN } } } });
    }
  }

  /**
   * Cleanup innovation output to keep only the fields an accessor as access when not shared
   * @param input the input to be cleaned
   * @returns cleanup the response to remove fields that are not shared
   */
  private cleanupAccessorsNotSharedInnovation<T extends object>(input: T): Partial<T> {
    return pick(input, [
      'id',
      'name',
      'statusUpdatedAt',
      'submittedAt',
      'groupedStatus',
      'updatedAt',
      'mainCategory',
      'otherCategoryDescription',
      'countryName',
      'postCode',
      'support'
    ]);
  }
}
