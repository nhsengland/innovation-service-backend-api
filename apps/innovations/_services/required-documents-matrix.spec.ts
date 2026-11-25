import "reflect-metadata";
jest.mock("./base.service", () => ({ BaseService: class {} }));
import { InnovationFileService } from "./innovation-file.service";
import { InnovationSectionsService } from "./innovation-sections.service";
import { InnovationsService } from "./innovations.service";
import { CurrentCatalogTypes } from "@innovations/shared/schemas/innovation-record";

const states = [
  "ready",
  "legacy_allowed",
  "scanning",
  "delayed",
  "rejected",
  "scan_failed",
  "not_scanned",
  "removed",
  "unavailable"
];
const sections = ["EVIDENCE_OF_EFFECTIVENESS", "REGULATIONS_AND_STANDARDS"];

function fixture(state: string, section: string, status = "SUBMITTED"): any {
  const documents = {
    getInnovationDocument: jest.fn().mockResolvedValue({
      version: 14,
      EVIDENCE_OF_EFFECTIVENESS: { hasEvidence: section === sections[0] ? "YES" : "NOT_YET" },
      REGULATIONS_AND_STANDARDS: { standards: section === sections[1] ? [{ type: "DTAC", hasMet: "YES" }] : [] },
      evidences: [{ id: "ev", description: "Clinical trial", evidenceSubmitType: "OTHER_EFFECTIVENESS" }]
    }),
    syncDocumentVersions: jest.fn().mockResolvedValue(undefined)
  };
  const file = {
    id: "file",
    storageId: "blob",
    filename: "evidence.csv",
    contextType: section === sections[0] ? "INNOVATION_EVIDENCE" : "INNOVATION_REGULATIONS",
    contextId: section === sections[0] ? "ev" : "DTAC"
  };
  const storage = {
    getDownloadAccessForFiles: jest
      .fn()
      .mockResolvedValue(
        new Map([["blob", { scanState: state, canDownload: ["ready", "legacy_allowed"].includes(state) }]])
      )
  };
  const innovation = {
    id: "innovation",
    status: "CREATED",
    sections: CurrentCatalogTypes.InnovationSections.map(key => ({
      id: key,
      section: key,
      status: key === section ? status : "SUBMITTED"
    }))
  };
  const query: any = {
    leftJoinAndSelect: () => query,
    where: () => query,
    andWhere: () => {
      innovation.sections = innovation.sections.filter(s => s.section === section);
      return query;
    },
    getOne: async () => innovation
  };
  const manager: any = {
    createQueryBuilder: () => query,
    find: jest.fn().mockResolvedValue([file]),
    save: jest.fn(async (_entity, data) => data),
    update: jest.fn().mockResolvedValue({ affected: 1 })
  };
  manager.transaction = jest.fn(async callback => callback(manager));
  const validator = new InnovationFileService(
    {} as never,
    storage as never,
    {} as never,
    {} as never,
    documents as never
  );
  const sectionService = Object.assign(Object.create(InnovationSectionsService.prototype), {
    innovationFileService: validator
  });
  const notifier = { send: jest.fn().mockResolvedValue(true) };
  const innovationService = Object.assign(Object.create(InnovationsService.prototype), {
    innovationFileService: validator,
    innovationDocumentService: documents,
    domainService: { innovations: { addActivityLog: jest.fn().mockResolvedValue(undefined) } },
    notifierService: notifier
  });
  return { manager, sectionService, innovationService, notifier };
}

describe("required document status matrix through real service methods", () => {
  for (const section of sections) {
    for (const state of states) {
      const allowed = ["ready", "legacy_allowed"].includes(state);
      it.each(["DRAFT", "SUBMITTED"])(`${section} / ${state} / section %s`, async status => {
        const f = fixture(state, section, status);
        const result = f.sectionService.submitInnovationSection({ id: "user" }, "innovation", section, f.manager);
        if (allowed) await expect(result).resolves.toEqual({ id: section });
        else {
          await expect(result).rejects.toMatchObject({
            name: "I.0036",
            details: { files: [expect.objectContaining({ section, scanState: state, filename: "evidence.csv" })] }
          });
          expect(f.manager.transaction).not.toHaveBeenCalled();
        }
      });
      it(`${section} / ${state} / final submission with all sections complete`, async () => {
        const f = fixture(state, section);
        const result = f.innovationService.submitInnovation({ id: "user" }, "innovation", f.manager);
        if (allowed) {
          await expect(result).resolves.toEqual({ id: "innovation", status: "WAITING_NEEDS_ASSESSMENT" });
          expect(f.manager.update).toHaveBeenCalled();
          expect(f.notifier.send).toHaveBeenCalledTimes(1);
        } else {
          await expect(result).rejects.toMatchObject({ name: "I.0036" });
          expect(f.manager.transaction).not.toHaveBeenCalled();
          expect(f.notifier.send).not.toHaveBeenCalled();
        }
      });
    }
  }
});
