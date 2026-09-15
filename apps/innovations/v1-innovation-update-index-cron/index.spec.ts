import azureFunction from ".";

import { RedisService } from "@innovations/shared/services";
import { TestsHelper } from "@innovations/shared/tests";
import { SearchService } from "../_services/search.service";

const testsHelper = new TestsHelper();

beforeAll(async () => {
  await testsHelper.init();
});

const popFromSetSpy = jest.spyOn(RedisService.prototype, "popFromSet");
const upsertDocumentSpy = jest.spyOn(SearchService.prototype, "upsertDocument");
const addToSetSpy = jest.spyOn(RedisService.prototype, "addToSet");

beforeEach(() => {
  popFromSetSpy.mockReset().mockResolvedValueOnce("1111").mockResolvedValueOnce(null);
  upsertDocumentSpy.mockReset().mockResolvedValue();
  addToSetSpy.mockReset().mockResolvedValue();
});

describe("v1-innovation-update-index-cron", () => {
  it("should reindex documents that are on redis", async () => {
    await azureFunction();
    expect(popFromSetSpy).toHaveBeenCalledTimes(2);
    expect(upsertDocumentSpy).toHaveBeenCalledTimes(1);
  });

  it("should add to redis set again in case of error", async () => {
    upsertDocumentSpy.mockRejectedValue(new Error());
    await expect(azureFunction()).rejects.toThrow();
    expect(popFromSetSpy).toHaveBeenCalledTimes(1);
    expect(addToSetSpy).toHaveBeenCalledTimes(1);
  });
});
