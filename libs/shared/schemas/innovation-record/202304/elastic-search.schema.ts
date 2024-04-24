import type { CreateIndexParams } from '../../../services/integrations/elastic-search.service';

/**
 * TODO: Want to see the feasability to generate this schema from the type
 * to reduce the boilerplate needed.
 */
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
          companyName: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } }
        }
      },
      shared: { type: 'keyword' },
      status: { type: 'keyword' },
      // NOTE: check suggested, support status, grouped status
      document: {
        properties: {
          version: { type: 'constant_keyword' }, // NOTE: this is true for now since the version is always the same for all docs in the index
          INNOVATION_DESCRIPTION: {
            properties: {
              name: { type: 'text' },
              description: { type: 'text' },
              postcode: { type: 'text' },
              countryName: { type: 'text' },
              website: { type: 'text' }, // NOTE: check type url
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
              // NOTE: check nested
              userTests: {
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
              // NOTE: check nested
              standards: {
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
          // NOTE: check nested
          evidences: {
            properties: {
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
