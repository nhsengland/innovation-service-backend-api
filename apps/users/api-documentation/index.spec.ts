import index from '.';

describe('api-documentation', () => {
  it('should return the OpenAPI spec', () => {
    expect(index).toBeDefined();
  });
});
