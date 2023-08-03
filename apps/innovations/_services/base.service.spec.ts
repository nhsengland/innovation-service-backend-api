import { container } from '../_config';

import type { SQLConnectionService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import { TestsHelper } from '@innovations/shared/tests';
import { BaseService } from './base.service';

describe('Innovations Base Service Suite', () => {
  let sut: BaseService;

  const testsHelper = new TestsHelper();

  beforeAll(async () => {
    sut = new BaseService();
    await testsHelper.init();
  });

  describe('getters', () => {
    it('should return the logger', () => {
      expect(sut.logger).toBe(container.get(SHARED_SYMBOLS.LoggerService));
    });

    it('should return the sqlConnection', () => {
      expect(sut.sqlConnection).toBe(
        container.get<SQLConnectionService>(SHARED_SYMBOLS.SQLConnectionService).getConnection()
      );
    });
  });
});
