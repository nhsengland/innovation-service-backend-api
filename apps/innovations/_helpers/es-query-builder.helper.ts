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

/**
 * Creates a nested query for ElasticSearch.
 *
 * This function helps to construct a nested query, which allows you to search within an array of objects
 * in your ElasticSearch documents (e.g., supports).
 *
 * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-nested-query.html Documentation}
 */
export function nestedQuery(path: string, query: QueryDslQueryContainer): { nested: QueryDslNestedQuery } {
  return { nested: { path, query } };
}

/**
 * Creates an OR query using ElasticSearch.
 *
 * This is done by using a bool should query with minimum_should_match of 1 to replicate
 * the OR condition. This is useful for when we want to create a OR clause:
 *
 * @example
 * isShared || hasSupport === orQuery([isShared, hasSupport])
 */
export function orQuery(queries: QueryDslQueryContainer[]): { bool: QueryDslBoolQuery } {
  return { bool: { should: queries, minimum_should_match: 1 } };
}

/**
 * Creates a bool query using ElasticSearch.
 *
 * This function helps to construct a bool query, which combines multiple query clauses using the `must`, `must_not`, `should`, and `filter` parameters.
 *
 * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html Documentation}
 */
export function boolQuery(params: {
  must?: QueryDslQueryContainer | QueryDslQueryContainer[];
  mustNot?: QueryDslQueryContainer | QueryDslQueryContainer[];
  should?: QueryDslQueryContainer | QueryDslQueryContainer[];
  filter?: QueryDslQueryContainer | QueryDslQueryContainer[];
}): { bool: QueryDslBoolQuery } {
  return {
    bool: { must: params.must, must_not: params.mustNot, should: params.should, filter: params.filter }
  };
}

/**
 * Escapes ES special chars and adds fuziness to input (1 permutation).
 *
 * Currently not in use, this was required for query_string queries.
 *
 * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_reserved_characters Documentation}
 * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#query-string-fuzziness Documentation}
 */
export function escapeElasticSpecialCharsAndFuzziness(input: string): string {
  // Remove < and > characters
  input = input.trim().replace(/[<>]/g, '');
  // Escape other special characters
  const specialChars = /[+\-=&|!(){}[\]^"~*?:\\/]/g;
  const escaped = input.replace(specialChars, '\\$&');

  return escaped
    .split(' ')
    .map(f => f + '~1')
    .join(' ');
}
