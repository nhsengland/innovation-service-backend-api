import { IRSchemaType, SchemaModel } from './schema.model';
import { requiredSectionsAndQuestions } from '../../schemas/innovation-record';
import { randCountry, randText } from '@ngneat/falso';
import { IR_SCHEMA } from '../../schemas/innovation-record/schema';

describe('models / schema-engine / schema.model.ts', () => {
  beforeAll(() => {
    requiredSectionsAndQuestions.clear();
  });

  it('should give error when schema format is not right', () => {
    const body: any = { sections: [{ id: 'id1', subSections: [] }] };

    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();

    expect(errors).toStrictEqual([{ context: undefined, message: '"sections[0].title" is required' }]);
  });

  it('should give an error when two sections have the same id', () => {
    const body: IRSchemaType = {
      sections: [
        { id: 'id1', title: 'Section 1', subSections: [] },
        { id: 'id2', title: 'Section 2', subSections: [] },
        { id: 'id1', title: 'Section 3', subSections: [] },
        { id: 'id2', title: 'Section 4', subSections: [] }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();

    expect(errors).toStrictEqual([
      {
        message: 'sections[2].id is repeated',
        context: { id: 'id1', title: 'Section 3', subSections: [] }
      },
      {
        message: 'sections[3].id is repeated',
        context: { id: 'id2', title: 'Section 4', subSections: [] }
      }
    ]);
  });

  it('should give an error when two subSections have the same id', () => {
    const body: IRSchemaType = {
      sections: [
        {
          id: 'id1',
          title: 'Section 1',
          subSections: [
            { id: 'subId1', title: 'Subsection 1.1', steps: [{ questions: [] }] },
            { id: 'subId2', title: 'Subsection 1.2', steps: [{ questions: [] }] }
          ]
        },
        {
          id: 'id2',
          title: 'Section 2',
          subSections: [{ id: 'subId1', title: 'Subsection 2.1', steps: [{ questions: [] }] }]
        }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();

    expect(errors).toStrictEqual([
      {
        message: 'sections[1].subSections[0].id is repeated',
        context: { id: 'subId1', title: 'Subsection 2.1', steps: [{ questions: [] }] }
      }
    ]);
  });

  it('should give an error when two questions have the same id', () => {
    const body: IRSchemaType = {
      sections: [
        {
          id: 'id1',
          title: 'Section 1',
          subSections: [
            {
              id: 'subId1',
              title: 'Subsection 1.1',
              steps: [
                { questions: [{ id: 'q1', dataType: 'text', label: 'Question 1' }] },
                { questions: [{ id: 'q2', dataType: 'text', label: 'Question 2' }] },
                { questions: [{ id: 'q1', dataType: 'text', label: 'Question 3' }] }
              ]
            }
          ]
        }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();

    expect(errors).toStrictEqual([
      {
        message: 'sections[0].subSections[0].steps[2].questions[0].id is repeated',
        context: { id: 'q1', dataType: 'text', label: 'Question 3' }
      }
    ]);
  });

  it("should give error when the itemFromAnswer doesn't reference a previous question", () => {
    const body: IRSchemaType = {
      sections: [
        {
          id: 'id1',
          title: 'Section 1',
          subSections: [
            {
              id: 'subId1',
              title: 'Subsection 1.1',
              steps: [
                {
                  questions: [
                    {
                      id: 'q1',
                      dataType: 'radio-group',
                      label: 'Label 1',
                      items: [{ itemsFromAnswer: 'q2' }]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();

    expect(errors).toStrictEqual([
      {
        message: 'sections[0].subSections[0].steps[0].questions[0].items must reference a previous question',
        context: {
          id: 'q1',
          dataType: 'radio-group',
          label: 'Label 1',
          items: [{ itemsFromAnswer: 'q2' }]
        }
      }
    ]);
  });

  it('should give error when two items have the same id', () => {
    const body: IRSchemaType = {
      sections: [
        {
          id: 'id1',
          title: 'Section 1',
          subSections: [
            {
              id: 'subId1',
              title: 'Subsection 1.1',
              steps: [
                {
                  questions: [
                    {
                      id: 'q1',
                      dataType: 'radio-group',
                      label: 'Label 1',
                      items: [
                        { id: 'item1', label: 'item1' },
                        { id: 'item2', label: 'item2' },
                        { id: 'item1', label: 'item3' }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();

    expect(errors).toStrictEqual([
      {
        message: 'sections[0].subSections[0].steps[0].questions[0].items[2].id is repeated',
        context: { id: 'item1', label: 'item3' }
      }
    ]);
  });

  it('should give error when the conditional question is not valid', () => {
    const body: IRSchemaType = {
      sections: [
        {
          id: 'id1',
          title: 'Section 1',
          subSections: [
            {
              id: 'subId1',
              title: 'Subsection 1.1',
              steps: [
                {
                  questions: [
                    {
                      id: 'q1',
                      dataType: 'radio-group',
                      label: 'Label 1',
                      items: [
                        {
                          id: 'item1',
                          label: 'item1',
                          conditional: {
                            id: 'c1',
                            dataType: 'text',
                            label: 'Conditional',
                            validations: {}
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();
    expect(errors).toHaveLength(1);
  });

  it("should give error when the validations object is defined but it doesn't have one key", () => {
    const body: IRSchemaType = {
      sections: [
        {
          id: 'id1',
          title: 'Section 1',
          subSections: [
            {
              id: 'subId1',
              title: 'Subsection 1.1',
              steps: [{ questions: [{ id: 'q1', dataType: 'text', label: 'Label 1', validations: {} }] }]
            }
          ]
        }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();

    expect(errors).toStrictEqual([
      {
        message: 'sections[0].subSections[0].steps[0].questions[0].validations if used must have at least 1 validation',
        context: {
          id: 'q1',
          dataType: 'text',
          label: 'Label 1',
          validations: {}
        }
      }
    ]);
  });

  it('should give error when the field question is not valid', () => {
    const body: IRSchemaType = {
      sections: [
        {
          id: 'id1',
          title: 'Section 1',
          subSections: [
            {
              id: 'subId1',
              title: 'Subsection 1.1',
              steps: [
                {
                  questions: [
                    {
                      id: 'q1',
                      dataType: 'fields-group',
                      label: 'Question 1',
                      description: 'description 1',
                      field: { id: 'q1', dataType: 'text', label: 'Question 2' },
                      addNewLabel: 'New label'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();
    expect(errors).toHaveLength(1);
  });

  it('should give error when the addQuestion question is not valid', () => {
    const body: IRSchemaType = {
      sections: [
        {
          id: 'id1',
          title: 'Section 1',
          subSections: [
            {
              id: 'subId1',
              title: 'Subsection 1.1',
              steps: [
                {
                  questions: [
                    {
                      id: 'q1',
                      dataType: 'fields-group',
                      label: 'Question 1',
                      description: 'description 1',
                      field: { id: 'q2', dataType: 'text', label: 'Question 2' },
                      addQuestion: { id: 'q1', dataType: 'text', label: 'Question 2' },
                      addNewLabel: 'New label'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();
    expect(errors).toHaveLength(1);
  });

  describe('runRules condition', () => {
    it('should give error when the referenced variable dont have the option', () => {
      const body: IRSchemaType = {
        sections: [
          {
            id: 'id1',
            title: 'Section 1',
            subSections: [
              {
                id: 'subId1',
                title: 'Subsection 1.1',
                steps: [
                  {
                    questions: [
                      {
                        id: 'q1',
                        dataType: 'radio-group',
                        label: 'Question 1',
                        items: [
                          { id: 'basedOutsidePT', label: 'Based outside' },
                          { id: 'other', label: 'other' }
                        ]
                      }
                    ]
                  },
                  {
                    questions: [{ id: 'q2', dataType: 'text', label: 'Label 2' }],
                    condition: { id: 'q1', options: ['basedOutsideUk', 'basedOutsideUs'] }
                  }
                ]
              }
            ]
          }
        ]
      };
      const schema = new SchemaModel(body);

      const { errors } = schema.runRules();

      expect(errors).toStrictEqual([
        {
          message:
            'sections[0].subSections[0].steps[1].condition references a wrong option (basedOutsideUk,basedOutsideUs)',
          context: {
            questions: [{ id: 'q2', dataType: 'text', label: 'Label 2' }],
            condition: { id: 'q1', options: ['basedOutsideUk', 'basedOutsideUs'] }
          }
        }
      ]);
    });

    it('should give error when referenced variable is not of a non-tipified dataType', () => {
      const body: IRSchemaType = {
        sections: [
          {
            id: 'id1',
            title: 'Section 1',
            subSections: [
              {
                id: 'subId1',
                title: 'Subsection 1.1',
                steps: [
                  { questions: [{ id: 'q1', dataType: 'text', label: 'Question 1' }] },
                  {
                    questions: [{ id: 'q2', dataType: 'text', label: 'Label 2' }],
                    condition: { id: 'q1', options: ['basedOutsideUk'] }
                  }
                ]
              }
            ]
          }
        ]
      };
      const schema = new SchemaModel(body);

      const { errors } = schema.runRules();

      expect(errors).toStrictEqual([
        {
          message: 'sections[0].subSections[0].steps[1].condition references non-tipified dataType (q1)',
          context: {
            questions: [{ id: 'q2', dataType: 'text', label: 'Label 2' }],
            condition: { id: 'q1', options: ['basedOutsideUk'] }
          }
        }
      ]);
    });

    it('should give error when referenced variable is not from a previous question', () => {
      const body: IRSchemaType = {
        sections: [
          {
            id: 'id1',
            title: 'Section 1',
            subSections: [
              {
                id: 'subId1',
                title: 'Subsection 1.1',
                steps: [
                  {
                    questions: [{ id: 'q2', dataType: 'text', label: 'Label 2' }],
                    condition: { id: 'q1', options: ['basedOutsideUk'] }
                  },
                  {
                    questions: [
                      {
                        id: 'q1',
                        dataType: 'radio-group',
                        label: 'Question 1',
                        items: [{ id: 'basedOutsideUk', label: 'Based outside' }]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };
      const schema = new SchemaModel(body);

      const { errors } = schema.runRules();

      expect(errors).toStrictEqual([
        {
          message: 'sections[0].subSections[0].steps[0].condition must reference a previous question (q1)',
          context: {
            questions: [{ id: 'q2', dataType: 'text', label: 'Label 2' }],
            condition: { id: 'q1', options: ['basedOutsideUk'] }
          }
        }
      ]);
    });
  });

  describe('canUploadFiles', () => {
    it('should return true if section can upload files', () => {
      const body: IRSchemaType = {
        sections: [
          {
            id: 'id1',
            title: 'Section 1',
            subSections: [
              {
                id: 'subId1',
                title: 'Subsection 1.1',
                hasFiles: true,
                steps: []
              }
            ]
          }
        ]
      };
      const schema = new SchemaModel(body);
      schema.runRules();
      expect(schema.canUploadFiles('subId1')).toBe(true);
    });

    it('should return false if section cannot upload files', () => {
      const body: IRSchemaType = {
        sections: [
          {
            id: 'id1',
            title: 'Section 1',
            subSections: [{ id: 'subId1', title: 'Subsection 1.1', steps: [], hasFiles: false }]
          }
        ]
      };
      const schema = new SchemaModel(body);
      schema.runRules();
      expect(schema.canUploadFiles('subId1')).toBe(false);
    });
  });

  describe('cleanUpDocument', () => {
    it('should remove old fields that are not on the schema anymore', async () => {
      const body: IRSchemaType = {
        sections: [
          {
            id: 'id1',
            title: 'Section 1',
            subSections: [
              {
                id: 'subId1',
                title: 'Subsection 1.1',
                steps: [
                  { questions: [{ id: 'name', dataType: 'text', label: 'What is the name?' }] },
                  {
                    questions: [
                      {
                        id: 'officeLocation',
                        dataType: 'radio-group',
                        label: 'Where is your head office located?',
                        items: [{ id: 'England', label: 'England' }]
                      }
                    ]
                  }
                ],
                calculatedFields: { countryName: [{ id: 'officeLocation', options: ['England'] }] }
              },
              {
                id: 'subId2',
                title: 'Subsection 1.2',
                steps: [{ questions: [{ id: 'description', dataType: 'text', label: 'What is the description?' }] }]
              }
            ]
          }
        ]
      };

      const schema = new SchemaModel(body);
      schema.runRules();
      const doc = {
        version: 0,
        subId1: { name: randText(), officeLocation: 'England', countryName: 'England', country: randCountry() },
        subId2: { name: randText(), description: randText() }
      };
      expect(schema.cleanUpDocument(doc)).toStrictEqual({
        version: doc.version,
        subId1: {
          name: doc.subId1.name,
          officeLocation: doc.subId1.officeLocation,
          countryName: doc.subId1.countryName
        },
        subId2: { description: doc.subId2.description }
      });
    });
  });

  describe('translateDocument', () => {
    it('should translate document info', () => {
      const schema = new SchemaModel(IR_SCHEMA);
      schema.runRules();

      const document = {
        version: '6',
        INNOVATION_DESCRIPTION: {
          name: 'New innovationasasdasdadasda',
          hasWebsite: 'NO',
          categories: ['IN_VITRO_DIAGNOSTIC'],
          mainCategory: 'IN_VITRO_DIAGNOSTIC',
          areas: ['DATA_ANALYTICS_AND_RESEARCH', 'DIGITALISING_SYSTEM', 'IMPROVING_SYSTEM_FLOW'],
          careSettings: [ 'END_LIFE_CARE', 'INDUSTRY', 'LOCAL_AUTHORITY_EDUCATION', 'OTHER' ],
          otherCareSetting: 'I want another',
          mainPurpose: 'ENABLING_CARE',
          involvedAACProgrammes: [
            'Health Innovation Network',
            'Artificial Intelligence in Health and Care Award',
            'Innovation for Healthcare Inequalities Programme'
          ],
          countryName: 'Northern Ireland'
        },
        UNDERSTANDING_OF_NEEDS: {
          howInnovationWork: 'daasdadsa',
          hasProductServiceOrPrototype: 'YES',
          benefitsOrImpact: [
            'Increases self-management',
            'Increases quality of life',
            'Enables shared care',
            'Changes delivery of care from secondary care(for example hospitals) to primary care(for example GP or community services)',
            'Change in delivery of care from inpatient to day case'
          ],
          impactDiseaseCondition: 'YES',
          diseasesConditionsImpact: ['BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_ALLERGIES'],
          carbonReductionPlan: 'WORKING_ON',
          keyHealthInequalities: ['SEVER_MENTAL_ILLNESS', 'EARLY_CANCER_DIAGNOSIS'],
          completedHealthInequalitiesImpactAssessment: 'YES'
        },
        EVIDENCE_OF_EFFECTIVENESS: {
          hasEvidence: 'YES',
          currentlyCollectingEvidence: 'YES',
          summaryOngoingEvidenceGathering: 'asda',
          needsSupportAnyArea: ['UNDERSTANDING_LAWS', 'APPROVAL_DATA_STUDIES']
        },
        COST_OF_INNOVATION: {
          hasCostKnowledge: 'DETAILED_ESTIMATE',
          patientsRange: 'MORE_THAN_500000',
          costComparison: 'COSTS_MORE_WITH_SAVINGS'
        },
        CURRENT_CARE_PATHWAY: {
          innovationPathwayKnowledge: 'PATHWAY_EXISTS_AND_CHANGED',
          potentialPathway: 'qweqasd\nasd\nasd'
        },
        DEPLOYMENT: {},
        INTELLECTUAL_PROPERTY: {
          hasPatents: 'APPLIED_AT_LEAST_ONE',
          hasOtherIntellectual: 'YES',
          otherIntellectual: 'Asda'
        },
        MARKET_RESEARCH: {
          hasMarketResearch: 'IN_PROGRESS',
          marketResearch: 'asdqw',
          optionBestDescribesInnovation: 'COST_EFFECT_ALTERNATIVE',
          whatCompetitorsAlternativesExist: 'qwe'
        },
        REGULATIONS_AND_STANDARDS: {
          hasRegulationKnowledge: 'YES_ALL',
          standards: [
            { type: 'CE_UKCA_NON_MEDICAL', hasMet: 'YES' },
            { type: 'CE_UKCA_CLASS_I', hasMet: 'YES' },
            { type: 'IVD_GENERAL', hasMet: 'IN_PROGRESS' },
            { type: 'IVD_SELF_TEST', hasMet: 'IN_PROGRESS' }
          ]
        },
        REVENUE_MODEL: {
          hasRevenueModel: 'YES',
          revenues: ['DIRECT_PRODUCT_SALES', 'LEASE', 'SALES_OF_CONSUMABLES_OR_ACCESSORIES'],
          payingOrganisations: 'qwqewqweq',
          benefittingOrganisations: 'qweqw',
          hasFunding: 'YES',
          fundingDescription: 'qweqwq'
        },
        TESTING_WITH_USERS: {
          involvedUsersDesignProcess: 'YES',
          testedWithIntendedUsers: 'YES',
          intendedUserGroupsEngaged: [
            'CLINICAL_SOCIAL_CARE_WORKING_INSIDE_UK',
            'CLINICAL_SOCIAL_CARE_WORKING_OUTSIDE_UK'
          ],
          userTests: [
            { kind: 'First type', feedback: 'Adasqweasd' },
            { kind: 'Second type', feedback: 'qweqwq' }
          ]
        },
        evidences: [
          {
            id: 'df376215-7194-453c-b308-57198d631af8',
            evidenceType: 'UNPUBLISHED_DATA',
            evidenceSubmitType: 'CLINICAL_OR_CARE',
            summary: 'asda'
          },
          {
            id: '175b159f-6c5c-4f7b-9ba4-e0d708b2c16b',
            evidenceType: 'UNPUBLISHED_DATA',
            evidenceSubmitType: 'PRE_CLINICAL',
            summary: 'asd'
          }
        ]
      };

      expect(schema.translateDocument(document)).toStrictEqual({
        INNOVATION_DESCRIPTION: {
          name: 'New innovationasasdasdadasda',
          hasWebsite: 'No',
          countryName: 'Northern Ireland',
          otherCareSetting: 'I want another',
          areas: ['Data, analytics and research', 'Digitalising the system', 'Improving system flow'],
          mainCategory: 'In vitro diagnostic',
          categories: ['In vitro diagnostic'],
          involvedAACProgrammes: [
            'Health Innovation Network',
            'Artificial Intelligence in Health and Care Award',
            'Innovation for Healthcare Inequalities Programme'
          ],
          mainPurpose: 'Enabling care, services or communication',
          careSettings: [ 'End of life care (EOLC)', 'Industry', 'Local authority - education', 'Other' ]
        },
        UNDERSTANDING_OF_NEEDS: {
          diseasesConditionsImpact: ['Blood and immune system conditions - Allergies'],
          hasProductServiceOrPrototype: 'Yes',
          carbonReductionPlan: 'I am working on one',
          completedHealthInequalitiesImpactAssessment: 'Yes',
          benefitsOrImpact: [
            'Increases self-management',
            'Increases quality of life',
            'Enables shared care',
            'Changes delivery of care from secondary care(for example hospitals) to primary care(for example GP or community services)',
            'Change in delivery of care from inpatient to day case'
          ],
          impactDiseaseCondition: 'Yes',
          howInnovationWork: 'daasdadsa',
          keyHealthInequalities: ['Severe mental illness', 'Early cancer diagnosis']
        },
        EVIDENCE_OF_EFFECTIVENESS: {
          currentlyCollectingEvidence: 'Yes',
          needsSupportAnyArea: [
            'Understanding the laws that regulate the use of health and care data',
            'Approval of data studies'
          ],
          summaryOngoingEvidenceGathering: 'asda',
          hasEvidence: 'Yes'
        },
        MARKET_RESEARCH: {
          hasMarketResearch: "I'm currently doing market research",
          marketResearch: 'asdqw',
          optionBestDescribesInnovation: 'A more cost-effect alternative to those that already exist',
          whatCompetitorsAlternativesExist: 'qwe'
        },
        CURRENT_CARE_PATHWAY: {
          innovationPathwayKnowledge: 'There is a pathway, and my innovation changes it',
          potentialPathway: 'qweqasd\nasd\nasd'
        },
        TESTING_WITH_USERS: {
          involvedUsersDesignProcess: 'Yes',
          intendedUserGroupsEngaged: [
            'Clinical or social care professionals working in the UK health and social care system',
            'Clinical or social care professionals working outside the UK'
          ],
          userTests: [
            { feedback: 'Adasqweasd', kind: 'First type' },
            { feedback: 'qweqwq', kind: 'Second type' }
          ],
          testedWithIntendedUsers: 'Yes'
        },
        REGULATIONS_AND_STANDARDS: {
          standards: [
            { hasMet: 'Yes', type: 'Non-medical device' },
            { hasMet: 'Yes', type: 'Class I medical device' },
            { hasMet: 'I am actively working towards it', type: 'IVD general' },
            { hasMet: 'I am actively working towards it', type: 'IVD self-test' }
          ],
          hasRegulationKnowledge: 'Yes, I know all of them'
        },
        INTELLECTUAL_PROPERTY: {
          otherIntellectual: 'Asda',
          hasPatents: 'I have applied for one or more patents',
          hasOtherIntellectual: 'Yes'
        },
        REVENUE_MODEL: {
          payingOrganisations: 'qwqewqweq',
          hasFunding: 'Yes',
          benefittingOrganisations: 'qweqw',
          revenues: ['Direct product sales', 'Lease', 'Sales of consumables or accessories'],
          fundingDescription: 'qweqwq',
          hasRevenueModel: 'Yes'
        },
        COST_OF_INNOVATION: {
          hasCostKnowledge: 'Yes, I have a detailed estimate',
          costComparison:
            'My innovation costs more to purchase, but has greater benefits that will lead to overall cost savings',
          patientsRange: 'More than half a million per year',
        },
        DEPLOYMENT: {},
        version: '6',
        evidences: [
          {
            summary: 'asda',
            evidenceType: 'Unpublished data',
            id: 'df376215-7194-453c-b308-57198d631af8',
            evidenceSubmitType: 'Evidence of clinical or care outcomes'
          },
          {
            summary: 'asd',
            evidenceType: 'Unpublished data',
            id: '175b159f-6c5c-4f7b-9ba4-e0d708b2c16b',
            evidenceSubmitType: 'Pre-clinical evidence'
          }
        ]
      });
    });
  });
});
