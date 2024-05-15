import type { CreateIndexParams } from '../../../services/integrations/elastic-search.service';
import type { InnovationStatusEnum, InnovationGroupedStatusEnum, InnovationSupportStatusEnum } from '../../../enums';
import type { DocumentType } from '../index';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';

export type ElasticSearchDocumentType202304 = {
  id: string;
  name: string;
  status: InnovationStatusEnum;
  archivedStatus: InnovationStatusEnum | null;
  statusUpdatedAt: Date;
  groupedStatus: InnovationGroupedStatusEnum;
  submittedAt: Date | null;
  updatedAt: Date;
  lastAssessmentRequestAt: Date | null;
  document: DocumentType;
  owner: { id?: string; identityId?: string; companyName: string | null };
  engagingOrganisations: { organisationId: string; name: string; acronym: null | string }[];
  engagingUnits: {
    unitId: string;
    name: string;
    acronym: string;
    assignedAccessors: { id: string; identityId: string }[];
  }[];
  shares: string[];
  supports: {
    id: string;
    unitId: string;
    status: InnovationSupportStatusEnum;
    updatedAt: Date;
    updatedBy: string;
  }[];
  assessment?: {
    id: string;
    assignedToId: string | null;
    assignedToIdentityId: string | null;
    updatedAt: Date;
    isExempt: boolean;
  };
  // NOTE: This is not being populated yet
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
          companyName: { type: 'text' }
        }
      },

      name: TextWithNestedKeywordType,
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

      // NOTE: This is not being populated yet
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
              name: { type: 'text' },
              description: { type: 'text' },
              postcode: { type: 'text' },
              countryName: TextWithNestedKeywordType,
              website: { type: 'text' },
              categories: { type: 'keyword' },
              otherCategoryDescription: { type: 'text' },
              mainCategory: { type: 'keyword' },
              areas: { type: 'keyword' },
              careSettings: { type: 'keyword' },
              otherCareSetting: { type: 'text' },
              mainPurpose: { type: 'keyword' },
              supportDescription: { type: 'text' },
              currentlyReceivingSupport: { type: 'text' },
              involvedAACProgrammes: { type: 'keyword' }
            }
          },
          UNDERSTANDING_OF_NEEDS: {
            properties: {
              problemsTackled: { type: 'text' },
              howInnovationWork: { type: 'text' },
              benefitsOrImpact: { type: 'keyword' },
              impactDiseaseCondition: { type: 'keyword' },
              diseasesConditionsImpact: { type: 'keyword' },
              estimatedCarbonReductionSavings: { type: 'keyword' },
              estimatedCarbonReductionSavingsDescription: { type: 'text' },
              carbonReductionPlan: { type: 'keyword' },
              keyHealthInequalities: { type: 'keyword' },
              completedHealthInequalitiesImpactAssessment: { type: 'keyword' },
              hasProductServiceOrPrototype: { type: 'keyword' }
            }
          },
          EVIDENCE_OF_EFFECTIVENESS: {
            properties: {
              hasEvidence: { type: 'keyword' },
              currentlyCollectingEvidence: { type: 'keyword' },
              summaryOngoingEvidenceGathering: { type: 'text' },
              needsSupportAnyArea: { type: 'keyword' }
            }
          },
          MARKET_RESEARCH: {
            properties: {
              hasMarketResearch: { type: 'keyword' },
              marketResearch: { type: 'text' },
              optionBestDescribesInnovation: { type: 'keyword' },
              whatCompetitorsAlternativesExist: { type: 'text' }
            }
          },
          CURRENT_CARE_PATHWAY: {
            properties: {
              innovationPathwayKnowledge: { type: 'keyword' },
              potentialPathway: { type: 'text' }
            }
          },
          TESTING_WITH_USERS: {
            properties: {
              involvedUsersDesignProcess: { type: 'keyword' },
              testedWithIntendedUsers: { type: 'keyword' },
              intendedUserGroupsEngaged: { type: 'keyword' },
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
              hasRegulationKnowledge: { type: 'keyword' },
              standards: {
                type: 'nested',
                properties: {
                  type: { type: 'keyword' },
                  hasMet: { type: 'keyword' }
                }
              },
              otherRegulationDescription: { type: 'text' }
            }
          },
          INTELLECTUAL_PROPERTY: {
            properties: {
              hasPatents: { type: 'keyword' },
              patentNumbers: { type: 'text' },
              hasOtherIntellectual: { type: 'keyword' },
              otherIntellectual: { type: 'text' }
            }
          },
          REVENUE_MODEL: {
            properties: {
              hasRevenueModel: { type: 'keyword' },
              revenues: { type: 'keyword' },
              otherRevenueDescription: { type: 'text' },
              payingOrganisations: { type: 'text' },
              benefittingOrganisations: { type: 'text' },
              hasFunding: { type: 'keyword' },
              fundingDescription: { type: 'text' }
            }
          },
          COST_OF_INNOVATION: {
            properties: {
              hasCostKnowledge: { type: 'keyword' },
              costDescription: { type: 'text' },
              patientsRange: { type: 'keyword' },
              eligibilityCriteria: { type: 'text' },
              sellExpectations: { type: 'text' },
              usageExpectations: { type: 'text' },
              costComparison: { type: 'keyword' }
            }
          },
          DEPLOYMENT: {
            properties: {
              hasDeployPlan: { type: 'keyword' },
              isDeployed: { type: 'keyword' },
              deploymentPlans: { type: 'text' },
              commercialBasis: { type: 'text' },
              organisationDeploymentAffect: { type: 'text' },
              hasResourcesToScale: { type: 'keyword' }
            }
          },
          evidences: {
            type: 'nested',
            properties: {
              id: { type: 'keyword' },
              evidenceSubmitType: { type: 'keyword' },
              evidenceType: { type: 'keyword' },
              description: { type: 'text' },
              summary: { type: 'text' }
            }
          }
        }
      }
    }
  }
};
