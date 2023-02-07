import { NOSQLConnectionService } from "@innovations/shared/services";
import { CacheService } from "@innovations/shared/services/storage/cache.service";
import { TestDataType, TestsHelper } from "@innovations/shared/tests/tests.helper";
import type { EntityManager } from "typeorm";
import { container } from "../_config";
import type { InnovationSupportsService } from "./innovation-supports.service";
import { InnovationSupportsServiceSymbol, InnovationSupportsServiceType } from "./interfaces";

describe('Innovation supports service test suite', () => {

  let sut: InnovationSupportsService
  let testData: TestDataType;
  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<InnovationSupportsServiceType>(InnovationSupportsServiceSymbol);
    await TestsHelper.init();
    testData = TestsHelper.sampleData;
  });

  beforeEach(async () => {
    jest.spyOn(NOSQLConnectionService.prototype, 'init').mockResolvedValue();
    jest.spyOn(CacheService.prototype, 'init').mockReturnThis();
    em = await TestsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await TestsHelper.releaseQueryRunnerEntityManager(em);
  });


})