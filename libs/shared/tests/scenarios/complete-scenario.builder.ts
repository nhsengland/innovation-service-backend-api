/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { DataSource } from 'typeorm';

import { randSoonDate, randText, randUuid } from '@ngneat/falso';
import {
  InnovationActionStatusEnum,
  InnovationCollaboratorStatusEnum,
  InnovationExportRequestStatusEnum,
  InnovationFileContextTypeEnum,
  InnovationStatusEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  InnovationTransferStatusEnum
} from '../../enums/innovation.enums';
import { NotificationContextDetailEnum, NotificationContextTypeEnum } from '../../enums/notification.enums';
import { ServiceRoleEnum, UserStatusEnum } from '../../enums/user.enums';
import { InnovationActionBuilder } from '../builders/innovation-action.builder';
import { InnovationAssessmentBuilder } from '../builders/innovation-assessment.builder';
import { InnovationCollaboratorBuilder } from '../builders/innovation-collaborator.builder';
import { InnovationExportRequestBuilder } from '../builders/innovation-export-request.builder';
import { InnovationFileBuilder } from '../builders/innovation-file.builder';
import { InnovationSupportLogBuilder } from '../builders/innovation-support-log.builder';
import { InnovationSupportBuilder } from '../builders/innovation-support.builder';
import { InnovationThreadBuilder } from '../builders/innovation-thread.builder';
import { InnovationTransferBuilder } from '../builders/innovation-transfer.builder';
import { InnovationBuilder } from '../builders/innovation.builder';
import { NotificationBuilder } from '../builders/notification.builder';
import { OrganisationUnitBuilder } from '../builders/organisation-unit.builder';
import { OrganisationBuilder } from '../builders/organisation.builder';
import { TestUserType, UserBuilder } from '../builders/user.builder';

export type CompleteScenarioType = Awaited<ReturnType<CompleteScenarioBuilder['createScenario']>>;

export class CompleteScenarioBuilder {
  scenario: CompleteScenarioType;

  private identityMap: Map<string, TestUserType>;
  private userMap: Map<string, TestUserType>;
  private emailMap: Map<string, TestUserType>;

  constructor() {
    // This is set in jest.setup.ts and is used to share data between tests)
    this.scenario = (global as any).completeScenarioData;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async createScenario(sqlConnection: DataSource) {
    const res = await sqlConnection.transaction(async entityManager => {
      // Needs assessors

      const paulNeedsAssessor = await new UserBuilder(entityManager)
        .setName('Paul Needs Assessor')
        .addRole(ServiceRoleEnum.ASSESSMENT, 'assessmentRole')
        .save();

      const seanNeedsAssessor = await new UserBuilder(entityManager)
        .setName('Sean Needs Assessor')
        .addRole(ServiceRoleEnum.ASSESSMENT, 'assessmentRole')
        .save();

      // Admin
      const allMighty = await new UserBuilder(entityManager)
        .setName('All Mighty')
        .addRole(ServiceRoleEnum.ADMIN, 'adminRole')
        .save();

      // Organisations
      // Health Organisation has two units: Health Org Unit and Health Org AI Unit
      const healthOrg = await new OrganisationBuilder(entityManager).setName('Health Organisation').save();
      // Has 3 accessors: Alice (QA), Ingrid and Jaimie
      const healthOrgUnit = await new OrganisationUnitBuilder(entityManager)
        .addToOrganisation(healthOrg.id)
        .setName('Health Org Unit')
        .save();
      // Has 3 accessors: Jaimie, Sara (QA), Bart (QA)
      const healthOrgAiUnit = await new OrganisationUnitBuilder(entityManager)
        .addToOrganisation(healthOrg.id)
        .setName('Health Org AI Unit')
        .save();

      // MedTech Organisation has one unit: MedTech Org Unit
      const medTechOrg = await new OrganisationBuilder(entityManager).setName('MedTech Organisation').save();
      const medTechOrgUnit = await new OrganisationUnitBuilder(entityManager)
        .addToOrganisation(medTechOrg.id)
        .setName('MedTech Org Unit')
        .save();

      // innovTech Organisation has one unit: InnovTech Org Unit
      const innovTechOrg = await new OrganisationBuilder(entityManager).setName('InnovTech Organisation').save();
      const innovTechOrgUnit = await new OrganisationUnitBuilder(entityManager)
        .addToOrganisation(innovTechOrg.id)
        .setName('InnovTech Org Unit')
        .save();
      const innovTechHeavyOrgUnit = await new OrganisationUnitBuilder(entityManager)
        .addToOrganisation(innovTechOrg.id)
        .setName('InnovTech Heavy Org Unit')
        .save();

      const inactiveEmptyOrg = await new OrganisationBuilder(entityManager)
        .setName('Inactive Empty Organisation')
        .setInactivatedAt(new Date())
        .save();
      const inactiveEmptyOrgUnit = await new OrganisationUnitBuilder(entityManager)
        .addToOrganisation(inactiveEmptyOrg.id)
        .setName('Inactive Empty Org Unit')
        .setInactivatedAt(new Date())
        .save();

      // QAs and Accessors

      // Alice Qualifying Accessor specs:
      // Belongs to an active organisation.
      const aliceQualifyingAccessor = await new UserBuilder(entityManager)
        .setName('Alice Qualifying Accessor')
        .addRole(ServiceRoleEnum.QUALIFYING_ACCESSOR, 'qaRole', healthOrg.id, healthOrgUnit.id)
        .save();

      // Ingrid Accessor specs:
      // Belongs to an active organisation.
      const ingridAccessor = await new UserBuilder(entityManager)
        .setName('Ingrid Accessor')
        .addRole(ServiceRoleEnum.ACCESSOR, 'accessorRole', healthOrg.id, healthOrgUnit.id)
        .save();

      // Jaimie Madrox Accessor specs:
      // Belongs to two units in Health Organisation.
      const jamieMadroxAccessor = await new UserBuilder(entityManager)
        .setName('Jamie Madrox')
        .addRole(ServiceRoleEnum.ACCESSOR, 'healthAccessorRole', healthOrg.id, healthOrgUnit.id)
        .addRole(ServiceRoleEnum.ACCESSOR, 'aiRole', healthOrg.id, healthOrgAiUnit.id)
        .save();

      // Sam accessor specs:
      // Belongs to the medtech organisation.
      const samAccessor = await new UserBuilder(entityManager)
        .setName('Sam Accessor')
        .addRole(ServiceRoleEnum.ACCESSOR, 'accessorRole', medTechOrg.id, medTechOrgUnit.id)
        .save();

      // Scott QA specs
      // Belongs to medTechOrgUnit
      const scottQualifyingAccessor = await new UserBuilder(entityManager)
        .setName('Scott Qualifying Accessor')
        .addRole(ServiceRoleEnum.QUALIFYING_ACCESSOR, 'qaRole', medTechOrg.id, medTechOrgUnit.id)
        .save();

      // Sarah Qualifying Accessor specs:
      // Belongs to an active organisation.
      const sarahQualifyingAccessor = await new UserBuilder(entityManager)
        .setName('Sarah Qualifying Accessor')
        .addRole(ServiceRoleEnum.QUALIFYING_ACCESSOR, 'qaRole', healthOrg.id, healthOrgAiUnit.id)
        .save();

      // Bart Qualifying Accessor specs:
      // Belongs to an active organisation.
      const bartQualifyingAccessor = await new UserBuilder(entityManager)
        .setName('Bart Qualifying Accessor')
        .addRole(ServiceRoleEnum.QUALIFYING_ACCESSOR, 'qaRole', healthOrg.id, healthOrgAiUnit.id)
        .save();

      // Innovators

      // Deleted innovator
      const sebastiaoDeletedInnovator = await new UserBuilder(entityManager)
        .setName('Sebastiao Deleted Innovator')
        .addRole(ServiceRoleEnum.INNOVATOR, 'innovatorRole')
        .setStatus(UserStatusEnum.DELETED)
        .save();

      // John Innovator
      const johnInnovator = await new UserBuilder(entityManager)
        .setName('John Innovator')
        .addRole(ServiceRoleEnum.INNOVATOR, 'innovatorRole')
        // .addRole(ServiceRoleEnum.INNOVATOR)
        .save();

      // Innovation owned by johnInnovator with janeCollaborator as ACTIVE collaborator
      // Pending collaborators otto (user) and elisa (external)
      // Left collaborator sebastiao
      // This innovation is shared with medtechOrg and healthOrg
      const johnInnovation = await new InnovationBuilder(entityManager)
        .setOwner(johnInnovator.id)
        .setStatus(InnovationStatusEnum.IN_PROGRESS)
        .shareWith([healthOrg, medTechOrg])
        .addSection('INNOVATION_DESCRIPTION')
        .addSection('EVIDENCE_OF_EFFECTIVENESS')
        .save();

      // Innovation owner by johnInnovator with nothing
      const johnInnovationEmpty = await new InnovationBuilder(entityManager)
        .setOwner(johnInnovator.id)
        .setStatus(InnovationStatusEnum.IN_PROGRESS)
        .save();

      // Jane Innovator specs:
      // Collaborator on jonhInnovation
      const janeInnovator = await new UserBuilder(entityManager)
        .setName('Jane Innovator')
        .addRole(ServiceRoleEnum.INNOVATOR, 'innovatorRole')
        .save();

      // Add janeInnovator as a collaborator on johnInnovation
      const janeCollaborator = await new InnovationCollaboratorBuilder(entityManager)
        .setUser(janeInnovator.id)
        .setEmail(janeInnovator.email)
        .setRole()
        .setInnovation(johnInnovation.id)
        .save();

      // Add elisaPendingCollaborator as a pending collaborator on johnInnovation
      const elisaPendingCollaborator = await new InnovationCollaboratorBuilder(entityManager)
        .setInnovation(johnInnovation.id)
        .setStatus(InnovationCollaboratorStatusEnum.PENDING)
        .save();

      const sebastiaoCollaborator = await new InnovationCollaboratorBuilder(entityManager)
        .setUser(sebastiaoDeletedInnovator.id)
        .setEmail(sebastiaoDeletedInnovator.email)
        .setInnovation(johnInnovation.id)
        .setStatus(InnovationCollaboratorStatusEnum.LEFT)
        .save();

      // assessment on johnInnovation assigned to Paul (NA)
      // completed and shared with healthOrg
      const johnInnovationAssessmentByPaul = await new InnovationAssessmentBuilder(entityManager)
        .setInnovation(johnInnovation.id)
        .setNeedsAssessor(paulNeedsAssessor.id)
        .setUpdatedBy(paulNeedsAssessor.id)
        .setFinishedAt()
        .suggestOrganisationUnits(healthOrgUnit, innovTechOrgUnit)
        .save();

      // support on johnInnovation by HealthOrgUnit accessors (alice and jamie)
      const johnInnovationSupportByHealthOrgUnit = await new InnovationSupportBuilder(entityManager)
        .setStatus(InnovationSupportStatusEnum.ENGAGING)
        .setInnovation(johnInnovation.id)
        .setOrganisationUnit(healthOrgUnit.id)
        .setAccessors([aliceQualifyingAccessor, jamieMadroxAccessor])
        .save();

      // support on johnInnovation by HealthOrgAIUnit in status FURTHER_INFO
      const johnInnovationSupportByHealthOrgAIUnit = await new InnovationSupportBuilder(entityManager)
        .setStatus(InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED)
        .setInnovation(johnInnovation.id)
        .setOrganisationUnit(healthOrgAiUnit.id)
        .save();
      // Add support logs from HealthOrgAIUnit to johnInnovation
      await new InnovationSupportLogBuilder(entityManager)
        .setInnovation(johnInnovation.id)
        .setCreatedBy(aliceQualifyingAccessor, aliceQualifyingAccessor.roles['qaRole']!)
        .setSupportStatus(InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED)
        .save();
      await new InnovationSupportLogBuilder(entityManager)
        .setInnovation(johnInnovation.id)
        .setCreatedBy(aliceQualifyingAccessor, aliceQualifyingAccessor.roles['qaRole']!)
        .setSupportStatus(InnovationSupportStatusEnum.COMPLETE)
        .save();

      // support on johnInnovation by MedTechOrgUnit accessor (sam)
      const johnInnovationSupportByMedTechOrgUnit = await new InnovationSupportBuilder(entityManager)
        .setStatus(InnovationSupportStatusEnum.ENGAGING)
        .setInnovation(johnInnovation.id)
        .setOrganisationUnit(medTechOrgUnit.id)
        .setAccessors([samAccessor])
        .save();

      // support log on johnInnovation of previous UNASSIGNED support
      const johnInnovationSupportLog = await new InnovationSupportLogBuilder(entityManager)
        .setInnovation(johnInnovation.id)
        .setCreatedBy(aliceQualifyingAccessor, aliceQualifyingAccessor.roles['qaRole']!)
        .setSupportStatus(InnovationSupportStatusEnum.UNASSIGNED)
        .save();

      // action on johnInnovation created by Alice (QA)
      const johnInnovationActionByAlice = await new InnovationActionBuilder(entityManager)
        .setCreatedBy(aliceQualifyingAccessor.id)
        .setCreatedByUserRole(aliceQualifyingAccessor.roles['qaRole']!.id)
        .setUpdatedBy(aliceQualifyingAccessor.id)
        .setUpdatedByUserRole(aliceQualifyingAccessor.roles['qaRole']!.id)
        .setInnovationSection(johnInnovation.sections.get('INNOVATION_DESCRIPTION')!.id)
        .setSupport(johnInnovationSupportByHealthOrgUnit.id)
        .save();

      const johnInnovationActionByAliceSubmitted = await new InnovationActionBuilder(entityManager)
        .setCreatedBy(aliceQualifyingAccessor.id)
        .setCreatedByUserRole(aliceQualifyingAccessor.roles['qaRole']!.id)
        .setUpdatedBy(johnInnovator.id)
        .setUpdatedByUserRole(johnInnovator.roles['innovatorRole']!.id)
        .setInnovationSection(johnInnovation.sections.get('INNOVATION_DESCRIPTION')!.id)
        .setSupport(johnInnovationSupportByHealthOrgUnit.id)
        .setStatus(InnovationActionStatusEnum.SUBMITTED)
        .save();

      // action on johnInnovation created by Paul (NA)
      const johnInnovationActionByPaul = await new InnovationActionBuilder(entityManager)
        .setCreatedBy(paulNeedsAssessor.id)
        .setCreatedByUserRole(paulNeedsAssessor.roles['assessmentRole']!.id)
        .setUpdatedBy(paulNeedsAssessor.id)
        .setUpdatedByUserRole(paulNeedsAssessor.roles['assessmentRole']!.id)
        .setInnovationSection(johnInnovation.sections.get('INNOVATION_DESCRIPTION')!.id)
        .save();

      // action on johnInnovation created by Bart (QA)
      const johnInnovationActionByBart = await new InnovationActionBuilder(entityManager)
        .setCreatedBy(bartQualifyingAccessor.id)
        .setCreatedByUserRole(bartQualifyingAccessor.roles['qaRole']!.id)
        .setUpdatedBy(bartQualifyingAccessor.id)
        .setUpdatedByUserRole(bartQualifyingAccessor.roles['qaRole']!.id)
        .setInnovationSection(johnInnovation.sections.get('INNOVATION_DESCRIPTION')!.id)
        .setSupport(johnInnovationSupportByHealthOrgAIUnit.id)
        .save();

      const johnInnovationThreadByAlice = await (
        await new InnovationThreadBuilder(entityManager)
          .setAuthor(aliceQualifyingAccessor.id, aliceQualifyingAccessor.roles['qaRole']!.id)
          .setInnovation(johnInnovation.id)
          .addMessage(
            { id: aliceQualifyingAccessor.id, roleId: aliceQualifyingAccessor.roles['qaRole']!.id },
            'aliceMessage'
          )
      ).save();

      const johnInnovationThreadByIngrid = await (
        await new InnovationThreadBuilder(entityManager)
          .setAuthor(ingridAccessor.id, ingridAccessor.roles['accessorRole']!.id)
          .setInnovation(johnInnovation.id)
          .addMessage({ id: ingridAccessor.id, roleId: ingridAccessor.roles['accessorRole']!.id }, 'ingridMessage')
      ).save();

      const johnInnovationThreadByPaul = await (
        await (
          await new InnovationThreadBuilder(entityManager)
            .setAuthor(paulNeedsAssessor.id, paulNeedsAssessor.roles['assessmentRole']!.id)
            .setInnovation(johnInnovation.id)
            .addMessage(
              { id: paulNeedsAssessor.id, roleId: paulNeedsAssessor.roles['assessmentRole']!.id },
              'paulMessage'
            )
        ).addMessage({ id: johnInnovator.id, roleId: johnInnovator.roles['innovatorRole']!.id }, 'johnMessage')
      ).save();

      const johnInnovationThreadByJane = await (
        await new InnovationThreadBuilder(entityManager)
          .setAuthor(janeInnovator.id, janeInnovator.roles['innovatorRole']!.id)
          .setInnovation(johnInnovation.id)
          .addMessage({ id: janeInnovator.id, roleId: janeInnovator.roles['innovatorRole']!.id }, 'janeMessage')
      ).save();

      const johnInnovationThreadByJohn = await (
        await new InnovationThreadBuilder(entityManager)
          .setAuthor(johnInnovator.id, johnInnovator.roles['innovatorRole']!.id)
          .setInnovation(johnInnovation.id)
          .addMessage({ id: johnInnovator.id, roleId: johnInnovator.roles['innovatorRole']!.id }, 'johnMessage')
      ).save();

      const johnInnovationExportRequestByAlice = await new InnovationExportRequestBuilder(entityManager)
        .setCreatedBy(aliceQualifyingAccessor.id, healthOrgUnit.id)
        .setInnovation(johnInnovation.id)
        .setStatus(InnovationExportRequestStatusEnum.PENDING)
        .save();

      const johnInnovationExportRequestBySam = await new InnovationExportRequestBuilder(entityManager)
        .setCreatedBy(samAccessor.id, medTechOrgUnit.id)
        .setInnovation(johnInnovation.id)
        .setStatus(InnovationExportRequestStatusEnum.PENDING)
        .save();

      // John Innovation Files
      // Keep in mind that createdAt order of this files matter.
      const johnInnovationSectionFileUploadedByJohn = await new InnovationFileBuilder(entityManager)
        .setContext({
          id: 'INNOVATION_DESCRIPTION',
          type: InnovationFileContextTypeEnum.INNOVATION_SECTION
        })
        .setName('AAAAAAAAAAAAAA')
        .setCreatedByUserRole(johnInnovator.roles['innovatorRole']!.id)
        .setInnovation(johnInnovation.id)
        .save();

      const johnInnovationSectionFileUploadedByJane = await new InnovationFileBuilder(entityManager)
        .setContext({
          id: 'INNOVATION_DESCRIPTION',
          type: InnovationFileContextTypeEnum.INNOVATION_SECTION
        })
        .setCreatedByUserRole(janeInnovator.roles['innovatorRole']!.id)
        .setInnovation(johnInnovation.id)
        .save();

      const johnInnovationInnovationFileUploadedByPaul = await new InnovationFileBuilder(entityManager)
        .setContext({
          id: johnInnovation.id,
          type: InnovationFileContextTypeEnum.INNOVATION
        })
        .setCreatedByUserRole(paulNeedsAssessor.roles['assessmentRole']!.id)
        .setDescription(null)
        .setSize(null)
        .setInnovation(johnInnovation.id)
        .save();

      const johnInnovationInnovationFileUploadedBySean = await new InnovationFileBuilder(entityManager)
        .setContext({
          id: johnInnovation.id,
          type: InnovationFileContextTypeEnum.INNOVATION
        })
        .setCreatedByUserRole(seanNeedsAssessor.roles['assessmentRole']!.id)
        .setInnovation(johnInnovation.id)
        .save();

      const johnInnovationInnovationFileUploadedByAlice = await new InnovationFileBuilder(entityManager)
        .setContext({
          id: johnInnovation.id,
          type: InnovationFileContextTypeEnum.INNOVATION
        })
        .setCreatedByUserRole(aliceQualifyingAccessor.roles['qaRole']!.id)
        .setInnovation(johnInnovation.id)
        .save();

      const johnInnovationInnovationFileUploadedByIngrid = await new InnovationFileBuilder(entityManager)
        .setContext({
          id: johnInnovation.id,
          type: InnovationFileContextTypeEnum.INNOVATION
        })
        .setName('AAAAAAAAAAAAAB')
        .setCreatedByUserRole(ingridAccessor.roles['accessorRole']!.id)
        .setInnovation(johnInnovation.id)
        .save();

      const johnInnovationInnovationFileUploadedByJamieWithAiRole = await new InnovationFileBuilder(entityManager)
        .setContext({
          id: johnInnovation.id,
          type: InnovationFileContextTypeEnum.INNOVATION
        })
        .setCreatedByUserRole(jamieMadroxAccessor.roles['aiRole']!.id)
        .setInnovation(johnInnovation.id)
        .save();

      const johnInnovationInnovationFileUploadedBySebastiaoDeletedUser = await new InnovationFileBuilder(entityManager)
        .setContext({
          id: johnInnovation.id,
          type: InnovationFileContextTypeEnum.INNOVATION
        })
        .setCreatedByUserRole(sebastiaoDeletedInnovator.roles['innovatorRole']!.id)
        .setInnovation(johnInnovation.id)
        .save();

      const johnInnovationInnovationFileUploadedAfterTodayByJohn = await new InnovationFileBuilder(entityManager)
        .setContext({
          id: johnInnovation.id,
          type: InnovationFileContextTypeEnum.INNOVATION
        })
        .setCreatedByUserRole(johnInnovator.roles['innovatorRole']!.id)
        .setCreatedAt(randSoonDate())
        .setInnovation(johnInnovation.id)
        .save();

      const johnInnovationTransferToJane = await new InnovationTransferBuilder(entityManager)
        .setStatus(InnovationTransferStatusEnum.PENDING)
        .setEmail(janeInnovator.email)
        .setInnovation(johnInnovation)
        .setCreatedBy(johnInnovator)
        .save();

      const johnInnovationNotificationFromMessage = await new NotificationBuilder(entityManager)
        .addNotificationUser(johnInnovator)
        .setInnovation(johnInnovation.id)
        .setContext(
          NotificationContextTypeEnum.THREAD,
          NotificationContextDetailEnum.THREAD_MESSAGE_CREATION,
          randUuid()
        )
        .save();

      const johnInnovationNotificationFromSupport = await new NotificationBuilder(entityManager)
        .addNotificationUser(johnInnovator)
        .setInnovation(johnInnovation.id)
        .setContext(
          NotificationContextTypeEnum.SUPPORT,
          NotificationContextDetailEnum.SUPPORT_STATUS_UPDATE,
          randUuid()
        )
        .save();

      // Progress updates on John innovation
      const johnInnovationAliceProgressUpdate = await new InnovationSupportLogBuilder(entityManager)
        .setInnovation(johnInnovation.id)
        .setSupportStatus(InnovationSupportStatusEnum.ENGAGING)
        .setCreatedBy(aliceQualifyingAccessor, aliceQualifyingAccessor.roles['qaRole']!)
        .setLogType(InnovationSupportLogTypeEnum.PROGRESS_UPDATE)
        .setParams({ title: randText() })
        .save();

      const johnInnovationIngridProgressUpdateWithFile = await new InnovationSupportLogBuilder(entityManager)
        .setInnovation(johnInnovation.id)
        .setSupportStatus(InnovationSupportStatusEnum.ENGAGING)
        .setCreatedBy(ingridAccessor, ingridAccessor.roles['accessorRole']!)
        .setLogType(InnovationSupportLogTypeEnum.PROGRESS_UPDATE)
        .setParams({ title: randText() })
        .save();

      const johnInnovationProgressUpdateFileUploadedByIngrid = await new InnovationFileBuilder(entityManager)
        .setContext({
          id: johnInnovationIngridProgressUpdateWithFile.id,
          type: InnovationFileContextTypeEnum.INNOVATION_PROGRESS_UPDATE
        })
        .setCreatedByUserRole(ingridAccessor.roles['accessorRole']!.id)
        .setInnovation(johnInnovation.id)
        .save();

      // Alice suggested innovTechHeavyOrgUnit
      await new InnovationSupportLogBuilder(entityManager)
        .setInnovation(johnInnovation.id)
        .setSupportStatus(InnovationSupportStatusEnum.ENGAGING)
        .setCreatedBy(aliceQualifyingAccessor, aliceQualifyingAccessor.roles['qaRole']!)
        .setLogType(InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION)
        .setSuggestedUnits([innovTechHeavyOrgUnit.id])
        .save();

      // Adam Innovator specs:
      // 1 innovation in status 'CREATED' with transfer in status 'PENDING' to external user. The innovation is shared with
      // healthOrg
      const adamInnovator = await new UserBuilder(entityManager)
        .setName('Adam Innovator')
        .addRole(ServiceRoleEnum.INNOVATOR, 'innovatorRole')
        .save();

      const adamInnovation = await new InnovationBuilder(entityManager)
        .setOwner(adamInnovator.id)
        .setStatus(InnovationStatusEnum.IN_PROGRESS)
        .addSection('INNOVATION_DESCRIPTION')
        .addSection('COST_OF_INNOVATION')
        .shareWith([healthOrg])
        .save();

      const adamInnovationEmpty = await new InnovationBuilder(entityManager)
        .setOwner(adamInnovator.id)
        .setStatus(InnovationStatusEnum.IN_PROGRESS)
        .save();

      const adamInnovationTransferToJane = await new InnovationTransferBuilder(entityManager)
        .setStatus(InnovationTransferStatusEnum.PENDING)
        .setEmail(janeInnovator.email)
        .setInnovation(adamInnovation)
        .setCreatedBy(adamInnovator)
        .save();

      // Adam pending collaboration to john innovation
      const adamCollaborator = await new InnovationCollaboratorBuilder(entityManager)
        .setUser(adamInnovator.id)
        .setEmail(adamInnovator.email)
        .setRole()
        .setInnovation(johnInnovation.id)
        .setStatus(InnovationCollaboratorStatusEnum.PENDING)
        .save();

      // support on adamInnovation by HealthOrgUnit accessors (alice and jamie)
      const adamInnovationSupportByHealthOrgUnit = await new InnovationSupportBuilder(entityManager)
        .setStatus(InnovationSupportStatusEnum.ENGAGING)
        .setInnovation(adamInnovation.id)
        .setOrganisationUnit(healthOrgUnit.id)
        .setAccessors([aliceQualifyingAccessor, jamieMadroxAccessor])
        .save();

      const adamInnovationActionBySean = await new InnovationActionBuilder(entityManager)
        .setCreatedBy(seanNeedsAssessor.id)
        .setCreatedByUserRole(seanNeedsAssessor.roles['assessmentRole']!.id)
        .setUpdatedBy(seanNeedsAssessor.id)
        .setUpdatedByUserRole(seanNeedsAssessor.roles['assessmentRole']!.id)
        .setInnovationSection(adamInnovation.sections.get('INNOVATION_DESCRIPTION')!.id)
        .save();

      const adamInnovationCompletedActionByAlice = await new InnovationActionBuilder(entityManager)
        .setCreatedBy(aliceQualifyingAccessor.id)
        .setCreatedByUserRole(aliceQualifyingAccessor.roles['qaRole']!.id)
        .setUpdatedBy(aliceQualifyingAccessor.id)
        .setUpdatedByUserRole(aliceQualifyingAccessor.roles['qaRole']!.id)
        .setInnovationSection(adamInnovation.sections.get('COST_OF_INNOVATION')!.id)
        .setSupport(adamInnovationSupportByHealthOrgUnit.id)
        .setStatus(InnovationActionStatusEnum.COMPLETED)
        .save();

      // Otto Innovator specs:
      // This innovator has more than one innovation being supported
      // 2 innovations currently being supported
      // 1 innovation with assessment in progress
      // 1 innovation created
      const ottoOctaviusInnovator = await new UserBuilder(entityManager)
        .setName('Otto Octavius')
        .addRole(ServiceRoleEnum.INNOVATOR, 'innovatorRole')
        .save();

      const chestHarnessInnovation = await new InnovationBuilder(entityManager)
        .setOwner(ottoOctaviusInnovator.id)
        .save();

      const chestHarnessInnovationSupport = await new InnovationSupportBuilder(entityManager)
        .setStatus(InnovationSupportStatusEnum.ENGAGING)
        .setInnovation(chestHarnessInnovation.id)
        .setOrganisationUnit(healthOrgUnit.id)
        .setAccessors([aliceQualifyingAccessor, jamieMadroxAccessor])
        .save();

      const tentaclesInnovation = await new InnovationBuilder(entityManager).setOwner(ottoOctaviusInnovator.id).save();

      const tentaclesInnovationSupport = await new InnovationSupportBuilder(entityManager)
        .setStatus(InnovationSupportStatusEnum.ENGAGING)
        .setInnovation(tentaclesInnovation.id)
        .setOrganisationUnit(healthOrgUnit.id)
        .setAccessors([jamieMadroxAccessor])
        .save();

      const brainComputerInterfaceInnovation = await new InnovationBuilder(entityManager)
        .setOwner(ottoOctaviusInnovator.id)
        .setStatus(InnovationStatusEnum.NEEDS_ASSESSMENT)
        .addSection('INNOVATION_DESCRIPTION')
        .save();

      const brainComputerInterfaceInnovationAssessment = await new InnovationAssessmentBuilder(entityManager)
        .setInnovation(brainComputerInterfaceInnovation.id)
        .setNeedsAssessor(paulNeedsAssessor.id)
        .setUpdatedBy(paulNeedsAssessor.id)
        .save();

      const powerSourceInnovation = await new InnovationBuilder(entityManager)
        .setOwner(ottoOctaviusInnovator.id)
        .setStatus(InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT)
        .addSection('INNOVATION_DESCRIPTION')
        .save();

      return {
        users: {
          // Innovators
          johnInnovator: {
            ...johnInnovator,
            roles: { innovatorRole: johnInnovator.roles['innovatorRole']! },
            innovations: {
              johnInnovationEmpty: johnInnovationEmpty,
              johnInnovation: {
                ...johnInnovation,
                supports: {
                  supportByHealthOrgUnit: {
                    ...johnInnovationSupportByHealthOrgUnit,
                    accessors: [aliceQualifyingAccessor, jamieMadroxAccessor]
                  },
                  supportByHealthOrgAiUnit: { ...johnInnovationSupportByHealthOrgAIUnit },
                  supportByMedTechOrgUnit: { ...johnInnovationSupportByMedTechOrgUnit, accessors: [samAccessor] },
                  supportLog: johnInnovationSupportLog
                },
                assessment: {
                  ...johnInnovationAssessmentByPaul,
                  assignedTo: paulNeedsAssessor,
                  suggestedOrganisationUnits: { healthOrgUnit }
                },
                actions: {
                  actionByAlice: johnInnovationActionByAlice,
                  actionByAliceSubmitted: johnInnovationActionByAliceSubmitted,
                  actionByBart: johnInnovationActionByBart,
                  actionByPaul: johnInnovationActionByPaul
                },
                threads: {
                  threadByAliceQA: {
                    ...johnInnovationThreadByAlice,
                    messages: { aliceMessage: johnInnovationThreadByAlice.messages['aliceMessage']! }
                  },
                  threadByPaulNA: {
                    ...johnInnovationThreadByPaul,
                    messages: {
                      paulMessage: johnInnovationThreadByPaul.messages['paulMessage']!,
                      johnMessage: johnInnovationThreadByPaul.messages['johnMessage']!
                    }
                  },
                  threadByIngridAccessor: {
                    ...johnInnovationThreadByIngrid,
                    messages: { ingridMessage: johnInnovationThreadByIngrid.messages['ingridMessage']! }
                  },
                  threadByJaneCollaborator: {
                    ...johnInnovationThreadByJane,
                    messages: { janeMessage: johnInnovationThreadByJane.messages['janeMessage']! }
                  },
                  threadByJohn: {
                    ...johnInnovationThreadByJohn,
                    messages: { johnMessage: johnInnovationThreadByJohn.messages['johnMessage']! }
                  }
                },
                exportRequests: {
                  requestByAlice: johnInnovationExportRequestByAlice,
                  requestBySam: johnInnovationExportRequestBySam
                },
                collaborators: {
                  adamCollaborator: adamCollaborator,
                  elisaPendingCollaborator: elisaPendingCollaborator,
                  janeCollaborator: janeCollaborator,
                  sebastiaoCollaborator: sebastiaoCollaborator
                },
                sections: {
                  INNOVATION_DESCRIPTION: johnInnovation.sections.get('INNOVATION_DESCRIPTION')!,
                  EVIDENCE_OF_EFFECTIVENESS: johnInnovation.sections.get('EVIDENCE_OF_EFFECTIVENESS')!
                },
                files: {
                  sectionFileByJohn: johnInnovationSectionFileUploadedByJohn,
                  sectionFileByJane: johnInnovationSectionFileUploadedByJane,
                  innovationFileByPaul: johnInnovationInnovationFileUploadedByPaul,
                  innovationFileBySean: johnInnovationInnovationFileUploadedBySean,
                  innovationFileByAlice: johnInnovationInnovationFileUploadedByAlice,
                  innovationFileByIngrid: johnInnovationInnovationFileUploadedByIngrid,
                  innovationFileByJamieWithAiRole: johnInnovationInnovationFileUploadedByJamieWithAiRole,
                  innovationFileByDeletedUser: johnInnovationInnovationFileUploadedBySebastiaoDeletedUser,
                  innovationFileUploadedAfterToday: johnInnovationInnovationFileUploadedAfterTodayByJohn,
                  progressUpdateFileByIngrid: johnInnovationProgressUpdateFileUploadedByIngrid
                },
                transfer: johnInnovationTransferToJane,
                notifications: {
                  notificationsFromMessage: johnInnovationNotificationFromMessage,
                  notificationFromSupport: johnInnovationNotificationFromSupport
                },
                progressUpdates: {
                  progressUpdateByAlice: johnInnovationAliceProgressUpdate,
                  progressUpdateByIngridWithFile: johnInnovationIngridProgressUpdateWithFile
                }
              }
            }
          },
          janeInnovator: {
            ...janeInnovator,
            roles: { innovatorRole: janeInnovator.roles['innovatorRole']! },
            innovations: {
              johnInnovation: johnInnovation
            }
          },
          adamInnovator: {
            ...adamInnovator,
            roles: { innovatorRole: adamInnovator.roles['innovatorRole']! },
            innovations: {
              adamInnovation: {
                ...adamInnovation,
                transfer: adamInnovationTransferToJane,
                actions: {
                  adamInnovationActionByPaul: adamInnovationActionBySean,
                  adamInnovationCompletedActionByAlice
                },
                supports: {
                  adamInnovationSupportByHealthOrgUnit: adamInnovationSupportByHealthOrgUnit
                }
              },
              adamInnovationEmpty: adamInnovationEmpty
            }
          },
          sebastiaoDeletedInnovator: {
            ...sebastiaoDeletedInnovator,
            roles: { innovatorRole: sebastiaoDeletedInnovator.roles['innovatorRole']! }
          },
          ottoOctaviusInnovator: {
            ...ottoOctaviusInnovator,
            roles: { innovatorRole: ottoOctaviusInnovator.roles['innovatorRole']! },
            innovations: {
              chestHarnessInnovation: {
                ...chestHarnessInnovation,
                supports: { chestHarnessInnovationSupport: chestHarnessInnovationSupport }
              },
              tentaclesInnovation: {
                ...tentaclesInnovation,
                supports: { tentaclesInnovationSupport: tentaclesInnovationSupport }
              },
              brainComputerInterfaceInnovation: {
                ...brainComputerInterfaceInnovation,
                assessmentInProgress: brainComputerInterfaceInnovationAssessment
              },
              powerSourceInnovation: powerSourceInnovation
            }
          },
          // Accessors
          aliceQualifyingAccessor: {
            ...aliceQualifyingAccessor,
            roles: { qaRole: aliceQualifyingAccessor.roles['qaRole']! },
            organisations: {
              healthOrg: {
                ...aliceQualifyingAccessor.organisations['Health Organisation']!,
                organisationUnits: {
                  healthOrgUnit:
                    aliceQualifyingAccessor.organisations['Health Organisation']!.organisationUnits['Health Org Unit']!
                }
              }
            }
          },
          ingridAccessor: {
            ...ingridAccessor,
            roles: { accessorRole: ingridAccessor.roles['accessorRole']! },
            organisations: {
              healthOrg: {
                ...ingridAccessor.organisations['Health Organisation']!,
                organisationUnits: {
                  healthOrgUnit:
                    ingridAccessor.organisations['Health Organisation']!.organisationUnits['Health Org Unit']!
                }
              }
            }
          },
          jamieMadroxAccessor: {
            ...jamieMadroxAccessor,
            roles: {
              healthAccessorRole: jamieMadroxAccessor.roles['healthAccessorRole']!,
              aiRole: jamieMadroxAccessor.roles['aiRole']!
            },
            organisations: {
              healthOrg: {
                ...jamieMadroxAccessor.organisations['Health Organisation']!,
                organisationUnits: {
                  healthOrgUnit:
                    jamieMadroxAccessor.organisations['Health Organisation']!.organisationUnits['Health Org Unit']!,
                  healthOrgAiUnit:
                    jamieMadroxAccessor.organisations['Health Organisation']!.organisationUnits['Health Org AI Unit']!
                }
              }
            }
          },
          scottQualifyingAccessor: {
            ...scottQualifyingAccessor,
            roles: { qaRole: scottQualifyingAccessor.roles['qaRole']! },
            organisations: {
              medTechOrg: {
                ...scottQualifyingAccessor.organisations['MedTech Organisation']!,
                organisationUnits: {
                  medTechOrgUnit:
                    scottQualifyingAccessor.organisations['MedTech Organisation']!.organisationUnits[
                      'MedTech Org Unit'
                    ]!
                }
              }
            }
          },
          samAccessor: {
            ...samAccessor,
            roles: { accessorRole: samAccessor.roles['accessorRole']! },
            organisations: {
              medTechOrg: {
                ...samAccessor.organisations['MedTech Organisation']!,
                organisationUnits: {
                  medTechOrgUnit:
                    samAccessor.organisations['MedTech Organisation']!.organisationUnits['MedTech Org Unit']!
                }
              }
            }
          },
          sarahQualifyingAccessor: {
            ...sarahQualifyingAccessor,
            roles: { qaRole: sarahQualifyingAccessor.roles['qaRole']! },
            organisations: {
              healthOrg: {
                ...sarahQualifyingAccessor.organisations['Health Organisation']!,
                organisationUnits: {
                  healthOrgAiUnit:
                    sarahQualifyingAccessor.organisations['Health Organisation']!.organisationUnits[
                      'Health Org AI Unit'
                    ]!
                }
              }
            }
          },
          bartQualifyingAccessor: {
            ...bartQualifyingAccessor,
            roles: { qaRole: bartQualifyingAccessor.roles['qaRole']! },
            organisations: {
              healthOrg: {
                ...bartQualifyingAccessor.organisations['Health Organisation']!,
                organisationUnits: {
                  healthOrgAiUnit:
                    bartQualifyingAccessor.organisations['Health Organisation']!.organisationUnits[
                      'Health Org AI Unit'
                    ]!
                }
              }
            }
          },
          // Needs assessors
          paulNeedsAssessor: {
            ...paulNeedsAssessor,
            roles: { assessmentRole: paulNeedsAssessor.roles['assessmentRole']! }
          },
          seanNeedsAssessor: {
            ...seanNeedsAssessor,
            roles: { assessmentRole: seanNeedsAssessor.roles['assessmentRole']! }
          },
          // Admins
          allMighty: {
            ...allMighty,
            roles: { admin: allMighty.roles['adminRole']! }
          }
        },
        organisations: {
          healthOrg: {
            ...healthOrg,
            organisationUnits: {
              healthOrgUnit: healthOrgUnit,
              healthOrgAiUnit: healthOrgAiUnit
            }
          },
          medTechOrg: {
            ...medTechOrg,
            organisationUnits: {
              medTechOrgUnit: medTechOrgUnit
            }
          },
          innovTechOrg: {
            ...innovTechOrg,
            organisationUnits: {
              innovTechOrgUnit: innovTechOrgUnit,
              innovTechHeavyOrgUnit: innovTechHeavyOrgUnit
            }
          },
          inactiveEmptyOrg: {
            ...inactiveEmptyOrg,
            organisationUnits: {
              inactiveEmptyOrgUnit: inactiveEmptyOrgUnit
            }
          }
        }
      };
    });
    this.scenario = res;
    return res;
  }

  getScenario(): CompleteScenarioType {
    return this.scenario;
  }

  getIdentityMap(): ReadonlyMap<string, TestUserType> {
    if (!this.identityMap) {
      this.loadMaps();
    }
    return this.identityMap;
  }

  getUserMap(): ReadonlyMap<string, TestUserType> {
    if (!this.identityMap) {
      this.loadMaps();
    }
    return this.userMap;
  }

  getEmailMap(): ReadonlyMap<string, TestUserType> {
    if (!this.identityMap) {
      this.loadMaps();
    }
    return this.emailMap;
  }

  loadMaps(): void {
    this.identityMap = new Map();
    this.userMap = new Map();
    this.emailMap = new Map();
    for (const user of Object.values(this.scenario.users)) {
      this.identityMap.set(user.identityId, user);
      this.userMap.set(user.id, user);
      this.emailMap.set(user.email, user);
    }
  }
}
