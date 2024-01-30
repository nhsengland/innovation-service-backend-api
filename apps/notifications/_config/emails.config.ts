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
  ST07_SUPPORT_STATUS_CHANGE_REQUEST: '7502777a-a1e7-4a63-bbfa-04eac9bca2ea',

  // NEEDS ASSESSMENT
  NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR: 'fadfc3e8-d48e-446e-a81d-d573d774b725',
  NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT: 'a963bf8d-50a4-4637-8ce1-40bd6bb73de2',
  NA03_NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR: 'c9d63a7a-951b-4529-ac00-53e9b17c2919',
  NA04_NEEDS_ASSESSMENT_COMPLETE_TO_INNOVATOR: '32a777de-3591-4e96-a2f4-181725f8fe2b',
  NA06_NEEDS_ASSESSOR_REMOVED: '5845a1b4-3be6-4f27-a562-3275c82e73a5',
  NA07_NEEDS_ASSESSOR_ASSIGNED: '28d9f470-3357-496d-aad4-28d7a2e0c2ab',

  // SUPPORT SUMMARY
  SS01_SUPPORT_SUMMARY_UPDATE_TO_INNOVATORS: 'a890bf57-5bf8-407a-85cf-934f133cbcf7',
  SS02_SUPPORT_SUMMARY_UPDATE_TO_OTHER_ENGAGING_ACCESSORS: 'a890bf57-5bf8-407a-85cf-934f133cbcf7',

  // AUTOMATIC
  AU01_INNOVATOR_INCOMPLETE_RECORD: '37d20809-05ba-4878-9bbc-49689cc4fe51',
  AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT: '99b47245-0b38-476a-8389-fd8ccecca0b0',
  AU03_INNOVATOR_IDLE_SUPPORT: '53d609ef-30d4-4718-b20b-229924fa1e11',
  AU04_SUPPORT_KPI_REMINDER: 'e1f0a2bc-3b15-4733-ba89-c0d5c9fec38a',
  AU05_SUPPORT_KPI_OVERDUE: '5fe24d48-8def-457d-a81f-56750f38c508',
  AU06_ACCESSOR_IDLE_WAITING: '34f06061-18a1-4b5c-9c35-1759192ff055',
  AU10_ACCESSOR_IDLE_ENGAGING_SUPPORT_FOR_SIX_WEEKS: '8cb2a4b3-92bd-42fa-b8c4-4597e75eae6c',
  // AUTOMATIC / TRANSFER
  AU07_TRANSFER_ONE_WEEK_REMINDER_NEW_USER: 'eae90e2b-4f1f-45d5-a7b3-6af9e328a786',
  AU08_TRANSFER_ONE_WEEK_REMINDER_EXISTING_USER: 'd1a40cf5-85ae-4b0d-ba53-28b0bc374284',
  AU09_TRANSFER_EXPIRED: '46ea9d9c-46fc-44da-b526-d6a59c6738f7',

  // ORGANISATION SUGGESTIONS
  OS01_UNITS_SUGGESTION_TO_SUGGESTED_UNITS_QA: '193dac47-da6c-49a0-8db7-ee951cf5d38d',
  OS02_UNITS_SUGGESTION_NOT_SHARED_TO_INNOVATOR: '8c2d13c8-8e1b-4876-9e01-747db83483eb',
  OS03_INNOVATION_DELAYED_SHARED_SUGGESTION: 'b5845d01-f66e-455c-8f11-6e011394da95',

  // INNOVATION (MANAGEMENT?)
  RE01_EXPORT_REQUEST_SUBMITTED: 'b5f4e789-bdfc-496a-9b27-dbf6c2259ebc',
  RE02_EXPORT_REQUEST_APPROVED: '209f1bff-efdf-4631-8b2a-2f3982ff498d',
  RE03_EXPORT_REQUEST_REJECTED: 'ed2fd3b2-a5a6-472b-86c9-7a837638fc41',
  WI01_INNOVATION_WITHDRAWN: '29d46f19-a64e-47e8-8c8b-f9bf6822b246',
  AI01_INNOVATION_ARCHIVED_TO_SELF: '5a257a85-5681-4e8a-8d64-22227d80c3a6',
  AI02_INNOVATION_ARCHIVED_TO_COLLABORATORS: '66fcdcfd-a2a4-4d58-a1a2-978eb443b1c0',
  AI03_INNOVATION_ARCHIVED_TO_ENGAGING_QA_A: 'e3f5206f-74be-4890-bead-850a0cd3e261',
  AI04_INNOVATION_ARCHIVED_TO_NA_DURING_NEEDS_ASSESSMENT: 'd6eb2d9b-48bd-46bf-a16b-650920900a73',
  SH01_INNOVATION_STOPPED_SHARED_TO_ASSIGNED_USERS: 'ab51f9eb-8826-4ab4-8e8b-97acd8e2edf7',
  SH03_INNOVATION_STOPPED_SHARED_TO_SELF: '42d32a18-95dc-4b0e-9d82-35a96e9c033d',
  DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR: '5c8f9de0-09d3-4e33-8986-387fb5c29224',
  MC01_COLLABORATOR_INVITE_EXISTING_USER: '62b406b3-a17e-4724-8d0d-ff0de839a829',
  MC02_COLLABORATOR_INVITE_NEW_USER: '0b672a10-7a5f-443f-a5ba-536bb0ba32c8',
  MC03_COLLABORATOR_UPDATE_CANCEL_INVITE: 'c902dcbd-72be-43bc-aff6-ea5348a5b9ab',
  MC04_COLLABORATOR_UPDATE_ACCEPTS_INVITE: '074e8c8f-c9ee-4eb2-9fda-f920812150e4',
  MC05_COLLABORATOR_UPDATE_DECLINES_INVITE: '07962b87-8780-4bfc-905b-2cd297a6c81f',
  MC06_COLLABORATOR_UPDATE_REMOVED_COLLABORATOR: '7c36488d-ad13-4120-9caa-c25afe3622b7',
  MC07_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_INNOVATORS: 'f74d0f2a-233d-4761-9975-ef77cfaa88a9',
  MC08_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_SELF: 'd938e2af-be92-46e9-8269-c6a7af1819bf',
  TO01_TRANSFER_OWNERSHIP_NEW_USER: '5cc9990c-6a46-4cba-9062-2a461835d549',
  TO02_TRANSFER_OWNERSHIP_EXISTING_USER: '76e80593-d2f5-46f8-aa73-c29786fa1ac6',
  TO06_TRANSFER_OWNERSHIP_ACCEPTS_PREVIOUS_OWNER: '340c2591-ef26-493a-90a2-55589255f502',
  TO08_TRANSFER_OWNERSHIP_DECLINES_PREVIOUS_OWNER: '497528ab-d996-4c96-a960-41614b99e594',
  TO09_TRANSFER_OWNERSHIP_CANCELED_NEW_OWNER: 'e8486284-950f-47c6-b1e8-7291391ec265',

  // ADMIN
  AP03_USER_LOCKED_TO_LOCKED_USER: '95751f8f-ba65-436c-baa6-dabca6ca7acf',
  AP07_UNIT_INACTIVATED_TO_ENGAGING_INNOVATIONS: '9e18194c-99fd-408e-89a6-47616e647c27',
  AP08_USER_EMAIL_ADDRESS_UPDATED: '170a57ee-718d-44f5-b836-ba9c77de89f4',

  // ACCOUNT
  CA01_ACCOUNT_CREATION_OF_INNOVATOR: 'd4bd42fa-a3a2-4eb3-ab71-844caba26044',
  CA02_ACCOUNT_CREATION_OF_COLLABORATOR: '7dbfa868-126c-4eee-828c-be6f8831342c'
} as const;
export type EmailTemplates = typeof EmailTemplates;

/**
 * NOTE: Usually, display_name is optional because email-listener will fill it in.
 */
export type EmailTemplatesType = {
  // Tasks
  TA01_TASK_CREATION_TO_INNOVATOR: {
    innovation_name: string;
    unit_name: string;
    task_url: string;
  };
  TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS: {
    task_status: string;
    innovator_name: string;
    innovation_name: string;
    message_url: string;
  };
  TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT: {
    innovation_name: string;
    innovator_name: string;
    message: string;
    message_url: string;
    task_url: string;
  };
  TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT: {
    innovation_name: string;
    innovator_name: string;
    message: string;
    message_url: string;
  };
  TA05_TASK_CANCELLED_TO_INNOVATOR: {
    innovation_name: string;
    accessor_name: string;
    unit_name: string;
    message: string;
    message_url: string;
  };
  TA06_TASK_REOPEN_TO_INNOVATOR: {
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
  ST07_SUPPORT_STATUS_CHANGE_REQUEST: {
    accessor_name: string;
    innovation_name: string;
    proposed_status: string;
    request_comment: string;
    innovation_overview_url: string;
  };

  // NEEDS ASSESSMENT
  NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR: {
    innovation_name: string;
    assessment_type: 'assessment' | 'reassessment';
  };
  NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT: {
    innovation_name: string;
    assessment_type: 'assessment' | 'reassessment';
    innovation_overview_url: string;
  };
  NA03_NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR: {
    innovation_name: string;
    message: string;
    message_url: string;
  };
  NA04_NEEDS_ASSESSMENT_COMPLETE_TO_INNOVATOR: {
    innovation_name: string;
    needs_assessment_url: string;
    data_sharing_preferences_url: string;
  };
  NA06_NEEDS_ASSESSOR_REMOVED: {
    innovation_name: string;
    innovation_overview_url: string;
  };
  NA07_NEEDS_ASSESSOR_ASSIGNED: {
    innovation_name: string;
    innovation_overview_url: string;
  };

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

  // Organisation Suggestions
  OS01_UNITS_SUGGESTION_TO_SUGGESTED_UNITS_QA: {
    innovation_name: string;
    organisation_unit: string;
    comment: string;
    innovation_overview_url: string;
    showKPI: 'yes' | 'no'; // If it is used more this could be a NotifyOptionalContent
  };
  OS02_UNITS_SUGGESTION_NOT_SHARED_TO_INNOVATOR: {
    innovation_name: string;
    data_sharing_preferences_url: string;
  };
  OS03_INNOVATION_DELAYED_SHARED_SUGGESTION: {
    innovation_name: string;
    innovation_overview_url: string;
  };

  // Automatic
  AU01_INNOVATOR_INCOMPLETE_RECORD: {
    innovation_record_url: string;
  };

  AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT: {
    innovation_name: string;
    thread_url: string;
    support_summary_url: string;
    support_status_url: string;
  };

  AU03_INNOVATOR_IDLE_SUPPORT: {
    innovation_name: string;
    innovation_record_url: string;
    how_to_proceed_page_url: string;
  };

  AU04_SUPPORT_KPI_REMINDER: {
    innovation_name: string;
    innovation_overview_url: string;
  };

  AU05_SUPPORT_KPI_OVERDUE: {
    innovation_name: string;
    innovation_overview_url: string;
  };

  AU06_ACCESSOR_IDLE_WAITING: {
    innovation_name: string;
    innovation_overview_url: string;
    thread_url: string;
  };

  AU10_ACCESSOR_IDLE_ENGAGING_SUPPORT_FOR_SIX_WEEKS: {
    innovation_name: string;
  };

  // Automatic / Transfer
  AU07_TRANSFER_ONE_WEEK_REMINDER_NEW_USER: {
    innovation_name: string;
    create_account_url: string;
  };

  AU08_TRANSFER_ONE_WEEK_REMINDER_EXISTING_USER: {
    innovation_name: string;
    dashboard_url: string;
  };

  AU09_TRANSFER_EXPIRED: {
    innovation_name: string;
    manage_innovation_url: string;
  };

  // Innovation (management?)
  RE01_EXPORT_REQUEST_SUBMITTED: {
    sender: string;
    innovation_name: string;
    comment: string;
    request_url: string;
  };
  RE02_EXPORT_REQUEST_APPROVED: {
    innovator_name: string;
    innovation_name: string;
    innovation_record_url: string;
  };
  RE03_EXPORT_REQUEST_REJECTED: {
    innovator_name: string;
    innovation_name: string;
    reject_comment: string;
  };
  WI01_INNOVATION_WITHDRAWN: {
    innovation_name: string;
  };
  AI01_INNOVATION_ARCHIVED_TO_SELF: {
    innovation_name: string;
  };
  AI02_INNOVATION_ARCHIVED_TO_COLLABORATORS: {
    innovation_name: string;
  };
  AI03_INNOVATION_ARCHIVED_TO_ENGAGING_QA_A: {
    innovation_name: string;
    archived_url: string;
  };
  AI04_INNOVATION_ARCHIVED_TO_NA_DURING_NEEDS_ASSESSMENT: {
    innovation_name: string;
    assessment_type: 'assessment' | 'reassessment';
  };
  SH01_INNOVATION_STOPPED_SHARED_TO_ASSIGNED_USERS: {
    innovation_name: string;
    innovator_name: string;
    comment: string;
  };
  SH03_INNOVATION_STOPPED_SHARED_TO_SELF: {
    innovation_name: string;
    innovation_overview_url: string;
  };
  DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR: {
    innovation_name: string;
    expiry_date: string;
    innovation_overview_url: string;
  };
  MC01_COLLABORATOR_INVITE_EXISTING_USER: {
    innovator_name: string;
    innovation_name: string;
    invitation_url: string;
  };
  MC02_COLLABORATOR_INVITE_NEW_USER: {
    innovator_name: string;
    innovation_name: string;
    create_account_url: string;
  };
  MC03_COLLABORATOR_UPDATE_CANCEL_INVITE: {
    innovator_name: string;
    innovation_name: string;
  };
  MC04_COLLABORATOR_UPDATE_ACCEPTS_INVITE: {
    innovator_name: string;
    innovation_name: string;
    manage_collaborators_url: string;
  };
  MC05_COLLABORATOR_UPDATE_DECLINES_INVITE: {
    innovator_name: string;
    innovation_name: string;
    manage_collaborators_url: string;
  };
  MC06_COLLABORATOR_UPDATE_REMOVED_COLLABORATOR: {
    innovator_name: string;
    innovation_name: string;
  };
  MC07_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_INNOVATORS: {
    innovator_name: string;
    innovation_name: string;
    manage_collaborators_url: string;
  };
  MC08_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_SELF: { innovation_name: string };
  // Innovation Management / Transfer
  TO01_TRANSFER_OWNERSHIP_NEW_USER: {
    innovator_name: string;
    innovation_name: string;
    create_account_url: string;
  };
  TO02_TRANSFER_OWNERSHIP_EXISTING_USER: {
    innovator_name: string;
    innovation_name: string;
    dashboard_url: string;
  };
  TO06_TRANSFER_OWNERSHIP_ACCEPTS_PREVIOUS_OWNER: {
    innovation_name: string;
    new_innovation_owner: string;
  };
  TO08_TRANSFER_OWNERSHIP_DECLINES_PREVIOUS_OWNER: {
    innovation_name: string;
    new_innovation_owner: string;
    manage_innovation_url: string;
  };
  TO09_TRANSFER_OWNERSHIP_CANCELED_NEW_OWNER: {
    innovator_name: string;
    innovation_name: string;
  };

  // Admin
  AP03_USER_LOCKED_TO_LOCKED_USER: Record<string, never>;
  AP07_UNIT_INACTIVATED_TO_ENGAGING_INNOVATIONS: {
    unit_name: string;
    innovation_name: string;
    support_url: string;
  };
  AP08_USER_EMAIL_ADDRESS_UPDATED: {
    new_email_address: string;
  };

  // Account
  CA01_ACCOUNT_CREATION_OF_INNOVATOR: {
    dashboard_url: string;
  };
  CA02_ACCOUNT_CREATION_OF_COLLABORATOR: {
    multiple_innovations: 'yes' | 'no';
    innovations_name: string;
    dashboard_url: string;
  };
};
