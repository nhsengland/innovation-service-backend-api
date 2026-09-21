import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { CurrentDocumentType } from '.';
import type {
  InnovationGroupedStatusEnum,
  InnovationStatusEnum,
  InnovationSupportCloseReasonEnum,
  InnovationSupportStatusEnum,
  ProgressAreasCatalogType,
  UserStatusEnum
} from '../../enums';
import type { CreateIndexParams } from '../../services/integrations/elastic-search.service';
import type { InnovationRecordDocumentType } from './document.types';

export type ElasticSearchDocumentType = {
  id: string;
  uniqueId: string;
  status: InnovationStatusEnum;
  statusUpdatedAt: Date;
  groupedStatus: InnovationGroupedStatusEnum;
  hasBeenAssessed: boolean;
  submittedAt: Date | null;
  updatedAt: Date;
  lastAssessmentRequestAt: Date | null;
  document: CurrentDocumentType;
  owner?: { id: string; identityId: string; companyName: string | null; status: UserStatusEnum };
  engagingOrganisations?: { organisationId: string; name: string; acronym: string }[];
  engagingUnits?: {
    unitId: string;
    name: string;
    acronym: string;
    assignedAccessors?: { roleId: string; userId: string; identityId: string }[];
  }[];
  shares?: string[];
  supports?: {
    id: string;
    unitId: string;
    status: InnovationSupportStatusEnum;
    closeReason: InnovationSupportCloseReasonEnum | null;
    updatedAt: Date;
    updatedBy: string;
    assignedAccessorsRoleIds?: string[];
  }[];
  assessment?: {
    id: string;
    majorVersion: number;
    minorVersion: number;
    assignedToId: string | null;
    updatedAt: Date;
    isExempt: boolean;
    finishedAt: Date | null;
    maturityLevel: string | null;
  };
  progressAreas?: ProgressAreasCatalogType[];
  suggestions?: {
    suggestedUnitId: string;
    suggestedBy: string[];
  }[];
  filters: {
    name: InnovationRecordDocumentType['INNOVATION_DESCRIPTION']['name'];
    countryName: InnovationRecordDocumentType['INNOVATION_DESCRIPTION']['countryName'];
    categories: InnovationRecordDocumentType['INNOVATION_DESCRIPTION']['categories'];
    careSettings: InnovationRecordDocumentType['INNOVATION_DESCRIPTION']['careSettings'];
    involvedAACProgrammes: InnovationRecordDocumentType['INNOVATION_DESCRIPTION']['involvedAACProgrammes'];
    diseasesAndConditions: InnovationRecordDocumentType['UNDERSTANDING_OF_NEEDS']['diseasesConditionsImpact'];
    keyHealthInequalities: InnovationRecordDocumentType['UNDERSTANDING_OF_NEEDS']['keyHealthInequalities'];
    areas: InnovationRecordDocumentType['INNOVATION_DESCRIPTION']['areas'];
  };
};

const KeywordType: MappingProperty = { type: 'keyword', normalizer: 'lowercase' };

export const ElasticSearchSchema: CreateIndexParams = {
  settings: {
    analysis: {
      analyzer: {
        default: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'stop', 'porter_stem']
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

      uniqueId: { type: 'keyword' },
      status: { type: 'keyword' },
      statusUpdatedAt: { type: 'date' },
      groupedStatus: { type: 'keyword' },
      hasBeenAssessed: { type: 'boolean' },
      submittedAt: { type: 'date' },
      updatedAt: { type: 'date' },
      lastAssessmentRequestAt: { type: 'date' },

      supports: {
        type: 'nested',
        properties: {
          id: { type: 'keyword' },
          unitId: { type: 'keyword' },
          status: { type: 'keyword' },
          closeReason: { type: 'keyword' },
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
              userId: { type: 'keyword' },
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
          majorVersion: { type: 'keyword' },
          minorVersion: { type: 'keyword' },
          assignedToId: { type: 'keyword' },
          assignedToIdentityId: { type: 'keyword' },
          updatedAt: { type: 'date' },
          isExempt: { type: 'boolean' },
          maturityLevel:{ type: 'keyword' },
          finishedAt: { type: 'date' }
        }
      },
      progressAreas: {
        type: 'keyword'
      },
      filters: {
        properties: {
          name: KeywordType,
          countryName: KeywordType,
          categories: KeywordType,
          careSettings: KeywordType,
          involvedAACProgrammes: KeywordType,
          diseasesAndConditions: KeywordType,
          keyHealthInequalities: KeywordType,
          areas: KeywordType
        }
      },

      document: {
        properties: {
          version: { type: 'keyword' },
          INNOVATION_DESCRIPTION: {
            properties: {
              name: { type: 'text' },
              description: { type: 'text' },
              postcode: { type: 'text' },
              countryName: { type: 'text' },
              officeLocation: { type: 'text' },
              countryLocation: { type: 'text' },
              hasWebsite: { type: 'text' },
              website: { type: 'text' },
              categories: { type: 'text' },
              otherCategoryDescription: { type: 'text' },
              mainCategory: { type: 'text' },
              areas: { type: 'text' },
              careSettings: { type: 'text' },
              otherCareSetting: { type: 'text' },
              mainPurpose: { type: 'text' },
              supportDescription: { type: 'text' },
              currentlyReceivingSupport: { type: 'text' },
              involvedAACProgrammes: { type: 'text' }
            }
          },
          UNDERSTANDING_OF_NEEDS: {
            properties: {
              problemsTackled: { type: 'text' },
              howInnovationWork: { type: 'text' },
              benefitsOrImpact: { type: 'text' },
              impactDiseaseCondition: { type: 'text' },
              diseasesConditionsImpact: { type: 'text' },
              estimatedCarbonReductionSavings: { type: 'text' },
              estimatedCarbonReductionSavingsDescription: { type: 'text' },
              carbonReductionPlan: { type: 'text' },
              keyHealthInequalities: { type: 'text' },
              completedHealthInequalitiesImpactAssessment: { type: 'text' },
              hasProductServiceOrPrototype: { type: 'text' }
            }
          },
          EVIDENCE_OF_EFFECTIVENESS: {
            properties: {
              hasEvidence: { type: 'text' },
              currentlyCollectingEvidence: { type: 'text' },
              summaryOngoingEvidenceGathering: { type: 'text' },
              needsSupportAnyArea: { type: 'text' }
            }
          },
          MARKET_RESEARCH: {
            properties: {
              hasMarketResearch: { type: 'text' },
              marketResearch: { type: 'text' },
              optionBestDescribesInnovation: { type: 'text' },
              whatCompetitorsAlternativesExist: { type: 'text' }
            }
          },
          CURRENT_CARE_PATHWAY: {
            properties: {
              innovationPathwayKnowledge: { type: 'text' },
              potentialPathway: { type: 'text' }
            }
          },
          TESTING_WITH_USERS: {
            properties: {
              involvedUsersDesignProcess: { type: 'text' },
              testedWithIntendedUsers: { type: 'text' },
              intendedUserGroupsEngaged: { type: 'text' },
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
              hasRegulationKnowledge: { type: 'text' },
              standards: {
                type: 'nested',
                properties: {
                  type: { type: 'text' },
                  hasMet: { type: 'text' }
                }
              },
              otherRegulationDescription: { type: 'text' }
            }
          },
          INTELLECTUAL_PROPERTY: {
            properties: {
              hasPatents: { type: 'text' },
              patentNumbers: { type: 'text' },
              hasOtherIntellectual: { type: 'text' },
              otherIntellectual: { type: 'text' }
            }
          },
          REVENUE_MODEL: {
            properties: {
              hasRevenueModel: { type: 'text' },
              revenues: { type: 'text' },
              otherRevenueDescription: { type: 'text' },
              payingOrganisations: { type: 'text' },
              benefittingOrganisations: { type: 'text' },
              hasFunding: { type: 'text' },
              fundingDescription: { type: 'text' }
            }
          },
          COST_OF_INNOVATION: {
            properties: {
              hasCostKnowledge: { type: 'text' },
              costDescription: { type: 'text' },
              patientsRange: { type: 'text' },
              eligibilityCriteria: { type: 'text' },
              sellExpectations: { type: 'text' },
              usageExpectations: { type: 'text' },
              costComparison: { type: 'text' }
            }
          },
          DEPLOYMENT: {
            properties: {
              hasDeployPlan: { type: 'text' },
              isDeployed: { type: 'text' },
              deploymentPlans: { type: 'text' },
              commercialBasis: { type: 'text' },
              organisationDeploymentAffect: { type: 'text' },
              hasResourcesToScale: { type: 'text' }
            }
          },
          evidences: {
            type: 'nested',
            properties: {
              id: { type: 'keyword' },
              evidenceSubmitType: { type: 'text' },
              evidenceType: { type: 'text' },
              description: { type: 'text' },
              summary: { type: 'text' }
            }
          }
        }
      }
    }
  }
};
