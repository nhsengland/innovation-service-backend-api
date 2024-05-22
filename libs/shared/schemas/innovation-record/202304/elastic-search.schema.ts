import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type {
  InnovationGroupedStatusEnum,
  InnovationStatusEnum,
  InnovationSupportStatusEnum,
  UserStatusEnum
} from '../../../enums';
import type { CreateIndexParams } from '../../../services/integrations/elastic-search.service';
import type { DocumentType } from '../index';

export type ElasticSearchDocumentType202304 = {
  id: string;
  status: InnovationStatusEnum;
  archivedStatus: InnovationStatusEnum | null;
  statusUpdatedAt: Date;
  groupedStatus: InnovationGroupedStatusEnum;
  submittedAt: Date | null;
  updatedAt: Date;
  lastAssessmentRequestAt: Date | null;
  document: DocumentType;
  owner?: { id: string; identityId: string; companyName: string | null; status: UserStatusEnum };
  engagingOrganisations?: { organisationId: string; name: string; acronym: string }[];
  engagingUnits?: {
    unitId: string;
    name: string;
    acronym: string;
    assignedAccessors?: { roleId: string; id: string; identityId: string }[];
  }[];
  shares?: string[];
  supports?: {
    id: string;
    unitId: string;
    status: InnovationSupportStatusEnum;
    updatedAt: Date;
    updatedBy: string;
    assignedAccessorsRoleIds?: string[];
  }[];
  assessment?: {
    id: string;
    assignedToId: string | null;
    assignedToIdentityId: string | null;
    updatedAt: Date;
    isExempt: boolean;
  };
  suggestions?: {
    suggestedUnitId: string;
    suggestedBy: string[];
  }[];
};
const TextWithNestedKeywordType: MappingProperty = {
  type: 'text',
  fields: { keyword: { type: 'keyword', normalizer: 'lowercase' } }
};

export const ElasticSearchSchema202304: CreateIndexParams = {
  settings: {
    analysis: {
      analyzer: {
        default: {
          type: 'custom',
          tokenizer: 'whitespace',
          filter: ['lowercase', 'porter_stem']
        }
      }
    }
  },
  mappings: {
    properties: {
      owner: {
        properties: {
          id: { type: 'keyword' },
          identityId: { type: 'keyword' },
          companyName: { type: 'text' },
          status: { type: 'keyword' }
        }
      },

      status: { type: 'keyword' },
      archivedStatus: { type: 'keyword' },
      rawStatus: { type: 'keyword' },
      statusUpdatedAt: { type: 'date' },
      groupedStatus: { type: 'keyword' },
      submittedAt: { type: 'date' },
      updatedAt: { type: 'date' },
      lastAssessmentRequestAt: { type: 'date' },

      supports: {
        type: 'nested',
        properties: {
          id: { type: 'keyword' },
          unitId: { type: 'keyword' },
          status: { type: 'keyword' },
          updatedAt: { type: 'date' },
          updatedBy: { type: 'keyword' },
          assignedAccessorsRoleIds: { type: 'keyword' }
        }
      },

      engagingOrganisations: {
        type: 'nested',
        properties: {
          organisationId: { type: 'keyword' },
          name: { type: 'text' },
          acronym: { type: 'keyword' }
        }
      },
      engagingUnits: {
        type: 'nested',
        properties: {
          unitId: { type: 'keyword' },
          name: { type: 'text' },
          acronym: { type: 'keyword' },
          assignedAccessors: {
            type: 'nested',
            properties: {
              roleId: { type: 'keyword' },
              id: { type: 'keyword' },
              identityId: { type: 'keyword' }
            }
          }
        }
      },
      shares: { type: 'keyword' },

      suggestions: {
        type: 'nested',
        properties: {
          suggestedUnitId: { type: 'keyword' },
          suggestedBy: { type: 'keyword' }
        }
      },

      assessment: {
        properties: {
          id: { type: 'keyword' },
          assignedToId: { type: 'keyword' },
          assignedToIdentityId: { type: 'keyword' },
          updatedAt: { type: 'date' },
          isExempt: { type: 'boolean' }
        }
      },

      document: {
        properties: {
          version: { type: 'constant_keyword' },
          INNOVATION_DESCRIPTION: {
            properties: {
              name: TextWithNestedKeywordType,
              description: { type: 'text' },
              postcode: { type: 'text' },
              countryName: TextWithNestedKeywordType,
              website: { type: 'text' },
              categories: TextWithNestedKeywordType,
              otherCategoryDescription: { type: 'text' },
              mainCategory: TextWithNestedKeywordType,
              areas: TextWithNestedKeywordType,
              careSettings: TextWithNestedKeywordType,
              otherCareSetting: { type: 'text' },
              mainPurpose: TextWithNestedKeywordType,
              supportDescription: { type: 'text' },
              currentlyReceivingSupport: { type: 'text' },
              involvedAACProgrammes: TextWithNestedKeywordType
            }
          },
          UNDERSTANDING_OF_NEEDS: {
            properties: {
              problemsTackled: { type: 'text' },
              howInnovationWork: { type: 'text' },
              benefitsOrImpact: TextWithNestedKeywordType,
              impactDiseaseCondition: TextWithNestedKeywordType,
              diseasesConditionsImpact: TextWithNestedKeywordType,
              estimatedCarbonReductionSavings: TextWithNestedKeywordType,
              estimatedCarbonReductionSavingsDescription: { type: 'text' },
              carbonReductionPlan: TextWithNestedKeywordType,
              keyHealthInequalities: TextWithNestedKeywordType,
              completedHealthInequalitiesImpactAssessment: TextWithNestedKeywordType,
              hasProductServiceOrPrototype: TextWithNestedKeywordType
            }
          },
          EVIDENCE_OF_EFFECTIVENESS: {
            properties: {
              hasEvidence: TextWithNestedKeywordType,
              currentlyCollectingEvidence: TextWithNestedKeywordType,
              summaryOngoingEvidenceGathering: { type: 'text' },
              needsSupportAnyArea: TextWithNestedKeywordType
            }
          },
          MARKET_RESEARCH: {
            properties: {
              hasMarketResearch: TextWithNestedKeywordType,
              marketResearch: { type: 'text' },
              optionBestDescribesInnovation: TextWithNestedKeywordType,
              whatCompetitorsAlternativesExist: { type: 'text' }
            }
          },
          CURRENT_CARE_PATHWAY: {
            properties: {
              innovationPathwayKnowledge: TextWithNestedKeywordType,
              potentialPathway: { type: 'text' }
            }
          },
          TESTING_WITH_USERS: {
            properties: {
              involvedUsersDesignProcess: TextWithNestedKeywordType,
              testedWithIntendedUsers: TextWithNestedKeywordType,
              intendedUserGroupsEngaged: TextWithNestedKeywordType,
              otherIntendedUserGroupsEngaged: { type: 'text' },
              userTests: {
                type: 'nested',
                properties: {
                  kind: { type: 'text' },
                  feedback: { type: 'text' }
                }
              }
            }
          },
          REGULATIONS_AND_STANDARDS: {
            properties: {
              hasRegulationKnowledge: TextWithNestedKeywordType,
              standards: {
                type: 'nested',
                properties: {
                  type: TextWithNestedKeywordType,
                  hasMet: TextWithNestedKeywordType
                }
              },
              otherRegulationDescription: { type: 'text' }
            }
          },
          INTELLECTUAL_PROPERTY: {
            properties: {
              hasPatents: TextWithNestedKeywordType,
              patentNumbers: { type: 'text' },
              hasOtherIntellectual: TextWithNestedKeywordType,
              otherIntellectual: { type: 'text' }
            }
          },
          REVENUE_MODEL: {
            properties: {
              hasRevenueModel: TextWithNestedKeywordType,
              revenues: TextWithNestedKeywordType,
              otherRevenueDescription: { type: 'text' },
              payingOrganisations: { type: 'text' },
              benefittingOrganisations: { type: 'text' },
              hasFunding: TextWithNestedKeywordType,
              fundingDescription: { type: 'text' }
            }
          },
          COST_OF_INNOVATION: {
            properties: {
              hasCostKnowledge: TextWithNestedKeywordType,
              costDescription: { type: 'text' },
              patientsRange: TextWithNestedKeywordType,
              eligibilityCriteria: { type: 'text' },
              sellExpectations: { type: 'text' },
              usageExpectations: { type: 'text' },
              costComparison: TextWithNestedKeywordType
            }
          },
          DEPLOYMENT: {
            properties: {
              hasDeployPlan: TextWithNestedKeywordType,
              isDeployed: TextWithNestedKeywordType,
              deploymentPlans: { type: 'text' },
              commercialBasis: { type: 'text' },
              organisationDeploymentAffect: { type: 'text' },
              hasResourcesToScale: TextWithNestedKeywordType
            }
          },
          evidences: {
            type: 'nested',
            properties: {
              id: { type: 'keyword' },
              evidenceSubmitType: TextWithNestedKeywordType,
              evidenceType: TextWithNestedKeywordType,
              description: { type: 'text' },
              summary: { type: 'text' }
            }
          }
        }
      }
    }
  }
};
