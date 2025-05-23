import type {
  QueryDslQueryContainer,
  QueryDslRangeQuery,
  SearchHit,
  SearchTotalHits,
  Sort,
  SortResults
} from '@elastic/elasticsearch/lib/api/types';
import { ES_ENV } from '@innovations/shared/config';
import type { InnovationListView } from '@innovations/shared/entities';
import { InnovationStatusEnum, InnovationSupportStatusEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import {
  ConflictError,
  ElasticSearchErrorsEnum,
  GenericErrorsEnum,
  NotImplementedError
} from '@innovations/shared/errors';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import { csvToString } from '@innovations/shared/helpers/csv.helper';
import { displayName, UserMap } from '@innovations/shared/models/user.map';
import type { CurrentElasticSearchDocumentType } from '@innovations/shared/schemas/innovation-record';
import type { DomainService, ElasticSearchService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import {
  DomainContextType,
  isAccessorDomainContextType,
  isAssessmentDomainContextType
} from '@innovations/shared/types';
import { inject, injectable } from 'inversify';
import { groupBy, isArray, isString, mapValues, pick } from 'lodash';
import { InnovationLocationEnum } from '../_enums/innovation.enums';
import { boolQuery, ElasticSearchQueryBuilder, nestedQuery, orQuery } from '../_helpers/es-query-builder.helper';
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
  | 'areas'
  | 'assessment.id'
  | 'assessment.updatedAt'
  | 'assessment.assignedTo'
  | 'assessment.isExempt'
  | 'support.id'
  | 'support.status'
  | 'support.updatedAt'
  | 'support.updatedBy'
  | 'support.closeReason'
  | 'owner.id'
  | 'owner.name'
  | 'owner.companyName'
  | 'owner.email'
  | 'suggestion.suggestedBy';

// In advanced search the suggestedOnly applies not to a state as the innovation list but to the suggestions as it
// affects other innovations besides "UNASSIGNED". This should probably be changed in the future and removed and focus
// on support statuses
type SearchFilters = InnovationListFilters & { suggestedOnly: boolean };

// Translations maps the IR schema in elastic search to the one used in the UI
// NOTE: if the new flat document (IR versioning) is implemented this will not be needed anymore but right now we have
//       different structure between the two
const translations = new Map([
  ['name', ['document', 'INNOVATION_DESCRIPTION', 'name']],
  ['careSettings', ['document', 'INNOVATION_DESCRIPTION', 'careSettings']],
  ['otherCareSetting', ['document', 'INNOVATION_DESCRIPTION', 'otherCareSetting']],
  ['categories', ['document', 'INNOVATION_DESCRIPTION', 'categories']],
  ['countryName', ['document', 'INNOVATION_DESCRIPTION', 'countryName']],
  ['diseasesAndConditions', ['document', 'UNDERSTANDING_OF_NEEDS', 'diseasesConditionsImpact']],
  ['mainCategory', ['document', 'INNOVATION_DESCRIPTION', 'mainCategory']],
  ['otherCategoryDescription', ['document', 'INNOVATION_DESCRIPTION', 'otherCategoryDescription']],
  ['postcode', ['document', 'INNOVATION_DESCRIPTION', 'postcode']],
  ['involvedAACProgrammes', ['document', 'INNOVATION_DESCRIPTION', 'involvedAACProgrammes']],
  ['keyHealthInequalities', ['document', 'UNDERSTANDING_OF_NEEDS', 'keyHealthInequalities']],
  ['areas', ['document', 'INNOVATION_DESCRIPTION', 'areas']],
  ['description', ['document', 'INNOVATION_DESCRIPTION', 'description']] // This field is only required because of the export CSV as it's not shown in the cards.
]);

/**
 * Fields priorities for Elastic, already adds the ^ notation.
 * The first step is reverse since the name needs more boost than postcode.
 */
const priorities = [
  ['document.INNOVATION_DESCRIPTION.name', 'owner.companyName'],
  ['document.INNOVATION_DESCRIPTION.description'],
  ['document.UNDERSTANDING_OF_NEEDS.problemsTackled'],
  ['document.UNDERSTANDING_OF_NEEDS.impactDiseaseCondition'],
  ['document.INNOVATION_DESCRIPTION.mainPurpose'],
  ['document.UNDERSTANDING_OF_NEEDS.benefitsOrImpact'],
  ['document.INNOVATION_DESCRIPTION.careSettings', 'document.INNOVATION_DESCRIPTION.otherCareSetting'],
  ['document.TESTING_WITH_USERS.involvedUsersDesignProcess'],
  ['document.REGULATIONS_AND_STANDARDS.standardsType', 'document.REGULATIONS_AND_STANDARDS.otherRegulationDescription'],
  ['document.INNOVATION_DESCRIPTION.countryName'],
  ['document.INNOVATION_DESCRIPTION.postcode']
]
  .reverse()
  .flatMap((priority, i) => priority.map(p => `${p}^${i + 1}`));

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
    const data = await this.domainService.innovations.getESDocumentsInformation(innovationId);
    if (data) {
      await this.esService.upsertDocument(this.index, data);
    }
  }

  /**
   * Responsible for getting the innovation list with elastic search.
   * Currently accepts the exact same fields, filters, and pagination params as the innovation list
   * from sql, but is way more limited in functionality and there are some that are not working.
   *
   * TODO:
   * Make sure that it implements the exact same functionality as the innovationList (currently just
   * implements what is needed for the advanced search).
   * Create an abstraction that both lists implements (e.g., strategy pattern), this way we make sure
   * they implement the same behaviour with the specifics of ES and SQL abstracted away.
   */
  async getDocuments<S extends SearchInnovationListSelectType>(
    domainContext: DomainContextType,
    params: {
      fields: S[];
      pagination: PaginationQueryParamsType<any>;
      filters?: InnovationListFilters;
      pit?: { id: string; keep_alive: string };
      searchAfter?: SortResults;
    }
  ): Promise<{ count: number; data: unknown[]; pitId?: string }> {
    if (!params.fields.length) {
      return { count: 0, data: [] };
    }
    const searchQuery = new ElasticSearchQueryBuilder(this.index);

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
          case 'owner.email':
          case 'owner.name':
          case 'support.updatedBy':
            throw new NotImplementedError(GenericErrorsEnum.NOT_IMPLEMENTED_ERROR, {
              message: 'Sort by name is not allowed'
            });

          // add here the ones that are from the document and are in the "filters" object
          case 'countryName':
          case 'name': {
            sort.push({ [`filters.${key}`]: { order } });
            break;
          }

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
            break;

          default:
            // Assessment is not nested, can be handled this way as-well.
            if (!key.includes('.') || (key.includes('.') && key.includes('assessment'))) {
              sort.push({ [key]: { order } });
            }
        }
      }
    });
    searchQuery.addPagination({ from: params.pagination.skip, size: params.pagination.take, sort });

    const searchBody = searchQuery.build();

    if (params.pit) {
      // PIT searches use the pit instead of the index
      searchBody.pit = params.pit;
      searchBody.index = undefined;

      // only using the searchAfter in the PIT but probably should be used in the normal search as well
      if (params.searchAfter) {
        searchBody.search_after = params.searchAfter;
      }
    }

    const response = await this.esService.client.search<CurrentElasticSearchDocumentType>(searchBody);

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
        for (const [key, value] of Object.entries(fieldGroups)) {
          if (key in this.displayHandlers) {
            const handler = this.displayHandlers[key as keyof typeof this.displayHandlers];
            if (handler) {
              res[key] = handler(domainContext, doc, value as any[], handlerMaps); // this any should be safe since it comes from the groupBy
            }
          } else if (translations.has(key)) {
            res[key] = this.translate(doc, key);
          } else {
            res[key] = key === 'id' ? hit._id : doc[key as keyof CurrentElasticSearchDocumentType];
          }
        }

        // Extra postProcessing the items if required (this might become handlers in the future, keeping a function for now)
        return isAccessorDomainContextType(domainContext) && !doc.shares?.includes(domainContext.organisation.id)
          ? this.cleanupAccessorsNotSharedInnovation(res)
          : res;
      }),
      ...(response.pit_id && {
        pitId: response.pit_id,
        searchAfter: response.hits.hits?.[response.hits.hits.length - 1]?.sort
      })
    };
  }

  async bulkGetDocuments<S extends SearchInnovationListSelectType>(
    domainContext: DomainContextType,
    params: {
      fields: S[];
      filters?: InnovationListFilters;
    }
  ): Promise<{ count: number; data: unknown[] }> {
    const keepAlive = '1m';
    const pageSize = 50;
    let pitId = (await this.esService.client.openPointInTime({ index: this.index, keep_alive: keepAlive })).id;
    let page: { count: number; data: unknown[]; pit?: string; searchAfter?: SortResults };
    let searchAfter: SortResults | undefined = undefined;

    const data = [];

    do {
      page = await this.getDocuments(domainContext, {
        fields: params.fields,
        pagination: { skip: 0, take: pageSize, order: { uniqueId: 'ASC' } },
        filters: params.filters,
        pit: { id: pitId, keep_alive: keepAlive },
        searchAfter: searchAfter
      });

      if (page.pit) {
        pitId = page.pit;
      }

      // Failsafe to avoid infinite loop in case something odd happens
      if (searchAfter === page.searchAfter) {
        break;
      }
      searchAfter = page.searchAfter;
      data.push(...page.data);
    } while (page.data.length >= pageSize);

    if (data.length < page.count) {
      throw new ConflictError(ElasticSearchErrorsEnum.ES_SEARCH_UNEXPECTED_RESULT_SIZE_ERROR, {
        details: { count: data.length, total: page.count }
      });
    }

    await this.esService.client.closePointInTime({ id: pitId });

    return {
      count: page.count,
      data: data
    };
  }

  async getDocumentsCSV<S extends SearchInnovationListSelectType>(
    domainContext: DomainContextType,
    params: {
      fields: S[];
      filters?: InnovationListFilters;
    }
  ): Promise<string> {
    const rawData = await this.bulkGetDocuments(domainContext, params);

    const header = params.fields;
    const data = rawData.data.map((item: any) =>
      header.map(field => {
        let value = field.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), item);
        if (value === null || value === undefined) return '';
        value = JSON.stringify(value);
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        return value;
      })
    );

    return csvToString([header, ...data]);
  }

  private displayHandlers: {
    [k in 'assessment' | 'support' | 'suggestion' | 'owner' | 'engagingUnits']: (
      domainContext: DomainContextType,
      item: CurrentElasticSearchDocumentType,
      fields: k extends InnovationListJoinTypes ? InnovationListChildrenType<k>[] : string[],
      postHandlers: { [k in keyof typeof this.postHandlers]: Awaited<ReturnType<(typeof this.postHandlers)[k]>> }
    ) => Partial<InnovationListFullResponseType[k]>;
  } = {
    assessment: this.displayAssessment.bind(this),
    engagingUnits: this.displayEngagingUnits.bind(this),
    support: this.displaySupport.bind(this),
    owner: this.displayOwner.bind(this),
    suggestion: this.displaySuggestion.bind(this)
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
          res[field] = item.assessment?.assignedToId
            ? extra.users.getDisplayName(item.assessment?.assignedToId, ServiceRoleEnum.ASSESSMENT)
            : null;
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
          unit.assignedAccessors?.map(({ userId: id }) => ({
            id,
            name: extra.users.getDisplayName(id)
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
      const support = item.supports?.find(s => s.unitId === domainContext.organisation.organisationUnit.id);
      if (!support) return null;

      const updatedBy = extra.users?.get(support.updatedBy);
      const name =
        // Ensuring that updatedBy is always innovator if the innovation is archived or not shared
        item.status === InnovationStatusEnum.ARCHIVED ||
        !item.shares?.length ||
        // if the user has the innovator role (currently exclusive) as the updatedBy is not a role but user id and we can't
        // distinguish if there's multiple roles for the same user
        updatedBy?.roles.some(r => r.role === ServiceRoleEnum.INNOVATOR)
          ? 'Innovator'
          : displayName(updatedBy);

      // support is handled differently to remove the nested array since it's only 1 element in this case
      return {
        ...(fields.includes('id') && { id: support.id }),
        ...(fields.includes('status') && { status: support.status }),
        ...(fields.includes('updatedAt') && { updatedAt: support.updatedAt }),
        ...(fields.includes('updatedBy') && { updatedBy: name }),
        ...(fields.includes('closeReason') && { closeReason: support.closeReason })
      };
    }

    return null;
  }

  private displaySuggestion(
    domainContext: DomainContextType,
    item: CurrentElasticSearchDocumentType,
    fields: InnovationListChildrenType<'suggestion'>[],
    _extra: PickHandlerReturnType<typeof this.postHandlers, 'users'>
  ): Partial<InnovationListFullResponseType['suggestion']> {
    if (isAccessorDomainContextType(domainContext)) {
      const suggestions = new Set(
        item.suggestions
          ?.filter(s => s.suggestedUnitId === domainContext.organisation.organisationUnit.id)
          .flatMap(s => s.suggestedBy) ?? []
      );
      return {
        ...(fields.includes('suggestedBy') && { suggestedBy: Array.from(suggestions.values()) })
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
      ...(fields.includes('name') && { name: extra.users.getDisplayName(item.owner.id, ServiceRoleEnum.INNOVATOR) }),
      ...(fields.includes('email') && { email: extra.users.get(item.owner.id)?.email }),
      ...(fields.includes('companyName') && { companyName: item.owner.companyName ?? null })
    };
  }

  private readonly filtersHandlers: {
    [k in keyof Partial<SearchFilters>]: (
      domainContext: DomainContextType,
      builder: ElasticSearchQueryBuilder,
      value: Required<SearchFilters>[k]
    ) => void | Promise<void>;
  } = {
    assignedToMe: this.addAssignedToMeFilter.bind(this),
    careSettings: this.addGenericFilter('filters.careSettings').bind(this),
    categories: this.addGenericFilter('filters.categories').bind(this),
    dateFilters: this.addDateFilters.bind(this),
    diseasesAndConditions: this.addGenericFilter('filters.diseasesAndConditions').bind(this),
    engagingOrganisations: this.addGenericFilter('engagingOrganisations', { fieldSelector: 'organisationId' }).bind(
      this
    ),
    engagingUnits: this.addGenericFilter('engagingUnits', { fieldSelector: 'unitId' }).bind(this),
    groupedStatuses: this.addGenericFilter('groupedStatus').bind(this),
    involvedAACProgrammes: this.addGenericFilter('filters.involvedAACProgrammes').bind(this),
    keyHealthInequalities: this.addGenericFilter('filters.keyHealthInequalities').bind(this),
    locations: this.addLocationFilter.bind(this),
    search: this.addSearchFilter.bind(this),
    suggestedOnly: this.addSuggestedOnlyFilter.bind(this),
    supportStatuses: this.addSupportFilter.bind(this),
    areas: this.addGenericFilter('filters.areas').bind(this)
  };

  private async addSearchFilter(
    domainContext: DomainContextType,
    builder: ElasticSearchQueryBuilder,
    search: string
  ): Promise<void> {
    if (search) {
      // If we are searching by uniqueIdentifier we match instantly.
      if (search.match(/^INN-\d{4}-\d{4}-\d$/gm)) {
        builder.addMust({ term: { uniqueId: search } });
        return;
      }

      // Admins can search by email (full match search)
      const targetUser =
        domainContext.currentRole.role === ServiceRoleEnum.ADMIN && search.match(/^\S+@\S+$/)
          ? await this.domainService.users.getUserByEmail(search)
          : null;
      if (targetUser?.length && targetUser[0]) {
        builder.addMust({ term: { 'owner.id': targetUser[0].id } });
        return;
      }
      // If is not an email we do the normal search
      // Define individual queries
      const mainQuery: QueryDslQueryContainer = {
        multi_match: {
          type: 'best_fields',
          query: search,
          fields: [...priorities, 'document.*'],
          fuzziness: 0,
          prefix_length: 2,
          tie_breaker: 0.3
          // minimum_should_match: '2<-25% 9<-3'
        }
      };

      const evidencesQuery: QueryDslQueryContainer = {
        nested: {
          path: 'document.evidences',
          query: {
            multi_match: {
              type: 'best_fields',
              query: search,
              fields: ['document.evidences.*'],
              fuzziness: 0,
              prefix_length: 2,
              tie_breaker: 0.3
            }
          }
        }
      };

      const regulationsQuery: QueryDslQueryContainer = {
        nested: {
          path: 'document.REGULATIONS_AND_STANDARDS.standards',
          query: {
            multi_match: {
              type: 'best_fields',
              query: search,
              fields: ['document.REGULATIONS_AND_STANDARDS.standards.*'],
              fuzziness: 0,
              prefix_length: 2,
              tie_breaker: 0.3
            }
          }
        }
      };

      const userTestsQuery: QueryDslQueryContainer = {
        nested: {
          path: 'document.TESTING_WITH_USERS.userTests',
          query: {
            multi_match: {
              type: 'best_fields',
              query: search,
              fields: ['document.TESTING_WITH_USERS.userTests.*'],
              fuzziness: 0,
              prefix_length: 2,
              tie_breaker: 0.3
            }
          }
        }
      };

      const searchQuery = orQuery([mainQuery, evidencesQuery, regulationsQuery, userTestsQuery]);

      // Add the combined query to the builder
      builder.addMust(searchQuery);
      builder.addHighlight({
        order: 'score',
        highlight_query: searchQuery, // the search query is required to avoid highlighting things from the filters
        fields: {
          'owner.companyName': {},
          'document.*': {
            number_of_fragments: 1000 // we require the fragments to show the counts so the default 5 isn't enough
          },
          'document.evidences.*': {
            number_of_fragments: 1000
          },
          'document.REGULATIONS_AND_STANDARDS.standards.*': {
            number_of_fragments: 1000
          },
          'document.TESTING_WITH_USERS.userTests.*': {
            number_of_fragments: 1000
          }
        }
      });
    }
  }

  private addAssignedToMeFilter(
    domainContext: DomainContextType,
    builder: ElasticSearchQueryBuilder,
    value: boolean
  ): void {
    if (value) {
      if (isAccessorDomainContextType(domainContext)) {
        builder.addFilter(
          nestedQuery(
            'supports',
            boolQuery({
              must: [
                { term: { 'supports.assignedAccessorsRoleIds': domainContext.currentRole.id } },
                {
                  terms: {
                    'supports.status': [InnovationSupportStatusEnum.WAITING, InnovationSupportStatusEnum.ENGAGING]
                  }
                }
              ]
            })
          )
        );
      }
      if (isAssessmentDomainContextType(domainContext)) {
        builder.addFilter({ term: { 'assessment.assignedToId': domainContext.id } });
      }
    }
  }

  // All filters need to be of type keyword.
  private addGenericFilter(
    filterKey: string,
    options?: { fieldSelector: string } // fieldSelector == nested
  ): (_domainContext: DomainContextType, builder: ElasticSearchQueryBuilder, value: string | string[]) => void {
    return (_domainContext: DomainContextType, builder: ElasticSearchQueryBuilder, value: string | string[]) => {
      const type = isArray(value) ? 'terms' : 'term';

      if (options?.fieldSelector) {
        builder.addFilter(nestedQuery(filterKey, { [type]: { [`${filterKey}.${options.fieldSelector}`]: value } }));
      } else {
        builder.addFilter({ [type]: { [`${filterKey}`]: value } });
      }
    };
  }

  private addLocationFilter(
    _domainContext: DomainContextType,
    builder: ElasticSearchQueryBuilder,
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

        should.push(
          boolQuery({
            mustNot: { terms: { 'filters.countryName': predefinedLocations } }
          })
        );
      }

      should.push({
        terms: {
          'filters.countryName': locations.filter(l => l !== InnovationLocationEnum['Based outside UK'])
        }
      });
    }
    builder.addFilter(orQuery(should));
  }

  private addSuggestedOnlyFilter(
    domainContext: DomainContextType,
    builder: ElasticSearchQueryBuilder,
    value: boolean
  ): void {
    if (value && isAccessorDomainContextType(domainContext)) {
      builder.addFilter(
        nestedQuery('suggestions', {
          term: { 'suggestions.suggestedUnitId': domainContext.organisation.organisationUnit.id }
        })
      );
    }
  }

  private addSupportFilter(
    domainContext: DomainContextType,
    builder: ElasticSearchQueryBuilder,
    supportStatuses: InnovationSupportStatusEnum[]
  ): void {
    if (supportStatuses.length && isAccessorDomainContextType(domainContext)) {
      const should: QueryDslQueryContainer[] = [];
      const hasUnassigned = supportStatuses.includes(InnovationSupportStatusEnum.UNASSIGNED);

      // This is only valid while we use UNASSIGNED as a status and in common with SUGGESTED
      if (hasUnassigned && !supportStatuses.includes(InnovationSupportStatusEnum.SUGGESTED)) {
        supportStatuses.push(InnovationSupportStatusEnum.SUGGESTED);
      }

      should.push(
        nestedQuery(
          'supports',
          boolQuery({
            must: [
              { term: { 'supports.unitId': domainContext.organisation.organisationUnit.id } },
              { terms: { 'supports.status': supportStatuses } }
            ]
          })
        )
      );

      if (hasUnassigned) {
        should.push(
          boolQuery({
            mustNot: nestedQuery('supports', {
              term: { 'supports.unitId': domainContext.organisation.organisationUnit.id }
            })
          })
        );
      }

      builder.addFilter(orQuery(should));
    }
  }

  private addDateFilters(
    _domainContext: DomainContextType,
    builder: ElasticSearchQueryBuilder,
    dateFilters: { field: DateFilterFieldsType; startDate?: Date; endDate?: Date }[]
  ): void {
    if (dateFilters && dateFilters.length > 0) {
      for (const filter of dateFilters) {
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

        if (filter.field === 'support.updatedAt') {
          builder.addFilter(nestedQuery('supports', { range: { 'supports.updatedAt': range } }));
        } else {
          builder.addFilter({ range: { [filter.field]: range } });
        }
      }
    }
  }

  private readonly postHandlers = {
    users: this.withUsers.bind(this)
  };

  private async withUsers(results: SearchHit<CurrentElasticSearchDocumentType>[]): Promise<UserMap> {
    const usersSet = new Set<string>();
    for (const hit of results) {
      const doc = hit._source;
      if (doc) {
        [
          doc.owner?.id,
          doc.supports?.[0]?.updatedBy,
          doc.assessment?.assignedToId,
          ...(doc.engagingUnits?.flatMap(u => (u.assignedAccessors ?? []).map(a => a.userId)) ?? [])
        ]
          .filter(isString)
          .forEach(u => usersSet.add(u));
      }
    }
    return this.domainService.users.getUsersMap({ userIds: [...usersSet] });
  }

  private addPermissionGuards(domainContext: DomainContextType, builder: ElasticSearchQueryBuilder): void {
    if (domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT) {
      builder.addFilter({ exists: { field: 'submittedAt' } });
    }

    if (isAccessorDomainContextType(domainContext)) {
      const isShared = { term: { shares: domainContext.organisation.id } };
      const hasSupport = nestedQuery('supports', {
        term: { 'supports.unitId': domainContext.organisation.organisationUnit.id }
      });
      const isArchived = boolQuery({ mustNot: { term: { status: InnovationStatusEnum.ARCHIVED } } });

      // Had an assessment completed
      builder.addFilter({ term: { hasBeenAssessed: true } });
      // Was shared OR supported
      builder.addFilter(orQuery([isShared, hasSupport]));
      // Is currently archived OR supported
      builder.addFilter(orQuery([isArchived, hasSupport]));

      if (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR) {
        builder.addFilter(
          nestedQuery(
            'supports',
            boolQuery({
              must: [
                { term: { 'supports.unitId': domainContext.organisation.organisationUnit.id } },
                {
                  terms: {
                    'supports.status': [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.CLOSED]
                  }
                }
              ]
            })
          )
        );
      }
    }

    if (domainContext.currentRole.role !== ServiceRoleEnum.ADMIN) {
      builder.addFilter(boolQuery({ mustNot: { term: { status: InnovationStatusEnum.WITHDRAWN } } }));
    }
  }

  /**
   * Cleanup innovation output to keep only the fields an accessor as access when not shared
   * @param input the input to be cleaned
   * @returns cleanup the response to remove fields that are not shared
   */
  private cleanupAccessorsNotSharedInnovation<T extends object & { highlights?: object }>(input: T): Partial<T> {
    const highlights = input.highlights && pick(input.highlights, 'document.INNOVATION_DESCRIPTION.name');
    return {
      ...pick(input, [
        'id',
        'uniqueId',
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
      ]),
      ...(highlights && { highlights })
    };
  }

  private translate(doc: CurrentElasticSearchDocumentType, key: string): string | null {
    if (!translations.has(key)) return null;
    return translations.get(key)!.reduce((o, k) => (o ? o[k] : null), doc as any);
  }
}
