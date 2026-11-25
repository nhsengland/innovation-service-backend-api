import "reflect-metadata";
jest.mock("./base.service", () => ({ BaseService: class {} }));
import { InnovationAssessmentsService } from "./innovation-assessments.service";
import { InnovationErrorsEnum, UnprocessableEntityError } from "@innovations/shared/errors";

function fixture(status = "IN_PROGRESS", role = "INNOVATOR"): any {
  const query = {
    select: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis()
  };
  const manager: any = {
    createQueryBuilder: (_entity: unknown, alias: string) => ({
      ...query,
      getOne: jest
        .fn()
        .mockResolvedValue(
          alias === "innovation"
            ? { id: "innovation", status, owner: { id: "owner" }, innovationSupports: [] }
            : { id: "previous", majorVersion: 1 }
        )
    }),
    save: jest.fn(async (_entity, data) => ({ ...data, id: data.majorVersion ? "assessment" : "request" })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    query: jest.fn().mockResolvedValue([])
  };
  manager.transaction = jest.fn(async callback => callback(manager));
  const files = { validateRequiredDocuments: jest.fn().mockResolvedValue(undefined) };
  const document = { syncDocumentVersions: jest.fn().mockResolvedValue(undefined) };
  const notifier = { send: jest.fn().mockResolvedValue(true) };
  const service = Object.assign(Object.create(InnovationAssessmentsService.prototype), {
    innovationFileService: files,
    documentService: document,
    notifierService: notifier,
    domainService: { innovations: { addActivityLog: jest.fn().mockResolvedValue(undefined) } }
  });
  const submit = (): Promise<unknown> =>
    service.createInnovationReassessment(
      { id: "owner", currentRole: { role } },
      "innovation",
      { description: "Test", reassessmentReason: ["NO_SUPPORT"], whatSupportDoYouNeed: "Test support" },
      manager
    );
  return { files, document, notifier, manager, submit };
}

describe("reassessment required-document guard", () => {
  it.each(["IN_PROGRESS", "ARCHIVED"])("blocks %s reassessment before any writes or notifications", async status => {
    const f = fixture(status);
    const error = new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_REQUIRED_DOCUMENTS_INVALID, {
      details: { files: [{ section: "EVIDENCE_OF_EFFECTIVENESS", filename: "trial.csv", scanState: "rejected" }] }
    });
    f.files.validateRequiredDocuments.mockRejectedValue(error);
    await expect(f.submit()).rejects.toBe(error);
    expect(f.files.validateRequiredDocuments).toHaveBeenCalledWith("innovation", undefined, f.manager);
    expect(f.manager.transaction).not.toHaveBeenCalled();
    expect(f.document.syncDocumentVersions).not.toHaveBeenCalled();
    expect(f.notifier.send).not.toHaveBeenCalled();
  });
  it.each([
    ["IN_PROGRESS", "INNOVATOR"],
    ["ARCHIVED", "INNOVATOR"],
    ["IN_PROGRESS", "ASSESSMENT"]
  ])("preserves valid reassessment for %s / %s", async (status, role) => {
    const f = fixture(status, role);
    await expect(f.submit()).resolves.toEqual({ assessment: { id: "assessment" }, reassessment: { id: "request" } });
    expect(f.files.validateRequiredDocuments).toHaveBeenCalledTimes(1);
    expect(f.document.syncDocumentVersions).toHaveBeenCalledTimes(1);
    expect(f.notifier.send).toHaveBeenCalledTimes(1);
  });
  it("preserves invalid-status validation before checking documents", async () => {
    const f = fixture("CREATED");
    await expect(f.submit()).rejects.toMatchObject({
      name: InnovationErrorsEnum.INNOVATION_CANNOT_REQUEST_REASSESSMENT
    });
    expect(f.files.validateRequiredDocuments).not.toHaveBeenCalled();
  });
  it("rechecks documents on a retry", async () => {
    const f = fixture();
    f.files.validateRequiredDocuments.mockRejectedValueOnce(new Error("pending")).mockResolvedValueOnce(undefined);
    await expect(f.submit()).rejects.toThrow("pending");
    await expect(f.submit()).resolves.toBeDefined();
    expect(f.files.validateRequiredDocuments).toHaveBeenCalledTimes(2);
  });
});
