import { ExcelInnovationService } from "./excel-innovation.service";
import { SchemaModel } from "@innovations/shared/models/schema-engine/schema.model";
import { requiredSectionsAndQuestions } from "@innovations/shared/schemas/innovation-record";

describe("ExcelInnovationService", () => {
  let sut: ExcelInnovationService;
  let irSchemaService: any;
  let excelExportService: any;
  let excelImportService: any;
  let innovationsService: any;
  let sectionsService: any;

  // Clear required sections to allow using a minimal mock schema
  requiredSectionsAndQuestions.clear();

  const mockSubSection = {
    id: "SEC_1",
    title: "Section 1 Title",
    steps: [
      {
        questions: [
          { id: "Q_REQ", label: "Q Req", dataType: "text", validations: { isRequired: true } },
          {
            id: "Q_COND_PARENT",
            label: "Q Parent",
            dataType: "radio-group",
            items: [
              { id: "yes", label: "Yes" },
              { id: "no", label: "No" }
            ]
          }
        ]
      },
      {
        condition: {
          id: "Q_COND_PARENT",
          options: ["yes"]
        },
        questions: [{ id: "Q_COND_CHILD", label: "Q Child", dataType: "text", validations: { isRequired: true } }]
      }
    ]
  };

  const mockSchema: any = {
    version: "1.0",
    schema: {
      sections: [
        {
          id: "SECTION_1",
          title: "Section 1",
          subSections: [
            {
              id: "INNOVATION_DESCRIPTION",
              title: "Registration",
              steps: [
                {
                  questions: [
                    { id: "name", label: "Name", dataType: "text", validations: { isRequired: true } },
                    { id: "description", label: "Description", dataType: "text", validations: { isRequired: true } },
                    { id: "officeLocation", label: "Location", dataType: "text", validations: { isRequired: true } },
                    { id: "Q_REG_OTHER", label: "Other", dataType: "text", validations: { isRequired: true } }
                  ]
                }
              ]
            },
            mockSubSection
          ]
        }
      ]
    }
  };

  // Real SchemaModel to get real Joi validation
  const schemaModel = new SchemaModel(mockSchema.schema);
  schemaModel.runRules();
  mockSchema.model = schemaModel;

  beforeEach(() => {
    irSchemaService = {
      getSchema: jest.fn().mockResolvedValue(mockSchema)
    };
    excelExportService = {};
    excelImportService = {};
    innovationsService = {
      createInnovation: jest.fn().mockResolvedValue({ id: "new-id" })
    };
    sectionsService = {
      updateInnovationSectionInfo: jest.fn().mockResolvedValue({})
    };

    sut = new ExcelInnovationService(
      irSchemaService,
      excelExportService,
      excelImportService,
      innovationsService,
      sectionsService
    );
  });

  describe("importInnovationFromJson", () => {
    const domainContext: any = {};
    const baseReg = {
      name: "Test Name",
      description: "Test Description",
      officeLocation: "London"
    };

    it("should report missing required registration fields", async () => {
      const payload = {
        INNOVATION_DESCRIPTION: {
          ...baseReg
          // Missing Q_REG_OTHER
        }
      };

      const result = await sut.importInnovationFromJson(domainContext, payload);

      expect(result.validationIssues["INNOVATION_DESCRIPTION"]).toContain('"Q_REG_OTHER" is required');
    });

    it("should report missing required subsection fields", async () => {
      const payload = {
        INNOVATION_DESCRIPTION: baseReg,
        SEC_1: { Q_COND_PARENT: "no" } // Missing 'Q_REQ'
      };

      const result = await sut.importInnovationFromJson(domainContext, payload);

      expect(result.validationIssues["SEC_1"]).toContain('"Q_REQ" is required');
      expect(result.validationIssues["SEC_1"]).not.toContain('"Q_COND_CHILD" is required');
    });

    it("should report missing conditional fields when parent condition is met", async () => {
      const payload = {
        INNOVATION_DESCRIPTION: baseReg,
        SEC_1: {
          Q_REQ: "filled",
          Q_COND_PARENT: "yes"
          // Missing 'Q_COND_CHILD'
        }
      };

      const result = await sut.importInnovationFromJson(domainContext, payload);

      expect(result.validationIssues["SEC_1"]).toContain('"Q_COND_CHILD" is required');
    });

    it("should NOT report missing conditional fields when parent condition is NOT met", async () => {
      const payload = {
        INNOVATION_DESCRIPTION: baseReg,
        SEC_1: {
          Q_REQ: "filled",
          Q_COND_PARENT: "no"
          // Missing 'Q_COND_CHILD' - but it's hidden!
        }
      };

      const result = await sut.importInnovationFromJson(domainContext, payload);

      expect(result.validationIssues["SEC_1"]).toBeUndefined();
    });

    it("should identify empty sections and validate their top-level required fields", async () => {
      const payload = {
        INNOVATION_DESCRIPTION: baseReg
        // 'SEC_1' is completely missing
      };

      const result = await sut.importInnovationFromJson(domainContext, payload);

      expect(result.emptySections).toContain("SEC_1");
      expect(result.validationIssues["SEC_1"]).toContain('"Q_REQ" is required');
      expect(result.validationIssues["SEC_1"]).not.toContain('"Q_COND_CHILD" is required');
    });
  });
});
