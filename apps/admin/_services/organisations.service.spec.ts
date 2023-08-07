import { TestsHelper } from '@admin/shared/tests';

import { container } from '../_config';
import SYMBOLS from './symbols';
import type { EntityManager } from 'typeorm';
import type { OrganisationsService } from './organisations.service';

describe('Admin / _services / organisations service suite', () => {
  let sut: OrganisationsService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<OrganisationsService>(SYMBOLS.OrganisationsService);

    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('inactivateUnit', () => {
    
  });

});
