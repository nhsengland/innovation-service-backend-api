import type { QueryDslQueryContainer, SearchHighlight } from '@elastic/elasticsearch/lib/api/types';
import { randText } from '@ngneat/falso';
import { boolQuery, ElasticSearchQueryBuilder, nestedQuery, orQuery } from './es-query-builder.helper';

describe('innovations / _helpers / es-query-builder suite', () => {
  const query: QueryDslQueryContainer = { term: { test: randText() } };

  describe('ElasticSearchQueryBuilder', () => {
    let builder: ElasticSearchQueryBuilder;
    const indexName = 'ir-documents-test';

    beforeEach(() => {
      builder = new ElasticSearchQueryBuilder(indexName);
    });

    it('should create helper and add the index name', () => {
      expect(builder.build().index).toBe(indexName);
    });

    it('should add a single must clause', () => {
      builder.addMust(query);
      expect(builder.build().query.bool.must).toStrictEqual([query]);
    });

    it('should add an array of must clauses', () => {
      builder.addMust([query, query]);
      expect(builder.build().query.bool.must).toStrictEqual([query, query]);
    });

    it('should add a filter clause', () => {
      builder.addFilter(query);
      expect(builder.build().query.bool.filter).toStrictEqual([query]);
    });

    it('should add an array of filter clauses', () => {
      builder.addFilter([query, query]);
      expect(builder.build().query.bool.filter).toStrictEqual([query, query]);
    });

    it('should highlight to query', () => {
      const highlight: SearchHighlight = { fields: {} };
      builder.addHighlight(highlight);
      expect(builder.build().highlight).toStrictEqual(highlight);
    });

    it('should pagination to query', () => {
      const params = { from: 1, size: 1 };
      builder.addPagination(params);
      expect(builder.build().from).toBe(params.from);
      expect(builder.build().size).toBe(params.size);
    });
  });

  describe('Helper functions', () => {
    it('should create a nestedQuery', () => {
      const nested = nestedQuery('supports', query);
      expect(nested).toStrictEqual({ nested: { path: 'supports', query } });
    });

    it('should create a orQuery', () => {
      const firstCondition = query;
      const secondCondition = query;
      const orQueryResult = orQuery([firstCondition, secondCondition]);
      expect(orQueryResult).toStrictEqual({
        bool: {
          should: [firstCondition, secondCondition],
          minimum_should_match: 1
        }
      });
    });

    it('should create a boolQuery', () => {
      const boolQueryResult = boolQuery({ must: [query], filter: query });
      expect(boolQueryResult).toEqual({ bool: { must: [query], filter: query } });
    });
  });
});
