import type {
  QueryDslBoolQuery,
  QueryDslNestedQuery,
  QueryDslQueryContainer,
  SearchHighlight,
  SearchRequest,
  Sort
} from '@elastic/elasticsearch/lib/api/types';
import { isArray } from 'lodash';

type SearchQueryBody = SearchRequest & { query: SearchBoolQuery };
type SearchBoolQuery = {
  bool: { must: QueryDslQueryContainer[]; must_not: QueryDslQueryContainer[]; filter: QueryDslQueryContainer[] };
};

export class ElasticSearchQueryBuilder {
  private search: SearchQueryBody = {
    sort: [],
    query: { bool: { must: [], must_not: [], filter: [] } }
  };

  constructor(index: string) {
    this.search.index = index;
  }

  addMust(must: QueryDslQueryContainer | QueryDslQueryContainer[]): this {
    const musts = isArray(must) ? must : [must];
    this.search.query.bool.must.push(...musts);
    return this;
  }

  addFilter(filter: QueryDslQueryContainer | QueryDslQueryContainer[]): this {
    const filters = isArray(filter) ? filter : [filter];
    this.search.query.bool.filter.push(...filters);
    return this;
  }

  addHighlight(highlight: SearchHighlight): this {
    this.search.highlight = highlight;
    return this;
  }

  addPagination(params: { from: number; size: number; sort?: Sort }): this {
    this.search.from = params.from;
    this.search.size = params.size;
    this.search.sort = params.sort;
    return this;
  }

  build(): SearchQueryBody {
    return this.search;
  }
}

// Helpers to reduce query boilerplate
export function createNestedQuery(path: string, query: QueryDslQueryContainer): { nested: QueryDslNestedQuery } {
  return { nested: { path, query } };
}

export function createOrQuery(queries: QueryDslQueryContainer[]): { bool: QueryDslBoolQuery } {
  return { bool: { should: queries, minimum_should_match: 1 } };
}

export function createBoolQuery(params: {
  must?: QueryDslQueryContainer | QueryDslQueryContainer[];
  mustNot?: QueryDslQueryContainer | QueryDslQueryContainer[];
  should?: QueryDslQueryContainer | QueryDslQueryContainer[];
  filter?: QueryDslQueryContainer | QueryDslQueryContainer[];
}): { bool: QueryDslBoolQuery } {
  return {
    bool: { must: params.must, must_not: params.mustNot, should: params.should, filter: params.filter }
  };
}
