# ERD

```mermaid
---
title: Innovation Service
---
erDiagram
  %% TABLES  
  ACTIVITY_LOG {
    uuid id PK
    enum type
    enum activity
    simple-json param
    uuid userRoleId FK
    uuid innovationId FK
  }
  ACTIVITY_LOG ||--o| USER_ROLE : createdBy
  ACTIVITY_LOG ||--o| INNOVATION : belongsTo

  ANNOUNCEMENT {
    uuid id PK
    enum status
    nvarchar title
    simple-array userRoles
    datetime2 startsAt
    datetime2 expiresAt
    simple-json params
    enum type
    simple-json filters
    bit sendEmail
  }
  ANNOUNCEMENT_USER {
    uuid id PK
    datetime2 readAt
    uuid announcementId FK
    uuid userId FK
    uuid innovationId FK
  }
  ANNOUNCEMENT ||--o{ ANNOUNCEMENT_USER : has
  ANNOUNCEMENT_USER ||--o| ANNOUNCEMENT : belongsTo
  ANNOUNCEMENT_USER ||--o| USER : is
  ANNOUNCEMENT_USER ||--o| INNOVATION : belongsTo

  AUDIT {
    uuid id PK
    uuid userId FK
    datetime2 date
    enum action
    enum target
    uuid targetId
    uuid innovationId FK
    nvarchar invocationId
    nvarchar functionName
  }
  AUDIT ||--o| USER_ROLE : createdBy
  AUDIT ||--o| INNOVATION : belongsTo

  INNOVATION {
    uuid id PK
    string name
    string uniqueId UK
    enum status
    datetime2 statusUpdatedAt
    datetime2 expires_at
    datetime2 submittedAt
    datetime2 lastAssessmentRequestAt
    enum archiveReason
    bit hasBeenAssessed
    uuid ownerId FK
    uuid currentAssessmentId FK
    uuid currentMajorAssessmentId FK
  }
  INNOVATION_SHARE {
    uuid innovationId PK,FK
    uuid organisationId PK,FK
  }
  INNOVATION ||--o| USER : hasAnOwner
  INNOVATION ||--o{ INNOVATION_SHARE : sharedWith
  INNOVATION_SHARE ||--|| ORGANISATION : sharedWith
  INNOVATION ||--o| INNOVATION_ASSESSMENT : hasCurrent
  INNOVATION ||--o| INNOVATION_ASSESSMENT : hasCurrentMajor
  INNOVATION ||--o{ INNOVATION_ASSESSMENT : has
  INNOVATION ||--o{ INNOVATION_SECTION : has
  INNOVATION ||--o{ INNOVATION_SUPPORT : has
  INNOVATION ||--o{ INNOVATION_SUPPORT_LOG : has
  INNOVATION ||--o{ NOTIFICATION : has
  INNOVATION ||--o{ INNOVATION_REASSESSMENT_REQUEST : requests
  INNOVATION ||--o{ INNOVATION_EXPORT_REQUEST : requests
  INNOVATION ||--|| INNOVATION_GROUPED_STATUS_VIEW : has
  INNOVATION ||--o{ INNOVATION_COLLABORATOR : has
  INNOVATION ||--|| INNOVATION_DOCUMENT : has
  INNOVATION ||--|| INNOVATION_DOCUMENT_DRAFT : has
  INNOVATION ||--o{ INNOVATION_TRANSFER : has
  INNOVATION ||--o{ INNOVATION_SUGGESTED_UNITS_VIEW : suggested
    
  INNOVATION_ASSESSMENT {
    uuid id PK
    smallint majorVersion
    smallint minorVersion
    nvarchar editReason
    nvarchar description
    nvarchar summary
    enum maturityLevel
    nvarchar maturityLevelComment
    datetime2 startedAt
    datetime2 finishedAt
    enum hasRegulatoryApprovals
    nvarchar hasRegulatoryApprovalsComment
    enum hasEvidence
    nvarchar hasEvidenceComment
    enum hasValidation
    nvarchar hasValidationComment
    enum hasProposition
    nvarchar hasPropositionComment
    enum hasCompetitionKnowledge
    nvarchar hasCompetitionKnowledgeComment
    enum hasImplementationPlan
    nvarchar hasImplementationPlanComment
    enum hasScaleResource
    nvarchar hasScaleResourceComment
    enum exemptedReason
    nvarchar exemptedMessage
    datetime2 exemptedAt
    uuid innovationId FK
    uuid assignTo FK
    uuid previousAssessmentId FK
  }
  INNOVATION_ASSESSMENT_ORGANISATION_UNIT {
    uuid innovationAssessmentId PK,FK
    uuid organisationUnitId PK,FK
  }
  INNOVATION_ASSESSMENT ||--|| INNOVATION : assesses
  INNOVATION_ASSESSMENT ||--o| USER : assignedTo
  INNOVATION_ASSESSMENT ||--o| INNOVATION_ASSESSMENT : previous
  INNOVATION_ASSESSMENT ||--o| INNOVATION_REASSESSMENT_REQUEST : createdFrom
  INNOVATION_ASSESSMENT ||--o{ INNOVATION_ASSESSMENT_ORGANISATION_UNIT : suggested
  INNOVATION_ASSESSMENT_ORGANISATION_UNIT ||--|| ORGANISATION_UNIT: suggested
  INNOVATION_ASSESSMENT_ORGANISATION_UNIT ||--|| INNOVATION_ASSESSMENT: belongsTo

  INNOVATION_COLLABORATOR {
    uuid id PK
    enum status
    nvarchar email
    nvarchar collaboratorRole
    datetime2 invitedAt
    uuid innovationId FK
    uuid userId FK
  }
  INNOVATION_COLLABORATOR ||--o| USER : is
  INNOVATION_COLLABORATOR ||--o| INNOVATION : collaboratesWith
  
  INNOVATION_DOCUMENT {
    uuid id PK,FK
    simple-json document
    nvarchar version
    boolean isSnapshot
    nvarchar description
  }
  INNOVATION_DOCUMENT_DRAFT {
    uuid id PK,FK
    simple-json document
    nvarchar version
  }
  INNOVATION_DOCUMENT ||--o| INNOVATION : belongsTo
  INNOVATION_DOCUMENT_DRAFT ||--o| INNOVATION : belongsTo

  INNOVATION_EXPORT_REQUEST {
    uuid id PK
    enum status
    varchar requestReason
    varchar rejectReason
    uuid innovationId FK
    uuid createdByUserRole FK
  }
  INNOVATION_EXPORT_REQUEST ||--o| INNOVATION : belongsTo
  INNOVATION_EXPORT_REQUEST ||--o| USER_ROLE : createdBy

  INNOVATION_FILE {
    uuid id PK
    nvarchar storageId
    enum contextType
    nvarchar contextId
    nvarchar name
    nvarchar description
    nvarchar filename
    int filesize
    nvarchar extension
    uuid innovationId FK
    uuid createdByUserRoleId FK
  }
  INNOVATION_FILE ||--o| INNOVATION : belongsTo
  INNOVATION_FILE ||--o| USER_ROLE : createdBy

  INNOVATION_REASSESSMENT_REQUEST {
    uuid id
    enum updatedInnovationRecord
    nvarchar description
    simple-array reassessmentReason
    nvarchar otherReassessmentReason
    nvarchar whatSupportDoYouNeed
    uuid innovationId
    uuid innovationAssessmentId
  }
  INNOVATION_REASSESSMENT_REQUEST ||--|| INNOVATION : belongsTo
  INNOVATION_REASSESSMENT_REQUEST ||--|| INNOVATION_ASSESSMENT : creates

  INNOVATION_RECORD_SCHEMA {
    int version PK
    simple-json schema
  }

  INNOVATION_SECTION {
    uuid id PK
    enum section
    enum status
    datetime2 submittedAt
    uuid submittedBy
    uuid innovationId FK
  }
  INNOVATION_SECTION ||--|| USER : submittedBy
  INNOVATION_SECTION ||--o{ INNOVATION_TASK : has
  
  INNOVATION_SHARE_LOG {
    datetime2 createdAt PK
    uuid innovationId PK,FK
    uuid organisationId PK,FK
    enum operation
  }
  
  INNOVATION_SUPPORT {
    uuid id PK
    enum status
    enum closeReason
    datetime2 startedAt
    datetime2 finishedAt
    boolean isMostRecent
    uuid innovationId FK
    uuid majorAssessmentId FK
    uuid organisationUnitId FK

  }
  INNOVATION_SUPPORT_USER {
    uuid innovationSupportId PK,FK
    uuid userRoleId PK,FK
  }
  INNOVATION_SUPPORT ||--o| INNOVATION : supports
  INNOVATION_SUPPORT ||--o| INNOVATION_ASSESSMENT : assessedBy
  INNOVATION_SUPPORT ||--o| ORGANISATION_UNIT : supportBy
  INNOVATION_SUPPORT ||--o{ INNOVATION_SUPPORT_USER : assigned
  INNOVATION_SUPPORT_USER ||--|| USER_ROLE : assigned
  INNOVATION_SUPPORT ||--o{ INNOVATION_TASK : has
  INNOVATION_SUPPORT ||--|| INNOVATION_SUPPORT_LAST_ACTIVITY_UPDATE_VIEW : lastActivity

  INNOVATION_SUPPORT_LOG {
    uuid id PK
    enum type
    enum innovationSupportStatus
    nvarchar description
    simple-json params
    uuid innovationId FK
    uuid majorAssessmentId FK
    uuid organisationUnitId FK
    uuid createdByUserRoleId FK
  }
  INNOVATION_SUPPORT_LOG_ORGANISATION_UNIT {
    uuid innovationSupportLogId PK,FK
    uuid organisationUnitId PK,FK
  }
  INNOVATION_SUPPORT_LOG ||--|| INNOVATION : belongsTo
  INNOVATION_SUPPORT_LOG ||--|| INNOVATION_ASSESSMENT : majorAssessment
  INNOVATION_SUPPORT_LOG ||--o| ORGANISATION_UNIT : createdBy
  INNOVATION_SUPPORT_LOG ||--|| USER_ROLE : createdBy
  INNOVATION_SUPPORT_LOG ||--o{ INNOVATION_SUPPORT_LOG_ORGANISATION_UNIT : suggested
  INNOVATION_SUPPORT_LOG_ORGANISATION_UNIT ||--|| ORGANISATION_UNIT : suggested

  INNOVATION_SURVEY {
    uuid id PK
    enum type
    uuid contextId
    simple-json answers
    datetime2 createdAt
    datetime2 updatedAt
    datetime2 deletedAt
    uuid innovationId FK
    uuid targetUserRoleId FK
  }
  INNOVATION_SURVEY ||--|| INNOVATION : belongsTo
  INNOVATION_SURVEY ||--|| USER_ROLE : inquires
  INNOVATION_SURVEY ||--o| INNOVATION_SUPPORT : relatedTo

  INNOVATION_TASK {
    uuid id PK
    nvarchar displayId
    enum status
    uuid innovationSectionId FK
    uuid innovationSupportId FK
    uuid createdByUserRoleId FK
    uuid updatedByUserRoleId FK
  }
  INNOVATION_TASK ||--o| INNOVATION_SECTION : affects
  INNOVATION_TASK ||--o| INNOVATION_SUPPORT : relatedTo
  INNOVATION_TASK ||--o| USER_ROLE : createdBy
  INNOVATION_TASK ||--o| USER_ROLE : updatedBy
  INNOVATION_TASK ||--o{ INNOVATION_TASK_DESCRIPTIONS_VIEW : has
  INNOVATION_TASK ||--o{ INNOVATION_TASK_MESSAGE: has
  INNOVATION_TASK_MESSAGE {
    uuid innovationTaskId PK,FK
    uuid innovationThreadMessageId PK,FK
    enum status
  }
  INNOVATION_TASK_MESSAGE ||--|| INNOVATION_TASK: belongsTo
  INNOVATION_TASK_MESSAGE ||--|| INNOVATION_THREAD_MESSAGE: has

  INNOVATION_THREAD {
    uuid id PK
    string subject
    enum contextType
    uuid contextId
    uuid innovationId FK
    uuid authorId FK
    uuid authorUserRoleId FK
  }
  INNOVATION_THREAD_FOLLOWER{
    uuid innovationThreadId PK,FK
    uuid userRoleId PK,FK
  }
  INNOVATION_THREAD ||--o| INNOVATION : belongsTo
  INNOVATION_THREAD ||--o| USER : authoredBy
  INNOVATION_THREAD ||--o| USER_ROLE : authoredBy
  INNOVATION_THREAD ||--o{ INNOVATION_THREAD_FOLLOWER : followedBy
  INNOVATION_THREAD_FOLLOWER ||--|| USER_ROLE: followedBy
  INNOVATION_THREAD ||--o{ INNOVATION_THREAD_MESSAGE : has
  
  INNOVATION_THREAD_MESSAGE {
    uuid id PK
    nvarchar message
    bit isEditable
    uuid innovationThreadId FK
    uuid authorId FK
    uuid authorOrganisationUnit FK
    uuid authorUserRoleId FK
  }
  INNOVATION_THREAD_MESSAGE ||--o| INNOVATION_THREAD : belongsTo
  INNOVATION_THREAD_MESSAGE ||--o| USER : authoredBy
  INNOVATION_THREAD_MESSAGE ||--o| USER_ROLE : authoredBy
  INNOVATION_THREAD_MESSAGE ||--o| ORGANISATION_UNIT : authoredBy

  INNOVATION_TRANSFER {
    uuid id PK
    enum status
    nvarchar email
    int emailCount
    datetime2 finishedAt
    bit ownerToCollaborator
    uuid innovationId FK
  }
  INNOVATION_TRANSFER ||--|| INNOVATION: relatedTo

  MIGRATIONS {
    int id PK
    bigint timestamp
    varchar name
  }

  NOTIFICATION {
    uuid id PK
    enum contextType
    enum contextDetail
    uuid contextId
    simple-json params
    uuid innovationId FK
  }
  NOTIFICATION ||--o{ NOTIFICATION_USER : notifies
  
  NOTIFICATION_USER {
    bigint id PK
    datetime2 readAt
    uuid notificationId FK
    uuid userRoleId FK
  }
  NOTIFICATION_USER ||--|| NOTIFICATION: belongsTo
  NOTIFICATION_USER ||--|| USER_ROLE : is

  NOTIFICATION_PREFERENCE {
    uuid userRoleId PK,FK
    simple-json preferences
  }
  NOTIFICATION_PREFERENCE ||--|| USER_ROLE : belongsTo

  NOTIFICATION_SCHEDULE {
    uuid subscriptionId PK,FK
    datetime2 sendDate
  }
  NOTIFICATION_SCHEDULE ||--|| NOTIFY_ME_SUBSCRIPTION: belongsTo

  NOTIFY_ME_SUBSCRIPTION {
    uuid id PK
    enum eventType
    enum subscriptionType
    simple-json config
    uuid innovationId FK
    uuid userRoleId FK
  }
  NOTIFY_ME_SUBSCRIPTION ||--|| INNOVATION: relatesTo
  NOTIFY_ME_SUBSCRIPTION ||--|| USER_ROLE: notifies
  NOTIFY_ME_SUBSCRIPTION ||--o| NOTIFICATION_SCHEDULE: notifiesOn

  ORGANISATION {
    uuid id PK
    string name
    enum type
    nvarchar acronym
    nvarchar size
    nvarchar description
    nvarchar summary
    nvarchar website
    nvarchar registrationNumber
    boolean isShadow
    datetime2 inactivatedAt
  }
  ORGANISATION ||--o{ ORGANISATION_UNIT : has
  ORGANISATION ||--o{ INNOVATION_SHARE : sharedBy
  
  ORGANISATION_UNIT {
    uuid id PK
    string name
    nvarchar acronym
    boolean isShadow
    datetime2 inactivatedAt
    uuid organisationId FK

  }
  ORGANISATION_UNIT ||--o| ORGANISATION : belongsTo
  ORGANISATION_UNIT ||--o{ INNOVATION_ASSESSMENT_ORGANISATION_UNIT : suggestedBy
  ORGANISATION_UNIT ||--o{ INNOVATION_SUPPORT_LOG_ORGANISATION_UNIT : suggestedBy
  
  SEEDS {
    int id PK
    bigint timestamp
    varchar name
  }

  TERMS_OF_USE {
    uuid id PK
    string name UK
    enum touType
    nvarchar summary
    datetime2 releasedAt
  }
  
  TERMS_OF_USE_USER {
    uuid id PK
    datetime2 acceptedAt
    uuid touId FK
    uuid uesrId FK
  }
  TERMS_OF_USE_USER ||--o| USER : acceptedBy
  TERMS_OF_USE_USER ||--o| TERMS_OF_USE : accepted

  USER {
    uuid id PK
    nvarchar identityId
    enum status
    datetime2 firstTimeSignInAt
    datetime2 lockedAt
    enum deleteReason
    simple-json howDidYouFindUsAnswers
  }
  USER ||--o{ USER_ROLE : has
  USER ||--o{ TERMS_OF_USE_USER : accepted
  
  USER_ROLE {
    uuid id PK
    enum role
    boolean isActive
    uuid organisationId FK
    uuid organisationUnitId FK
    uuid userId FK
  }
  USER_ROLE ||--o| USER : belongsTo
  USER_ROLE ||--o| ORGANISATION : belongsTo
  USER_ROLE ||--o| ORGANISATION_UNIT : belongsTo
  USER_ROLE ||--o| INNOVATION_THREAD : follows
  USER_ROLE ||--o| INNOVATION_SUPPORT : supports
  USER_ROLE ||--o{ INNOVATION_THREAD_FOLLOWER : follows

  %% VIEWS
  ANALYTICS_ORGANISATION_INACTIVITY_KPI {
    int year
    int month
    nvarchar organisation
    uuid organisationId
    nvarchar organisationUnit
    uuid organisationUnitId
    uuid innovationId
    nvarchar innovationName
    boolean breached
  }
  ANALYTICS_ORGANISATION_INACTIVITY_KPI ||--|| INNOVATION: relatesTo
  ANALYTICS_ORGANISATION_INACTIVITY_KPI ||--|| ORGANISATION: relatesTo
  ANALYTICS_ORGANISATION_INACTIVITY_KPI ||--|| ORGANISATION_UNIT: relatesTo

  ANALYTICS_SUPPORT_METRICS_VIEW {
    uuid innovationId
    nvarchar innovation
    uuid organisationId
    nvarchar organisation
    uuid organisationUnitId
    nvarchar organisationUnit
    uuid supportId
    datetime2 suggestedAt
    enum suggestedAtWeekday
    datetime2 startedAt
    datetime2 finishedAt
    int daysToSupport
    int workdaysToSupport
  }
  ANALYTICS_SUPPORT_METRICS_VIEW ||--|| INNOVATION: relatesTo
  ANALYTICS_SUPPORT_METRICS_VIEW ||--|| ORGANISATION: relatesTo
  ANALYTICS_SUPPORT_METRICS_VIEW ||--|| ORGANISATION_UNIT: relatesTo
  ANALYTICS_SUPPORT_METRICS_VIEW ||--|| INNOVATION_SUPPORT: relatesTo

  DOCUMENTS_STATISTICS_VIEW {
    uuid innovationId
    simple-json uploadedByRoles
    simple-json updatedByUnits
    simple-json locations
  }
  DOCUMENTS_STATISTICS_VIEW ||--|| INNOVATION: relatesTo

  INNOVATION_GROUPED_STATUS_VIEW {
    uuid innovationId
    enum groupedStatus
    string name
    string createdBy
    int daysSinceNoActiveSupport
    int daysSinceNoActiveSupportOrDeploy
    datetime2 expectedArchiveDate
  }
  INNOVATION_GROUPED_STATUS_VIEW ||--|| INNOVATION: relatesTo
  
  INNOVATION_LIST_VIEW {
    uuid id
    nvarchar name
    uuid ownerId
    nvarchar ownerCompanyName
    datetime2 submittedAt
    datetime2 updatedAt
    datetime2 lastAssessmentRequestAt
    enum status
    datetime2 statusUpdatedAt
    enum groupedStatus
    nvarchar countryName
    nvarchar postcode
    enum mainCategory
    nvarchar otherCategoryDescription
    simple-json categories
    simple-json careSettings
    nvarchar otherCareSetting
    simple-json involvedAACProgrammes
    simple-json diseasesAndConditions
    simple-json keyHealthInequalities
    simple-json engagingOrganisations
    simple-json engagingUnits
    boolean hasBeenAssessed
    uuid currentAssessmentId
  }
  INNOVATION_LIST_VIEW ||--|| INNOVATION: relatesTo
  INNOVATION_LIST_VIEW ||--o| USER: owner
  INNOVATION_LIST_VIEW ||--o| INNOVATION_ASSESSMENT: currentAssessment
  INNOVATION_LIST_VIEW ||--o{ INNOVATION_SUPPORT: has
  INNOVATION_LIST_VIEW ||--o{ INNOVATION_SUGGESTIONS: has
  INNOVATION_LIST_VIEW ||--o{ INNOVATION_SHARE: has

  INNOVATION_PROGRESS_VIEW {
    uuid innovationId
    int deploymentCount
    enum ukcaceCertification
    enum dtacCertification
    enum evidenceClinicalOrCare
    enum evidenceRealWorld
    enum assessmentRealWorldValidation
    enum evidenceOfImpact
    enum assessmentEvidenceProveEfficacy
    enum evidenceCostImpact
    enum workingProduct
    enum carbonReductionPlan
    enum htwTerComplete
    enum niceGuidanceComplete
    enum scProcurementRouteIdentified
  }
  INNOVATION_PROGRESS_VIEW ||--|| INNOVATION: relatesTo

  INNOVATION_RELEVANT_ORGANISATIONS_STATUS_VIEW {
    uuid innovationId
    enum status
    simple-json organisationData
    simple-json organisationUnitData
    simple-json userData
  }
  INNOVATION_RELEVANT_ORGANISATIONS_STATUS_VIEW ||--|| INNOVATION: relatesTo

  INNOVATION_SUGGESTED_UNITS_VIEW {
    uuid innovationId
    uuid suggestedUnitId
    simple-json suggestedBy
    datetime2 suggestedOn
  }
  INNOVATION_SUGGESTED_UNITS_VIEW ||--o| INNOVATION : belongsTo
  INNOVATION_SUGGESTED_UNITS_VIEW ||--o| INNOVATION_LIST_VIEW : belongsTo
  INNOVATION_SUGGESTED_UNITS_VIEW ||--o| ORGANISATION_UNIT : suggestedUnit

  INNOVATION_SUPPORT_LAST_ACTIVITY_UPDATE_VIEW {
    uuid supportId
    uuid innovationId
    uuid organisationUnitId
    datetime2 lastUpdate
  }
  INNOVATION_SUPPORT_LAST_ACTIVITY_UPDATE_VIEW ||--|| INNOVATION_SUPPORT: relatesTo

  INNOVATION_TASK_DESCRIPTIONS_VIEW {
    uuid taskId
    enum status
    uuid threadId
    uuid messageId
    nvarchar description
    datetime2 createdAt
    enum createdByRole
    nvarchar createdByIdentityId
    nvarchar createdByOrganisationUnitName
  }
  INNOVATION_TASK_DESCRIPTIONS_VIEW ||--|| INNOVATION_TASK : belongsTo
  INNOVATION_TASK_DESCRIPTIONS_VIEW ||--|| INNOVATION_THREAD: relatesTo
  INNOVATION_TASK_DESCRIPTIONS_VIEW ||--|| INNOVATION_THREAD_MESSAGE: has
  
```
# Table/Column descriptions

## ACTIVITY_LOG
Most activities done by the users are registered in the activity log for audit and other purposes and made available within the innovation record.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the activity_log|PK|
|type|enum|type of the activity log entry|<ul><li>INNOVATION_MANAGEMENT</li><li>INNOVATION_RECORD</li><li>NEEDS_ASSESSMENT</li><li>SUPPORT</li><li>COMMENTS</li><li>TASKS</li><li>THREADS</li></ul>|
|activity|enum|subtype of the activity log entry|<ul><li>INNOVATION_CREATION</li><li>OWNERSHIP_TRANSFER</li><li>SHARING_PREFERENCES_UPDATE</li><li>SECTION_DRAFT_UPDATE</li><li>SECTION_SUBMISSION</li><li>INNOVATION_SUBMISSION</li><li>NEEDS_ASSESSMENT_START</li><li>NEEDS_ASSESSMENT_START_EDIT</li><li>NEEDS_ASSESSMENT_COMPLETED</li><li>NEEDS_ASSESSMENT_EDITED</li><li>ORGANISATION_SUGGESTION</li><li>SUPPORT_STATUS_UPDATE</li><li>COMMENT_CREATION</li><li>TASK_CREATION</li><li>TASK_STATUS_DONE_UPDATE</li><li>TASK_STATUS_DECLINED_UPDATE</li><li>TASK_STATUS_OPEN_UPDATE</li><li>TASK_STATUS_CANCELLED_UPDATE</li><li>THREAD_CREATION</li><li>THREAD_MESSAGE_CREATION</li><li>NEEDS_ASSESSMENT_REASSESSMENT_REQUESTED</li><li>INNOVATION_PAUSE</li></ul>|
|param|simple-json|specific data related to the activity log entry that is dependant on the activity|[ActivityLogDBParamsType](https://github.com/nhsengland/innovation-service-backend-api/blob/develop/libs/shared/types/domain.types.ts#L239)|
|userRoleId|uuid|id of the role that created the activity log|FK|
|innovationId|uuid|id of the innovation|FK|

### ActivityLogDBParamsType

|Property|Type|Description|
|--------|----|-----------|
|interveningUserId|string\|null|Optional ID of the user intervening in the activity, if applicable.|
|assessmentId|string|Optional ID of the assessment associated with the activity.|
|sectionId|InnovationSections|Optional section of the innovation record associated with the activity.|
|taskId|string|Optional ID of the task associated with the activity.|
|actionUserRole|ServiceRoleEnum|Optional role of the user performing the action.|
|innovationSupportStatus|InnovationSupportStatusEnum|Optional status of the innovation support related to the activity.|
|organisations|string[]|Optional list of organisation names associated with the activity.|
|organisationUnit|string|Optional list of organisation unit names associated with the activity.|
|comment|{id?:string;value:string}|Optional comment related to the activity, which may or may not have an ID.|
|totalTasks|number|Optional total number of tasks associated with the activity.|
|thread|{id:string;subject:string;messageId:string}|Optional details of the thread associated with the activity, including its ID, subject, and message ID.|
|assessment|{id:string}|Optional details of the assessment associated with the activity, including its ID.|
|reassessment|{id:string}|Optional details of the reassessment associated with the activity, including its ID.|
|message|string\|{id:string}|Optional message related to the activity, which may be a string or an object with an ID.|

## ANNOUNCEMENT
Admins have the ability to create different announcements that will be made available to different users.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the announcement|PK|
|status|enum|status of the announcement|<ul><li>SCHEDULED</li><li>ACTIVE</li><li>DONE</li><li>DELETED</li></ul>|
|title|nvarchar|title of the announcement||
|userRoles|simple-array|list of user roles targeted by the announcement|Array of <ul><li>ADMIN</li><li>INNOVATOR</li><li>ACCESSOR</li><li>ASSESSMENT</li><li>QUALIFYING_ACCESSOR</li></ul>|
|startsAt|datetime2|start date and time of the announcement||
|expiresAt|datetime2|expiration date and time of the announcement|nullable|
|params|simple-json|additional parameters for the announcement, such as content and optional links|[AnnouncementParamsType](#annoucementparamstype)|
|type|enum|type of the announcement|<ul><li>LOGIN</li><li>HOMEPAGE</li></ul>|
|filters|simple-json|filters to determine the audience of the announcement by fine targeting innovators with specific innovations.|nullable array of [FilterPayload](#filterpayload)|
|sendEmail|bit|flag to indicate if an email should be sent for the announcement||

### AnnoucementParamsType
| Property   | Type              | Description                                           |
|------------|-------------------|-------------------------------------------------------|
| content    | string            | The main content of the announcement.                 |
| link       | object (optional) | An optional link associated with the announcement.    |
| link.label | string            | The label for the link.                               |
| link.url   | string            | The URL for the link.                                 |

### FilterPayload

| Property  | Type     | Description                                                                 |
|-----------|----------|-----------------------------------------------------------------------------|
| section   | string   | The section of the innovation record to which the filter applies.           |
| question  | string   | The specific question within the section that the filter targets.           |
| answers   | string[] | A list of answers that determine the audience for the announcement.         |

## ANNOUNCEMENT_USER
This table tracks the relationship between announcements and the users who receive the announcement.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the announcement_user|PK|
|readAt|datetime2|timestamp when the user read the announcement|nullable|
|announcementId|uuid|foreign key referencing the announcement|FK|
|userId|uuid|foreign key referencing the user|FK|
|innovationId|uuid|foreign key referencing the innovation, if applicable|FK|

## AUDIT
The `AUDIT` table is used to track user actions for logging and auditing purposes. It provides a detailed record of activities performed within the system.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the audit entry|PK|
|userId|uuid|foreign key referencing the user who performed the action|FK|
|date|datetime2|timestamp of when the action occurred||
|action|enum|type of action performed|<ul><li>CREATE</li><li>READ</li><li>UPDATE</li><li>DELETE</li></ul>|
|target|enum|type of entity affected by the action|<ul><li>ASSESSMENT</li><li>INNOVATION</li><li>SUPPORT</li><li>THREAD</li><li>USER</li></ul>|
|targetId|uuid|ID of the specific entity affected by the action|nullable|
|innovationId|uuid|foreign key referencing the associated innovation, if applicable|nullable FK|
|invocationId|nvarchar|unique identifier for the invocation of the action, useful for tracing|nullable|
|functionName|nvarchar|name of the function or process that triggered the action|nullable|

### Notes
- This table is mostly used for audit purposes and is only used by the Innovation Service for the Needs Assessment Users to display most recent innovations they visited

## INNOVATION
The `INNOVATION` table represents the core entity of the system, capturing details about innovations submitted by users.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the innovation|PK|
|name|string|name of the innovation||
|uniqueId|string|unique identifier for the innovation|UK|
|status|enum|current status of the innovation|<dl><dt>CREATED</dt><dd>Initial state of the innovation.</dd><dt>WAITING_NEEDS_ASSESSMENT</dt><dd>Awaiting needs assessment.</dd><dt>NEEDS_ASSESSMENT</dt><dd>Undergoing needs assessment.</dd><dt>IN_PROGRESS</dt><dd>Currently in progress.</dd><dt>WITHDRAWN</dt><dd>Withdrawn from the innovation service.</dd><dt>ARCHIVED</dt><dd>Archived and no longer active.</dd></dl>|
|statusUpdatedAt|datetime2|timestamp of the last status update||
|expires_at|datetime2|expiration date of the innovation. This is used when innovator deletes account and a transfer is in progress|nullable|
|submittedAt|datetime2|timestamp when the innovation was submitted|nullable|
|lastAssessmentRequestAt|datetime2|timestamp of the last assessment request|nullable|
|archiveReason|enum|reason for archiving the innovation|nullable <dl><dt>DEVELOP_FURTHER</dt><dd>User wants to develop the innovation further before proceeding.</dd><dt>HAVE_ALL_SUPPORT</dt><dd>User has received all the support they need.</dd><dt>DECIDED_NOT_TO_PURSUE</dt><dd>User has decided not to pursue the innovation.</dd><dt>ALREADY_LIVE_NHS</dt><dd>The innovation is already live within the NHS.</dd><dt>OTHER_DONT_WANT_TO_SAY</dt><dd>User prefers not to disclose the reason.</dd><dt>SIX_MONTHS_INACTIVITY</dt><dd>Automatically archived due to six months of inactivity.</dd><dt>OWNER_ACCOUNT_DELETED</dt><dd>Archived because the owner's account was deleted.</dd><dt>LEGACY</dt><dd>Was free text archive reason before migration.</dd></dl>|
|hasBeenAssessed|bit|flag indicating if the innovation has been assessed||
|ownerId|uuid|foreign key referencing the user who owns the innovation|nullable FK|
|currentAssessmentId|uuid|foreign key referencing the current assessment, if applicable|nullable FK|
|currentMajorAssessmentId|uuid|foreign key referencing the current major assessment, if applicable|nullable FK|

### Notes
- The `INNOVATION` table is central to the system and is linked to many other entities, such as assessments, tasks, and documents.
- The `uniqueId` ensures that each innovation has a distinct identifier for tracking purposes and third party reference.
- Innovations can transition through various statuses, reflecting their lifecycle within the system.
- The `ownerId` establishes the relationship between the innovation and its creator or primary owner.
- The `currentAssessmentId` and `currentMajorAssessmentId` fields allow tracking of the most recent assessments associated with the innovation.


# Almost all tables also have the following audit fields
  - created_at
  - created_by
  - updated_at
  - updated_by
  - deleted_at

# Innovation Document Schema
  - The innovation document schema is a record in the database, the most recent version types is available [here](https://github.com/nhsengland/innovation-service-backend-api/blob/21e41ef6a58b0b6ded0cc09e99bc23e0d08d2037/libs/shared/schemas/innovation-record/document.types.ts)

# Deprecated only here for audit/history
- innovation_action: replaced by innovation_tasks
- replaced by new innovation_file:
  - innovation_file_legacy
  - innovation_section_file
  - innovation_evidence_file
- replaced by innovation_document / irv2: 
  - innovation_area
  - innovation_care_setting
  - innovation_category
  - innovation_clinical_area
  - innovation_deployment_plan
  - innovation_disease_condition
  - innovation_environmental_benefit
  - innovation_evidence
  - innovation_general_benefit
  - innovation_patients_citizens_benefit
  - innovation_revenue
  - innovation_standard
  - innovation_subgroup
  - innovation_subgroup_benefit
  - innovation_support_type
  - innovation_user_test
- replaced by user_roles:
  - organisation_user
  - organisation_unit_user
- user_preference: replaced by notification_preference
- don't know if this was ever used:
  - typeorm_metadata
- lots of columns, especially within the innovation entity that were replaced by the innovation_document