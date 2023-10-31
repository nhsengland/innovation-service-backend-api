// TODO transform enums into const/types (maybe)

export const EmailTemplates = {
  // TASKS
  TA01_TASK_CREATION_TO_INNOVATOR: '1a89a775-e39a-4be9-8aad-37c0c72574ec',
  TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS: 'fe7e93c2-db4a-45f0-a169-4acc52e68b67',
  TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT: 'e1de43a8-a66a-44f2-84ad-62e0eddf5342',
  TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT: '671d548e-1ed4-4823-b873-1dc9ca405dd1',
  TA05_TASK_CANCELLED_TO_INNOVATOR: 'f9bcfef5-219c-4f71-82bd-4a3f9d60b807',
  TA06_TASK_REOPEN_TO_INNOVATOR: 'bc63e28c-b533-49a5-bdd1-35df8ddb1c68',

  // DOCUMENTS
  DC01_UPLOADED_DOCUMENT_TO_INNOVATOR: '3821092f-4ca5-483c-ae66-67ba66f46f0c',

  // MESSAGES
  ME01_THREAD_CREATION: 'fa83a527-943c-4b52-bba4-9ccee0241979',
  ME02_THREAD_ADD_FOLLOWERS: 'fa83a527-943c-4b52-bba4-9ccee0241979',
  ME03_THREAD_MESSAGE_CREATION: '8cb941e4-218f-42fd-96b7-a1140b7c2b12',

  // SUPPORTS
  ST01_SUPPORT_STATUS_TO_ENGAGING: 'fac75d25-040b-4e4a-9225-4ca717620f70',
  ST02_SUPPORT_STATUS_TO_OTHER: '1e24059f-53e3-445b-a0f8-0ac5f0d13ae2',
  ST03_SUPPORT_STATUS_TO_WAITING: '5f3900dc-471f-4828-8264-eaff8aae61ad',
  ST04_SUPPORT_NEW_ASSIGNED_ACCESSORS_TO_INNOVATOR: '2916606e-ef89-4ec0-b654-decdb3dd1de8',
  ST05_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_NEW_QA: 'f33f5c16-3349-4eb0-b4da-a47806f12838',
  ST06_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_OLD_QA: 'cdb8e3b2-1f83-4ced-8fcb-3cf801262ae8',

  // NEEDS ASSESSMENT
  NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR: 'fadfc3e8-d48e-446e-a81d-d573d774b725',
  NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT: 'a963bf8d-50a4-4637-8ce1-40bd6bb73de2',
  // NA03_NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR: 'c9d63a7a-951b-4529-ac00-53e9b17c2919',
  // NA04_NEEDS_ASSESSMENT_COMPLETE_TO_INNOVATOR: '32a777de-3591-4e96-a2f4-181725f8fe2b',
  // NA06_NEEDS_ASSESSOR_REMOVED: '5845a1b4-3be6-4f27-a562-3275c82e73a5',
  // NA07_NEEDS_ASSESSOR_ASSIGNED: '28d9f470-3357-496d-aad4-28d7a2e0c2ab',
  // SUPPORT SUMMARY
  SS01_SUPPORT_SUMMARY_UPDATE_TO_INNOVATORS: 'a890bf57-5bf8-407a-85cf-934f133cbcf7',
  SS02_SUPPORT_SUMMARY_UPDATE_TO_OTHER_ENGAGING_ACCESSORS: 'a890bf57-5bf8-407a-85cf-934f133cbcf7',

  // TO BE REMOVED ?
  ACCOUNT_CREATION_TO_INNOVATOR: '62486954-b235-4aa6-8b8d-960191fc6e69',
  ACCOUNT_DELETION_WITH_TRANSFER_TO_COLLABORATOR: 'd09b5182-d995-4db7-b3ba-99fef085bb22',

  INNOVATION_SUBMITED_CONFIRMATION_TO_INNOVATOR: 'f34dd5fd-815b-4cc5-841d-46623ee85ad6',
  INNOVATION_SUBMITTED_TO_ALL_INNOVATORS: '028d4946-3461-43eb-bc02-183162e7b8b1',
  INNOVATION_SUBMITTED_TO_ASSESSMENT_USERS: '20555202-3ee0-4d98-8434-fb86b6f59e26',
  NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR: '69b6e5ee-7427-4765-ad3a-ee72cafa2663',
  NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR: 'cb032a3a-ff63-4794-97fe-c951a54c31dc',
  NEEDS_ASSESSMENT_SUGGESTED_ORG_NOT_SHARED_TO_INNOVATOR: '6b4c42b4-d6c1-4c28-807d-952f8ec0a51b',
  NEEDS_ASSESSMENT_ASSESSOR_UPDATE_TO_OLD_NA: '6f89c296-76f5-43e5-b3fd-6d6fed40549a',
  NEEDS_ASSESSMENT_ASSESSOR_UPDATE_TO_NEW_NA: '64eb40ff-2c89-4f73-9a3f-b5e43e2916f3',
  ORGANISATION_SUGGESTION_TO_QA: '078070fd-832a-4df2-8f7b-ad616654cbbd',
  ORGANISATION_SUGGESTION_NOT_SHARED_TO_INNOVATOR: '6b4c42b4-d6c1-4c28-807d-952f8ec0a51b',

  INNOVATION_SUPPORT_STATUS_UPDATE_TO_INNOVATOR: 'df3e438c-6f0d-4be3-90a6-5b19d15a6060',
  INNOVATION_SUPPORT_STATUS_UPDATE_TO_ASSIGNED_ACCESSORS: 'f63b1459-c1ee-48b3-b0da-12bb19863d19',

  SUPPORT_SUMMARY_UPDATE_TO_INNOVATOR: 'd8f936de-7a0f-4823-a6a3-0a3ce5c3919a',

  THREAD_CREATION_TO_INNOVATOR_FROM_ASSIGNED_USER: '193601d9-4e46-4129-8f79-0f45e015410d',
  THREAD_CREATION_TO_INNOVATOR_FROM_INNOVATOR: '9016c786-c857-4e96-95d2-15ad18e756da',
  THREAD_CREATION_TO_ASSIGNED_USERS: '59838237-8909-42ca-a708-de38e29a4d65',
  THREAD_MESSAGE_CREATION_TO_ALL: 'e5b8f107-0af2-441e-9856-e93f8ea2a123',

  COMMENT_CREATION_TO_INNOVATOR: 'fc3a50df-ee25-46e4-a51d-33e98406b124', // TODO: Deprecated!
  COMMENT_CREATION_TO_ASSIGNED_USERS: 'bea1d925-1fa9-47c2-9fa2-6d630779e06b', // TODO: Deprecated!
  COMMENT_REPLY_TO_ALL: '7c9a754c-4310-44f5-950a-74cbbabd2c57', // TODO: Deprecated!

  INNOVATION_WITHDRAWN_TO_ASSIGNED_USERS: 'fa1bda41-8022-42cb-b66a-2db6de23c07d',

  INNOVATION_TRANSFER_TO_NEW_USER: '94cab12f-7fb9-40f4-bb36-2f54dc96c801',
  INNOVATION_TRANSFER_TO_EXISTING_USER: '756c062e-d7c3-490b-99fe-6a57e809c32e',
  INNOVATION_TRANSFER_COMPLETED_TO_ORIGINAL_OWNER: 'b8814f94-f067-4549-aba0-4f0ff435ca38',
  INNOVATION_TRANSFER_CANCELLED_TO_NEW_OWNER: '27c73742-5f29-4229-b113-36df187bfdd0',
  INNOVATION_TRANSFER_DECLINED_TO_ORIGINAL_OWNER: '03192d09-40fb-48b8-a438-7a6887b33fd5',
  INNOVATION_TRANSFER_REMINDER_EXISTING_USER: '6c704f8b-a991-4b41-95ae-3399ab9c2f2f',
  INNOVATION_TRANSFER_REMINDER_NEW_USER: '594b3cc0-8aa8-4bfa-955e-0f4cd2409cad',
  INNOVATION_TRANSFER_EXPIRED: '24c454fa-039c-4ff0-a268-cc5ba550ea93',
  LOCK_USER_TO_LOCKED_USER: '1ad73192-dc28-4606-a4f3-9dd73aedfd42',

  ACCESSOR_UNIT_CHANGE_TO_USER_MOVED: '29d6e362-5ecd-4bac-8707-a4d92e9e6762',
  ACCESSOR_UNIT_CHANGE_TO_QA_OLD_UNIT: 'ac1c44d2-f65c-49cf-bbbf-d1263a7666d9',
  ACCESSOR_UNIT_CHANGE_TO_QA_NEW_UNIT: 'ab928347-750a-4493-b6b2-df070141727a',

  ACCESSOR_DAILY_DIGEST: 'cd9a21ab-9a81-4e5d-83fe-13413318d9a4',
  INNOVATOR_DAILY_DIGEST: '1f2f2f06-5d6a-424e-8c05-65b9c072d20d',

  UNIT_INACTIVATION_SUPPORT_COMPLETED: '1fbe19f7-2be8-4959-b53c-debe5add86a6',
  INNOVATOR_INCOMPLETE_RECORD: 'afb9c395-b7ff-4a4f-adee-e0c3bec2e9f3',
  QA_A_IDLE_SUPPORT: '420a22ac-b052-4180-8a48-daf787db3f7f',

  INNOVATION_RECORD_EXPORT_REQUEST_TO_INNOVATOR: '783f53f1-6df9-4549-968e-9977648e03f1',
  INNOVATION_RECORD_EXPORT_APPROVED_TO_REQUEST_CREATOR: 'bfb0b9b9-3bd2-40de-9b98-aa3431832e1e',
  INNOVATION_RECORD_EXPORT_REJECTED_TO_REQUEST_CREATOR: '0f74588b-747c-4ebd-96d6-727c8bf18941',

  ACCESSOR_TO_QA_SUPPORT_CHANGE_REQUEST: '09ad791a-faa2-4c51-ba9c-3198430e6f5f',

  INNOVATION_STOP_SHARING_TO_ENGAGING_ACCESSORS: '31ae3d58-1c49-4efd-baf1-73aff9bb3368',
  INNOVATION_STOP_SHARING_TO_INNOVATOR: '61a309c7-dacd-45e0-b7a8-2bc1d01ce1e7',

  INNOVATION_REASSESSMENT_REQUEST_TO_INNOVATOR: 'e5db6887-d578-4d95-9e75-b0682754d95c',
  INNOVATION_REASSESSMENT_REQUEST_TO_NEEDS_ASSESSMENT: 'cb539125-7753-4cce-884e-d612fab03d7b',

  INNOVATION_COLLABORATOR_INVITE_TO_EXISTING_USER: '1cc8087b-ed20-4b55-bdeb-c5cf3d870203',
  INNOVATION_COLLABORATOR_INVITE_TO_NEW_USER: 'bcaef4c6-dbcd-4ea5-be77-8422b4f37241',
  INNOVATION_COLLABORATOR_INVITE_ACCEPTED_TO_OWNER: '56fd8e9d-5860-4e8f-ad18-47a0710a7292',
  INNOVATION_COLLABORATOR_INVITE_DECLINED_TO_OWNER: '3437f816-e829-46aa-9be2-dafaa6f26fc1',
  INNOVATION_COLLABORATOR_LEAVES_TO_OWNER: 'a9efa7d2-4321-4703-9dad-f583196c989d',
  INNOVATION_COLLABORATOR_INVITE_CANCELLED_TO_COLLABORATOR: 'c53845c8-5d7e-4653-b9e6-d8ca5fa99713',
  INNOVATION_COLLABORATOR_REMOVED_TO_COLLABORATOR: 'dd8762c8-3113-49ff-b25d-0aa42425f140',
  INNOVATION_COLLABORATOR_LEAVES_TO_OTHER_COLLABORATORS: '8db47a7d-6d3a-4ab6-8ebb-abec69397b93',
  INNOVATION_COLLABORATOR_LEAVES_TO_COLLABORATOR: '319228ec-121d-430c-8024-b938343232ba'
} as const;
export type EmailTemplates = typeof EmailTemplates;

/**
 * NOTE: Usually, display_name is optional because email-listener will fill it in.
 */
export type EmailTemplatesType = {
  // Tasks
  TA01_TASK_CREATION_TO_INNOVATOR: {
    display_name?: string;
    innovation_name: string;
    unit_name: string;
    task_url: string;
  };
  TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS: {
    display_name?: string;
    task_status: string;
    innovator_name: string;
    innovation_name: string;
    message_url: string;
  };
  TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT: {
    display_name?: string;
    innovation_name: string;
    innovator_name: string;
    message: string;
    message_url: string;
    task_url: string;
  };
  TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT: {
    display_name?: string;
    innovation_name: string;
    innovator_name: string;
    message: string;
    message_url: string;
  };
  TA05_TASK_CANCELLED_TO_INNOVATOR: {
    display_name?: string;
    innovation_name: string;
    accessor_name: string;
    unit_name: string;
    message: string;
    message_url: string;
  };
  TA06_TASK_REOPEN_TO_INNOVATOR: {
    display_name?: string;
    innovation_name: string;
    accessor_name: string;
    unit_name: string;
    message: string;
    message_url: string;
  };

  // Documents
  DC01_UPLOADED_DOCUMENT_TO_INNOVATOR: {
    accessor_name: string;
    unit_name: string;
    document_url: string;
  };

  // Messages
  ME01_THREAD_CREATION: {
    innovation_name: string;
    sender: string;
    thread_url: string;
  };
  ME02_THREAD_ADD_FOLLOWERS: {
    innovation_name: string;
    sender: string;
    thread_url: string;
  };
  ME03_THREAD_MESSAGE_CREATION: {
    innovation_name: string;
    sender: string;
    thread_url: string;
  };

  // Supports
  ST01_SUPPORT_STATUS_TO_ENGAGING: {
    unit_name: string;
    innovation_name: string;
    accessors_name: string;
    message: string;
    message_url: string;
  };
  ST02_SUPPORT_STATUS_TO_OTHER: {
    unit_name: string;
    innovation_name: string;
    message: string;
    status: string;
    support_summary_url: string;
  };
  ST03_SUPPORT_STATUS_TO_WAITING: {
    unit_name: string;
    innovation_name: string;
    message: string;
    support_summary_url: string;
  };
  ST04_SUPPORT_NEW_ASSIGNED_ACCESSORS_TO_INNOVATOR: {
    unit_name: string;
    innovation_name: string;
    accessors_name: string;
    message: string;
    message_url: string;
  };
  ST05_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_NEW_QA: {
    innovation_name: string;
    qa_name: string;
    innovation_overview_url: string;
  };
  ST06_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_OLD_QA: {
    innovation_name: string;
  };

  // NEEDS ASSESSMENT
  NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR: {
    display_name?: string;
    innovation_name: string;
    needs_assessment: 'assessment' | 'reassessment';
  };
  NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT: {
    display_name?: string;
    innovation_name: string;
    needs_assessment: 'assessment' | 'reassessment';
    innovation_overview_url: string;
  };
  // NA03_NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR: {
  //   display_name?: string;
  //   innovation_name: string;
  //   message: string;
  //   message_url: string;
  // };
  // NA04_NEEDS_ASSESSMENT_COMPLETE_TO_INNOVATOR: {
  //   display_name?: string;
  //   innovation_name: string;
  //   needs_assessment_url: string;
  //   data_sharing_preferences_url: string;
  // };
  // NA05_NEEDS_ASSESSOR_REMOVED: {
  //   display_name?: string;
  //   innovation_name: string;
  //   innovation_overview_url: string;
  // };
  // NA06_NEEDS_ASSESSOR_ASSIGNED: {
  //   display_name?: string;
  //   innovation_name: string;
  //   innovation_overview_url: string;
  // };

  // Support Summary
  SS01_SUPPORT_SUMMARY_UPDATE_TO_INNOVATORS: {
    unit_name: string;
    innovation_name: string;
    support_summary_update_url: string;
  };
  SS02_SUPPORT_SUMMARY_UPDATE_TO_OTHER_ENGAGING_ACCESSORS: {
    unit_name: string;
    innovation_name: string;
    support_summary_update_url: string;
  };

  // TODO
  ACCOUNT_CREATION_TO_INNOVATOR: {
    display_name?: string;
    innovation_service_url: string;
  };
  ACCOUNT_DELETION_WITH_TRANSFER_TO_COLLABORATOR: {
    display_name?: string;
    innovation_name: string;
    transfer_expiry_date: string;
  };
  INNOVATION_SUBMITED_CONFIRMATION_TO_INNOVATOR: {
    display_name?: string;
    innovation_name: string;
  };
  INNOVATION_SUBMITTED_TO_ALL_INNOVATORS: {
    display_name?: string;
    innovation_name: string;
  };
  INNOVATION_SUBMITTED_TO_ASSESSMENT_USERS: {
    display_name?: string;
    innovation_name: string;
    innovation_url: string;
  };
  NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR: {
    display_name?: string;
    innovation_name: string;
    message_url: string;
  };
  NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR: {
    display_name?: string;
    innovation_name: string;
    needs_assessment_url: string;
  };
  NEEDS_ASSESSMENT_SUGGESTED_ORG_NOT_SHARED_TO_INNOVATOR: {
    display_name?: string;
    innovation_name: string;
    data_sharing_url: string;
  };
  NEEDS_ASSESSMENT_ASSESSOR_UPDATE_TO_OLD_NA: {
    display_name?: string;
    innovation_name: string;
    innovation_url: string;
  };
  NEEDS_ASSESSMENT_ASSESSOR_UPDATE_TO_NEW_NA: {
    display_name?: string;
    innovation_name: string;
    innovation_url: string;
  };
  ORGANISATION_SUGGESTION_TO_QA: { display_name?: string; innovation_url: string };
  ORGANISATION_SUGGESTION_NOT_SHARED_TO_INNOVATOR: {
    display_name?: string;
    innovation_name: string;
    data_sharing_url: string;
  };
  INNOVATION_SUPPORT_STATUS_UPDATE_TO_INNOVATOR: {
    display_name?: string;
    innovation_name: string;
    organisation_name: string;
    support_status: string;
    support_status_change_comment: string;
    support_url: string;
  };
  INNOVATION_SUPPORT_STATUS_UPDATE_TO_ASSIGNED_ACCESSORS: {
    display_name?: string;
    qa_name: string;
    innovation_url: string;
  };
  SUPPORT_SUMMARY_UPDATE_TO_INNOVATOR: {
    display_name?: string;
    innovation_name: string;
    unit_name: string;
    support_summary_url: string;
  };

  THREAD_CREATION_TO_INNOVATOR_FROM_ASSIGNED_USER: {
    display_name?: string;
    accessor_name: string;
    unit_name: string;
    thread_url: string;
  };
  THREAD_CREATION_TO_INNOVATOR_FROM_INNOVATOR: {
    display_name?: string;
    subject: string;
    innovation_name: string;
    thread_url: string;
  };
  THREAD_CREATION_TO_ASSIGNED_USERS: {
    display_name?: string;
    innovation_name: string;
    thread_url: string;
  };
  THREAD_MESSAGE_CREATION_TO_ALL: {
    display_name?: string;
    subject: string;
    innovation_name: string;
    thread_url: string;
  };
  COMMENT_CREATION_TO_INNOVATOR: {
    display_name?: string;
    accessor_name: string;
    unit_name: string;
    comment_url: string;
  };
  COMMENT_CREATION_TO_ASSIGNED_USERS: {
    display_name?: string;
    innovation_name: string;
    comment_url: string;
  };
  COMMENT_REPLY_TO_ALL: {
    display_name?: string;
    innovation_name: string;
    comment_url: string;
  };
  INNOVATION_WITHDRAWN_TO_ASSIGNED_USERS: {
    display_name?: string;
    innovation_name: string;
  };
  INNOVATION_TRANSFER_TO_NEW_USER: {
    innovator_name: string;
    innovation_name: string;
    transfer_url: string;
  };
  INNOVATION_TRANSFER_TO_EXISTING_USER: {
    innovator_name: string;
    innovation_name: string;
    transfer_url: string;
  };
  INNOVATION_TRANSFER_COMPLETED_TO_ORIGINAL_OWNER: {
    innovator_name?: string;
    innovation_name: string;
    new_innovator_name: string;
    new_innovator_email: string;
  };
  INNOVATION_TRANSFER_CANCELLED_TO_NEW_OWNER: {
    innovator_name?: string;
    innovation_name: string;
  };
  INNOVATION_TRANSFER_DECLINED_TO_ORIGINAL_OWNER: {
    innovator_name?: string;
    new_innovator_name: string;
    innovation_name: string;
    innovation_url: string;
  };
  INNOVATION_TRANSFER_REMINDER_NEW_USER: {
    innovation_name: string;
    transfer_url: string;
  };
  INNOVATION_TRANSFER_REMINDER_EXISTING_USER: {
    innovation_name: string;
    transfer_url: string;
  };
  INNOVATION_TRANSFER_EXPIRED: {
    innovation_name: string;
    innovation_url: string;
  };
  LOCK_USER_TO_LOCKED_USER: { display_name?: string };
  ACCESSOR_UNIT_CHANGE_TO_USER_MOVED: {
    display_name?: string;
    old_organisation: string;
    old_unit: string;
    new_organisation: string;
    new_unit: string;
  };
  ACCESSOR_UNIT_CHANGE_TO_QA_OLD_UNIT: {
    display_name?: string;
    user_name: string;
    old_unit: string;
  };
  ACCESSOR_UNIT_CHANGE_TO_QA_NEW_UNIT: {
    display_name?: string;
    user_name: string;
    new_unit: string;
  };
  ACCESSOR_DAILY_DIGEST: {
    display_name?: string;
    actions_count: string; // TODO rename template
    messages_count: string;
    supports_count: string;
  };
  INNOVATOR_DAILY_DIGEST: {
    display_name?: string;
    actions_count: string; // TODO rename template
    messages_count: string;
    supports_count: string;
  };
  UNIT_INACTIVATION_SUPPORT_COMPLETED: {
    display_name?: string;
    unit_name: string;
    innovation_name: string;
    support_url: string;
  };
  INNOVATOR_INCOMPLETE_RECORD: { display_name?: string; innovation_name: string };
  QA_A_IDLE_SUPPORT: {
    display_name?: string;
    innovation_name: string;
    innovator_name: string;
    message_url: string;
  };
  INNOVATION_RECORD_EXPORT_REQUEST_TO_INNOVATOR: {
    display_name?: string;
    accessor_name: string;
    unit_name: string;
    innovation_name: string;
    pdf_request_comment: string;
    pdf_export_url: string;
  };
  INNOVATION_RECORD_EXPORT_APPROVED_TO_REQUEST_CREATOR: {
    display_name?: string;
    innovation_name: string;
    innovator_name: string;
    innovation_url: string;
  };
  INNOVATION_RECORD_EXPORT_REJECTED_TO_REQUEST_CREATOR: {
    display_name?: string;
    innovation_name: string;
    innovator_name: string;
    innovation_url: string;
    pdf_rejection_comment: null | string;
  };
  ACCESSOR_TO_QA_SUPPORT_CHANGE_REQUEST: {
    display_name?: string;
    innovation_name: string;
    innovation_url: string;
    accessor_name: string;
    proposed_status: string;
    request_status_update_comment: string;
  };

  INNOVATION_STOP_SHARING_TO_ENGAGING_ACCESSORS: {
    display_name?: string;
    innovator_name: string;
    innovation_name: string;
    stop_sharing_comment: string;
  };
  INNOVATION_STOP_SHARING_TO_INNOVATOR: {
    display_name?: string;
    innovation_name: string;
    innovation_url: string;
  };
  INNOVATION_REASSESSMENT_REQUEST_TO_INNOVATOR: {
    display_name?: string;
    innovation_name: string;
  };
  INNOVATION_REASSESSMENT_REQUEST_TO_NEEDS_ASSESSMENT: {
    display_name?: string;
    innovation_name: string;
    innovation_url: string;
  };

  INNOVATION_COLLABORATOR_INVITE_TO_EXISTING_USER: {
    display_name?: string;
    innovator_name: string;
    innovation_name: string;
    transfer_url: string;
  };
  INNOVATION_COLLABORATOR_INVITE_TO_NEW_USER: {
    innovator_name: string;
    innovation_name: string;
    transfer_url: string;
  };
  INNOVATION_COLLABORATOR_INVITE_CANCELLED_TO_COLLABORATOR: {
    innovator_name: string;
    innovation_name: string;
  };
  INNOVATION_COLLABORATOR_INVITE_ACCEPTED_TO_OWNER: {
    display_name?: string;
    collaborator_name: string;
    innovation_name: string;
  };
  INNOVATION_COLLABORATOR_INVITE_DECLINED_TO_OWNER: {
    innovator_name: string;
    collaborator_name: string;
    innovation_name: string;
  };
  INNOVATION_COLLABORATOR_LEAVES_TO_OWNER: {
    display_name?: string;
    collaborator_name: string;
    innovation_name: string;
    innovation_url: string;
  };
  INNOVATION_COLLABORATOR_REMOVED_TO_COLLABORATOR: {
    display_name?: string;
    innovator_name: string;
    innovation_name: string;
  };
  INNOVATION_COLLABORATOR_LEAVES_TO_OTHER_COLLABORATORS: {
    display_name?: string;
    collaborator_name: string;
    innovation_name: string;
    innovation_url: string;
  };
  INNOVATION_COLLABORATOR_LEAVES_TO_COLLABORATOR: {
    display_name?: string;
    innovation_name: string;
  };
};
