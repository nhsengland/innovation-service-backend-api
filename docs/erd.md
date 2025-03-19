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

## INNOVATION_SHARE
The `INNOVATION_SHARE` table tracks the sharing of innovations with organisations and is pivotal in ensuring that the innovator controls which organisations have access to their innovation.

|column|type|description|values/constraints|
|--|--|--|--|
|innovationId|uuid|foreign key referencing the innovation being shared|PK, FK|
|organisationId|uuid|foreign key referencing the organisation with which the innovation is shared|PK, FK|

### Notes
- This table establishes a many-to-many relationship between innovations and organisations.
- Each record represents a unique sharing instance of an innovation with an organisation.
- This table is of utmost importance when controlling authorization and exposing data.

## INNOVATION_ASSESSMENT
The `INNOVATION_ASSESSMENT` table captures the details of assessments conducted on innovations. Assessments are categorized as either major or minor.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the innovation assessment|PK|
|majorVersion|smallint|major version of the assessment, incremented with each reassessment||
|minorVersion|smallint|minor version of the assessment, incremented for NA updates||
|editReason|nvarchar|reason provided by NA for editing the assessment|nullable|
|description|nvarchar|assessment description of the innovation|nullable|
|summary|nvarchar|summary of the support required|nullable|
|maturityLevel|enum|maturity level of the innovation|<dl><dt>DISCOVERY</dt><dd>Discovery or early development.</dd><dt>ADVANCED</dt><dd>Advanced development and testing.</dd><dt>READY</dt><dd>Ready or nearly ready for adoption and scale.</dd></dl>|
|maturityLevelComment|nvarchar|comments on the maturity level|nullable|
|startedAt|datetime2|timestamp when the assessment started|nullable|
|finishedAt|datetime2|timestamp when the assessment was completed|nullable|
|hasRegulatoryApprovals|enum|status of regulatory approvals|<ul><li>YES</li><li>NO</li><li>PARTIALLY</li></ul>|
|hasRegulatoryApprovalsComment|nvarchar|comments on regulatory approvals|nullable|
|hasEvidence|enum|status of evidence availability|<ul><li>YES</li><li>NO</li><li>PARTIALLY</li></ul>|
|hasEvidenceComment|nvarchar|comments on evidence availability|nullable|
|hasValidation|enum|status of validation|<ul><li>YES</li><li>NO</li><li>PARTIALLY</li></ul>|
|hasValidationComment|nvarchar|comments on validation|nullable|
|hasProposition|enum|status of the value proposition|<ul><li>YES</li><li>NO</li><li>PARTIALLY</li></ul>|
|hasPropositionComment|nvarchar|comments on the value proposition|nullable|
|hasCompetitionKnowledge|enum|status of competition knowledge|<ul><li>YES</li><li>NO</li><li>PARTIALLY</li></ul>|
|hasCompetitionKnowledgeComment|nvarchar|comments on competition knowledge|nullable|
|hasImplementationPlan|enum|status of the implementation plan|<ul><li>YES</li><li>NO</li><li>PARTIALLY</li></ul>|
|hasImplementationPlanComment|nvarchar|comments on the implementation plan|nullable|
|hasScaleResource|enum|status of scaling resources|<ul><li>YES</li><li>NO</li><li>PARTIALLY</li></ul>|
|hasScaleResourceComment|nvarchar|comments on scaling resources|nullable|
|exemptedReason|enum|reason for exemption from assessment|nullable|
|exemptedMessage|nvarchar|message explaining the exemption|nullable|
|exemptedAt|datetime2|timestamp when the exemption was applied|nullable|
|innovationId|uuid|foreign key referencing the innovation being assessed|FK|
|assignTo|uuid|foreign key referencing the user assigned to the assessment|nullable FK|
|previousAssessmentId|uuid|foreign key referencing the previous assessment, if applicable|nullable FK|

### Notes
- **Major Assessment**: Represents the submission of an innovation by the innovator for its initial assessment (major version 1) or subsequent reassessments (major version >1).
- **Minor Assessment**: Represents incremental updates made by the Needs Assessment (NA) team to an existing assessment.
- The `majorVersion` and `minorVersion` fields provide version control, ensuring a clear and traceable history of assessment changes.
- The `assignTo` field designates the user responsible for conducting the assessment.
- The `previousAssessmentId` field links to the preceding assessment, enabling traceability and facilitating comparisons.
- All assessment information fields must be completed before the assessment can be marked as finished.
- The NA team is expected to start the assessment within two days of its creation.
- The NA team must adhere to key performance indicators (KPIs) for completing assessments within the defined timelines.

## INNOVATION_ASSESSMENT_ORGANISATION_UNIT
The `INNOVATION_ASSESSMENT_ORGANISATION_UNIT` table tracks the relationship between innovation assessments and organisation units, specifically for suggested units during the assessment process.

|column|type|description|values/constraints|
|--|--|--|--|
|innovationAssessmentId|uuid|foreign key referencing the innovation assessment|PK, FK|
|organisationUnitId|uuid|foreign key referencing the organisation unit|PK, FK|

### Notes
- This table establishes a many-to-many relationship between innovation assessments and organisation units.

## INNOVATION_COLLABORATOR
The `INNOVATION_COLLABORATOR` table tracks the relationship between innovations and their collaborators, allowing multiple innovators to collaborate on a single innovation.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the innovation collaborator|PK|
|status|enum|status of the collaboration|<dl><dt>PENDING</dt><dd>Invitation sent, awaiting acceptance.</dd><dt>ACTIVE</dt><dd>Collaboration is active and ongoing.</dd><dt>DECLINED</dt><dd>Invitation was declined by the collaborator.</dd><dt>CANCELLED</dt><dd>Invitation was cancelled by the inviter.</dd><dt>REMOVED</dt><dd>Collaborator was removed from the innovation.</dd><dt>LEFT</dt><dd>Collaborator voluntarily left the innovation.</dd><dt>EXPIRED</dt><dd>Invitation expired without a response.</dd></dl>|
|email|nvarchar|email address of the collaborator||
|collaboratorRole|nvarchar|description of the collaborator role|nullable|
|invitedAt|datetime2|timestamp when the collaborator was invited||
|innovationId|uuid|foreign key referencing the innovation being collaborated on|FK|
|userId|uuid|foreign key referencing the user who is the collaborator|nullable FK|

### Notes
- This table establishes a many-to-one relationship between innovations and collaborators.
- The `status` field tracks the current state of the collaboration, such as whether the invitation is pending or accepted.

## INNOVATION_DOCUMENT

The `INNOVATION_DOCUMENT` table stores the structured data of an innovation record, allowing for versioning and snapshots. All the information related to the Innovation Record is registered in this table and it is updated when a innovator saves a section.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the innovation document, this is the same as the innovation id|PK, FK|
|document|simple-json|JSON representation of the innovation record||
|version|nvarchar|version of the document template||
|isSnapshot|boolean|flag indicating if the document is a snapshot of a specific state|deprecated|
|description|nvarchar|description of operation change|nullable|

### Innovation Document Schema
  - The innovation document schema is a record in the database, the most recent version types is available [here](https://github.com/nhsengland/innovation-service-backend-api/blob/21e41ef6a58b0b6ded0cc09e99bc23e0d08d2037/libs/shared/schemas/innovation-record/document.types.ts)

### Notes
- The `document` field contains the structured data of the innovation record, adhering to the schema defined in the [Innovation Document Schema](#innovation-document-schema).
- The `version` field that has the information of the schema version for the document.
- Snapshots (`isSnapshot`) are used to capture the state of the innovation record at a specific point in time, such as during section submission, template changes or others. This is no longer relevant after we introduced the `INNOVATION_DOCUMENT_DRAFT`
- This table is central to the new innovation record versioning system (IRv2), replacing many legacy tables.

## INNOVATION_DOCUMENT_DRAFT

The `INNOVATION_DOCUMENT_DRAFT` table stores draft versions of the innovation record, allowing users to make changes before finalizing and submitting updates.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the innovation document draft, this is the same as the innovation id|PK, FK|
|document|simple-json|JSON representation of the innovation record||
|version|nvarchar|version of the document template||

### Notes
- The `document` field contains the structured data of the draft innovation record, adhering to the schema defined in the [Innovation Document Schema](#innovation-document-schema).
- The `version` field indicates the schema version for the draft document.
- Drafts are not visible to non innovator users until they are finalized and moved to the `INNOVATION_DOCUMENT` table.
- The `id` field ensures that each draft is uniquely tied to its corresponding innovation.

## INNOVATION_EXPORT_REQUEST
The `INNOVATION_EXPORT_REQUEST` table tracks requests made by users to export innovation data. This used to be mandatory but has changed to only required if using this information for other parties.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the export request|PK|
|status|enum|status of the export request|<ul><li>PENDING</li><li>APPROVED</li><li>REJECTED</li><li>COMPLETED</li></ul>|
|requestReason|varchar|reason provided by the user for the export request||
|rejectReason|varchar|reason provided for rejecting the export request|nullable|
|innovationId|uuid|foreign key referencing the innovation being exported|FK|
|createdByUserRole|uuid|foreign key referencing the user role that created the request|FK|

### Notes
- The `status` field indicates the current state of the request, such as whether it is pending or completed.

## INNOVATION_FILE
The `INNOVATION_FILE` table tracks files uploaded by users related to innovations, such as supporting documents.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the innovation file|PK|
|storageId|nvarchar|unique identifier for the file in the storage system||
|contextType|enum|type of context the file is associated with|<ul><li>INNOVATION</li><li>INNOVATION_EVIDENCE</li><li>INNOVATION_MESSAGE</li><li>INNOVATION_PROGRESS_UPDATE</li><li>INNOVATION_SECTION</li></ul>|
|contextId|nvarchar|ID of the specific context entity the file is associated with||
|name|nvarchar|name of the file||
|description|nvarchar|description of the file|nullable|
|filename|nvarchar|original filename of the uploaded file||
|filesize|int|size of the file in bytes||
|extension|nvarchar|file extension (e.g., `.pdf`, `.docx`)||
|innovationId|uuid|foreign key referencing the associated innovation|FK|
|createdByUserRoleId|uuid|foreign key referencing the user role that uploaded the file|FK|

### Notes
- The `contextType` and `contextId` fields enable the file to be linked to different contexts, such as innovations, evidence, messages, progress updates, or sections.
- The `storageId` is used to locate the file in the storage system, ensuring secure and efficient retrieval.

## INNOVATION_REASSESSMENT_REQUEST
The `INNOVATION_REASSESSMENT_REQUEST` table tracks requests made by innovators to reassess an innovation, typically after significant updates or changes.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the reassessment request|PK|
|updatedInnovationRecord|enum|indicates if the innovation record has been updated|<ul><li>YES</li><li>NO</li></ul>|
|description|nvarchar|description of the reassessment request|nullable|
|reassessmentReason|simple-array|list of reasons for requesting reassessment|Array of predefined reasons: <ul><li>NO_SUPPORT</li><li>PREVIOUSLY_ARCHIVED</li><li>HAS_PROGRESSED_SIGNIFICANTLY</li><li>OTHER</li></ul>|
|otherReassessmentReason|nvarchar|other reason provided by the user|nullable|
|whatSupportDoYouNeed|nvarchar|details of the support needed for reassessment|nullable|
|innovationId|uuid|foreign key referencing the innovation being reassessed|FK|
|innovationAssessmentId|uuid|foreign key referencing the associated innovation assessment|FK|

### Notes
- The `reassessmentReason` field allows users to select predefined reasons for reassessment, while `otherReassessmentReason` provides flexibility for custom input.

## INNOVATION_RECORD_SCHEMA
The `INNOVATION_RECORD_SCHEMA` table stores the schema definitions for innovation records, enabling version control and validation of innovation data.
While this table allows for INNOVATION_RECORD_SCHEMA dynamic updates that part of the project wasn't completed as it included too many restrictions and the schema should evolve with attention to other implications.

|column|type|description|values/constraints|
|--|--|--|--|
|version|int|primary key representing the schema version|PK|
|schema|simple-json|JSON representation of the schema|For reference please check [schema model](https://github.com/nhsengland/innovation-service-backend-api/blob/develop/libs/shared/models/schema-engine/schema.model.ts)|

### Notes
- The `version` field ensures that each schema version is uniquely identifiable.
- The `schema` field contains the JSON structure defining the innovation record, which is used for validation and data integrity.
- The schema is referenced in the `INNOVATION_DOCUMENT` and `INNOVATION_DOCUMENT_DRAFT` tables to ensure data consistency.

## INNOVATION_SECTION
The `INNOVATION_SECTION` table tracks the sections of an innovation record, allowing for modular updates and submissions.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the innovation section|PK|
|section|enum|specific section of the innovation record|<ul><li>INNOVATION_DESCRIPTION</li><li>UNDERSTANDING_OF_NEEDS</li><li>EVIDENCE_OF_EFFECTIVENESS</li><li>MARKET_RESEARCH</li><li>CURRENT_CARE_PATHWAY</li><li>TESTING_WITH_USERS</li><li>REGULATIONS_AND_STANDARDS</li><li>INTELLECTUAL_PROPERTY</li><li>REVENUE_MODEL</li><li>COST_OF_INNOVATION</li><li>DEPLOYMENT</li></ul>|
|status|enum|current status of the section|<ul><li>NOT_STARTED</li><li>DRAFT</li><li>SUBMITTED</li></ul>|
|submittedAt|datetime2|timestamp when the section was submitted|nullable|
|submittedBy|uuid|foreign key referencing the user who submitted the section|nullable FK|
|innovationId|uuid|foreign key referencing the associated innovation|FK|

### Notes
- The `section` field identifies the specific part of the innovation record, such as "Innovation Description," "Evidence of Effectiveness," or "Market Research."
- The `status` field tracks the progress of the section, indicating whether it has not been started (`NOT_STARTED`), is still being worked on (`DRAFT`), or has been finalized and submitted (`SUBMITTED`).

## INNOVATION_SHARE_LOG
The `INNOVATION_SHARE_LOG` table tracks the history of sharing operations for innovations, providing an audit trail of when and how innovations were shared with organisations.

|column|type|description|values/constraints|
|--|--|--|--|
|createdAt|datetime2|timestamp when the sharing operation occurred|PK|
|innovationId|uuid|foreign key referencing the innovation being shared|PK, FK|
|organisationId|uuid|foreign key referencing the organisation with which the innovation was shared|PK, FK|
|operation|enum|type of sharing operation performed|<ul><li>ADD</li><li>REMOVE</li></ul>|

### Notes
- The `operation` field indicates whether the innovation was shared or unshared with the organisation.
- This table isn't used by the Innovation Service

## INNOVATION_SUPPORT
The `INNOVATION_SUPPORT` table tracks the support provided to innovations by various organisation units, capturing details about the support lifecycle.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the innovation support|PK|
|status|enum|current status of the support|<dl><dt>SUGGESTED</dt><dd>Support has been suggested but not yet initiated.</dd><dt>ENGAGING</dt><dd>Support is actively being provided.</dd><dt>WAITING</dt><dd>Support is pending further action or response.</dd><dt>UNASSIGNED</dt><dd>Support has not been assigned to any organisation unit.</dd><dt>UNSUITABLE</dt><dd>Support is deemed unsuitable for the innovation.</dd><dt>CLOSED</dt><dd>Support has been concluded or terminated.</dd></dl>|
|closeReason|enum|reason for closing the support|<ul><li>ARCHIVE</li><li>STOP_SHARE</li><li>SUPPORT_COMPLETE</li></ul>|nullable|
|startedAt|datetime2|timestamp when the support started|nullable|
|finishedAt|datetime2|timestamp when the support was completed or closed|nullable|
|isMostRecent|boolean|flag indicating if this is the organisation unit most recent support entry for the innovation||
|innovationId|uuid|foreign key referencing the associated innovation|FK|
|majorAssessmentId|uuid|foreign key referencing the associated major assessment|nullable FK|
|organisationUnitId|uuid|foreign key referencing the organisation unit providing the support|FK|

### Notes
- The `status` field tracks the current state of the support, such as whether it is suggested, engaging, waiting, unassigned, unsuitable, or closed.
- The `closeReason` field provides context for why the support was closed, such as archiving, stopping sharing, or completing the support.
- The `majorAssessmentId` links the support to a specific major assessment, if applicable, ensuring traceability between assessments and support activities.
- This table is used to monitor, evaluate, and improve the effectiveness of support provided to innovations, ensuring alignment with organisational goals and innovator needs.
- The support lifecycle has recently been updated to enhance KPI measurement and better align with organisational expectations. Previously, the lifecycle allowed transitions between any states without a clear closure process. The new approach introduces a defined starting point and a clear finish for each support instance.
- Historically, all supports originated from suggestions, even though this was not strictly required. However, the updated process now accommodates more organic support initiation. For example, transitioning from a `CLOSED` or `UNSUITABLE` state to an open state automatically creates a new support instance.

## INNOVATION_SUPPORT_USER
The `INNOVATION_SUPPORT_USER` table tracks the relationship between innovation support instances and the users assigned to provide support.

|column|type|description|values/constraints|
|--|--|--|--|
|innovationSupportId|uuid|foreign key referencing the innovation support instance|PK, FK|
|userRoleId|uuid|foreign key referencing the user role assigned to the support|PK, FK|

### Notes
- This table establishes a many-to-many relationship between innovation support instances and user roles.

## INNOVATION_SUPPORT_LOG
The `INNOVATION_SUPPORT_LOG` table tracks the history of actions and updates related to innovation support, providing an audit trail for support activities. The information provided by the organisation units in the support summary is registered here as `PROGRESS_UPDATE`.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the innovation support log|PK|
|type|enum|type of log entry|<ul><li>STATUS_UPDATE</li><li>ACCESSOR_SUGGESTION</li><li>ASSESSMENT_SUGGESTION</li><li>PROGRESS_UPDATE</li><li>INNOVATION_ARCHIVED</li><li>STOP_SHARE</li></ul>|
|innovationSupportStatus|enum|status of the innovation support at the time of the log entry|<ul><li>SUGGESTED</li><li>ENGAGING</li><li>WAITING</li><li>UNASSIGNED</li><li>UNSUITABLE</li><li>CLOSED</li></ul>|
|description|nvarchar|description of the log entry|nullable|
|params|simple-json|additional parameters related to the log entry|nullable. See [SupportLogProgressUpdateParams](#supportlogprogressupdateparams) and [SupportLogAssessmentSuggestionParams](#supportlogassessmentsuggestionparams) for details.|
|innovationId|uuid|foreign key referencing the associated innovation|FK|
|majorAssessmentId|uuid|foreign key referencing the associated major assessment|nullable FK|
|organisationUnitId|uuid|foreign key referencing the organisation unit involved in the log entry|nullable FK|
|createdByUserRoleId|uuid|foreign key referencing the user role that created the log entry|FK|

### Notes
- The `type` field categorizes the log entry, such as a status update, progress update, or activity.
- The `innovationSupportStatus` field captures the status of the support at the time of the log entry, providing context for the recorded action.
- The `params` field allows for storing additional structured data related to the log entry, enabling flexibility in capturing diverse types of information. For example, it can store progress update details or assessment suggestions.
- The `description` field provides a human-readable summary of the log entry, making it easier to understand the context of the recorded action.
- The `type` and `params` fields together enable capturing both high-level and detailed information about support activities, ensuring comprehensive documentation.
- The `majorAssessmentId` and `organisationUnitId` fields allow linking the log entry to specific assessments or organisation units, enhancing traceability and reporting capabilities.
- The `params` field supports multiple structured formats, such as `SimpleProgressUpdateParams`, `OneLevelProgressUpdateParams`, and `TwoLevelProgressUpdateParams`, to accommodate diverse reporting needs.
- The `PROGRESS_UPDATE` type is crucial for capturing the support summary provided by organisations, offering insights into the progress and status of the support activities.

### SupportLogProgressUpdateParams

|Type|Fields|Description|
|----|------|-----------|
|`SimpleProgressUpdateParams`|`title: string`|A simple progress update with a title.|
|`OneLevelProgressUpdateParams`|`categories: string[]`|A progress update with a list of categories.|
|`TwoLevelProgressUpdateParams`|`category: string`, `subCategories: string[]`|A progress update with a main category and its associated subcategories.|

### SupportLogAssessmentSuggestionParams

| Property     | Type   | Description                                           |
|--------------|--------|-------------------------------------------------------|
| assessmentId | string | ID of the assessment associated with the support log. |

## INNOVATION_SUPPORT_LOG_ORGANISATION_UNIT
The `INNOVATION_SUPPORT_LOG_ORGANISATION_UNIT` table tracks the relationship between innovation support logs and organisation units, specifically for suggested units during support activities.

|column|type|description|values/constraints|
|--|--|--|--|
|innovationSupportLogId|uuid|foreign key referencing the innovation support log|PK, FK|
|organisationUnitId|uuid|foreign key referencing the organisation unit|PK, FK|

### Notes
- This table establishes a many-to-many relationship between innovation support logs and organisation units.

## INNOVATION_SURVEY
The `INNOVATION_SURVEY` table tracks surveys related to innovations, capturing responses and metadata for analysis. Currently innovators are prompted to fill a survey when their support is closed.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the innovation survey|PK|
|type|enum|type of survey|<ul><li>SUPPORT_END</li></ul>|
|contextId|uuid|ID of the specific context entity the survey is associated with|nullable|
|answers|simple-json|JSON representation of the survey answers|See [SurveyParamsTypes](#surveyparamstypes) for details on the structure.|
|createdAt|datetime2|timestamp when the survey was created||
|updatedAt|datetime2|timestamp when the survey was last updated|nullable|
|deletedAt|datetime2|timestamp when the survey was deleted|nullable|
|innovationId|uuid|foreign key referencing the associated innovation|FK|
|targetUserRoleId|uuid|foreign key referencing the user role receiving the survey|FK|

### Notes
- The `type` field categorizes the survey, such as feedback, assessment, or progress. Currently, the only supported type is `SUPPORT_END`, which is triggered when support for an innovation is closed.
- The `answers` field stores the survey responses in a structured JSON format. It adheres to a predefined schema, such as `SupportEndSurveyParams`, ensuring consistency and validation.
- The `contextId` field allows linking the survey to a specific context, such as a task, section, or support instance, providing flexibility in associating surveys with various entities.
- The `targetUserRoleId` field identifies the user role intended to respond to the survey, ensuring that the survey reaches the appropriate audience.
- This table is used to gather insights and feedback to improve innovation processes, support quality, and overall outcomes.
- The `SUPPORT_END` survey type specifically captures user feedback on the support received, including satisfaction levels, suggestions for improvement, and likelihood of recommending the service.

### SurveyParamsTypes
#### SupportEndSurveyParams

| Property                     | Type   | Description                                                                 |
|------------------------------|--------|-----------------------------------------------------------------------------|
| supportSatisfaction          | string | Feedback on the satisfaction level with the support received.              |
| ideaOnHowToProceed           | string | Suggestions or ideas on how to proceed with the innovation.                |
| howLikelyWouldYouRecommendIS | string | Likelihood of recommending the Innovation Service to others (e.g., rating).|
| comment                      | string | Additional comments or feedback provided by the user.                      |

### Notes
- The `supportSatisfaction` field captures the user's overall satisfaction with the support provided.
- The `ideaOnHowToProceed` field allows users to share their thoughts or suggestions for next steps.
- The `howLikelyWouldYouRecommendIS` field is used to gauge the user's likelihood of recommending the Innovation Service, often as part of a Net Promoter Score (NPS) metric.
- The `comment` field provides space for users to leave any additional feedback or remarks.
- These fields are part of the survey answers stored in the `answers` column of the `INNOVATION_SURVEY` table.
- The data collected helps improve the quality of support and user experience within the Innovation Service.
- All fields are optional and depend on the survey design and user input.

## INNOVATION_TASK
The `INNOVATION_TASK` table tracks tasks requested by the Needs Assessment team or organisation units, enabling innovators to complete specific actions to enhance support and progress.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the innovation task|PK|
|displayId|nvarchar|unique display identifier for the task||
|status|enum|current status of the task|<ul><li>OPEN</li><li>DONE</li><li>DECLINED</li><li>CANCELLED</li></ul>|
|innovationSectionId|uuid|foreign key referencing the associated innovation section|FK|
|innovationSupportId|uuid|foreign key referencing the associated innovation support|nullable FK|
|createdByUserRoleId|uuid|foreign key referencing the user role that created the task|FK|
|updatedByUserRoleId|uuid|foreign key referencing the user role that last updated the task|FK|

### Notes
- Tasks are created to guide innovators in completing specific actions that improve the quality of support or address identified needs.
- The `status` field tracks the progress of the task, such as whether it is open, completed, declined, or cancelled.
- The `innovationSectionId` and `innovationSupportId` fields link the task to specific sections or support instances, providing context for its purpose.

## INNOVATION_TASK_MESSAGE
The `INNOVATION_TASK_MESSAGE` table tracks the relationship between innovation tasks and thread messages, enabling detailed communication and updates for specific tasks.

|column|type|description|values/constraints|
|--|--|--|--|
|innovationTaskId|uuid|foreign key referencing the associated innovation task|PK, FK|
|innovationThreadMessageId|uuid|foreign key referencing the associated thread message|PK, FK|
|status|enum|status of the innovation task|<ul><li>OPEN</li><li>DONE</li><li>DECLINED</li><li>CANCELLED</li></ul>|

### Notes
- This table establishes a many-to-many relationship between innovation tasks and thread messages.
- The `status` field tracks the current state of the task message, such as whether it is open, done, declined, or cancelled.
- This table is used to link specific messages in threads to tasks, providing a clear communication trail and context for task-related discussions.

## INNOVATION_THREAD
The `INNOVATION_THREAD` table tracks threads related to innovations, enabling structured communication and collaboration among users.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the innovation thread|PK|
|subject|string|subject or title of the thread||
|contextType|enum|type of context the thread is associated with|<ul><li>NEEDS_ASSESSMENT</li><li>SUPPORT</li><li>TASK</li><li>ORGANISATION_SUGGESTION</li></ul>|
|contextId|uuid|ID of the specific context entity the thread is associated with||
|innovationId|uuid|foreign key referencing the associated innovation|FK|
|authorId|uuid|foreign key referencing the user who created the thread|FK|
|authorUserRoleId|uuid|foreign key referencing the user role of the thread author|FK|

### Notes
- The `contextType` and `contextId` fields allow threads to be linked to various contexts, such as innovations, support instances, or tasks.
- The `subject` field provides a brief description of the thread's purpose, making it easier to identify in lists or searches.
- This table is central to facilitating communication and collaboration within the Innovation Service, ensuring that all relevant parties can engage in structured discussions.

## INNOVATION_THREAD_MESSAGE
The `INNOVATION_THREAD_MESSAGE` table tracks messages within threads, enabling detailed communication and updates.

|column|type|description|values/constraints|
|--|--|--|--|
|id|uuid|primary key for the thread message|PK|
|message|nvarchar|content of the message||
|isEditable|bit|flag indicating if the message is editable by the author||
|innovationThreadId|uuid|foreign key referencing the associated thread|FK|
|authorId|uuid|foreign key referencing the user who authored the message|FK|
|authorOrganisationUnit|uuid|foreign key referencing the organisation unit of the author|nullable FK|
|authorUserRoleId|uuid|foreign key referencing the user role of the author|FK|

### Notes
- The `innovationThreadId` field links the message to its parent thread, ensuring a clear hierarchy of communication.
- The `isEditable` field allows for flexibility in editing messages, subject to system rules and permissions.
- The `authorOrganisationUnit` and `authorUserRoleId` fields provide additional context about the message's author, such as their organisational affiliation and role.
- This table supports detailed and structured communication within threads, enabling effective collaboration and information sharing.

#
# Separator TOOO Remove
#

# Almost all tables also have the following audit fields
  - created_at
  - created_by
  - updated_at
  - updated_by
  - deleted_at

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