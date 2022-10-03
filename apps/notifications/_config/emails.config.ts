export enum EmailTypeEnum {
  ACCOUNT_CREATION_TO_INNOVATOR = '62486954-b235-4aa6-8b8d-960191fc6e69',
  INNOVATION_SUBMITED_TO_INNOVATOR = 'f34dd5fd-815b-4cc5-841d-46623ee85ad6',
  INNOVATION_SUBMITTED_TO_ASSESSMENT_USERS = '20555202-3ee0-4d98-8434-fb86b6f59e26',
  NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR = 'cb032a3a-ff63-4794-97fe-c951a54c31dc',
  ORGANISATION_SUGGESTION_TO_QA = '078070fd-832a-4df2-8f7b-ad616654cbbd',
  INNOVATION_SUPPORT_STATUS_UPDATE_TO_INNOVATOR = '002cd16a-97da-43b5-836f-8631dbbcca84',
  ACTION_CREATION_TO_INNOVATOR = '384ab7ad-6c0c-4e5d-9b0c-e4502bf07c7e',
  THREAD_CREATION_TO_INNOVATOR = '193601d9-4e46-4129-8f79-0f45e015410d',
  THREAD_CREATION_TO_ASSIGNED_USERS = '59838237-8909-42ca-a708-de38e29a4d65',
  THREAD_MESSAGE_CREATION_TO_ALL = 'e5b8f107-0af2-441e-9856-e93f8ea2a123',
  COMMENT_CREATION_TO_INNOVATOR = 'fc3a50df-ee25-46e4-a51d-33e98406b124', // TODO: Deprecated!
  COMMENT_CREATION_TO_ASSIGNED_USERS = 'bea1d925-1fa9-47c2-9fa2-6d630779e06b', // TODO: Deprecated!
  COMMENT_REPLY_TO_ALL = '7c9a754c-4310-44f5-950a-74cbbabd2c57', // TODO: Deprecated!
  INNOVATION_ARCHIVED_TO_ASSIGNED_USERS = 'fa1bda41-8022-42cb-b66a-2db6de23c07d',
  INNOVATION_TRANSFER_TO_NEW_USER = '94cab12f-7fb9-40f4-bb36-2f54dc96c801',
  INNOVATION_TRANSFER_TO_EXISTING_USER = '756c062e-d7c3-490b-99fe-6a57e809c32e',
  INNOVATION_TRANSFER_COMPLETED_TO_ORIGINAL_OWNER = 'b8814f94-f067-4549-aba0-4f0ff435ca38',
  INNOVATION_TRANSFER_CANCELLED_TO_NEW_OWNER = '27c73742-5f29-4229-b113-36df187bfdd0',
  INNOVATION_TRANSFER_DECLINED_TO_ORIGINAL_OWNER = '03192d09-40fb-48b8-a438-7a6887b33fd5',
  SLS_VALIDATION = '93dd9c64-1914-4fa3-b5f3-27e33f2770d5',
  LOCK_USER_TO_LOCKED_USER = '1ad73192-dc28-4606-a4f3-9dd73aedfd42',
  ACCESSOR_UNIT_CHANGE_TO_USER_MOVED = '29d6e362-5ecd-4bac-8707-a4d92e9e6762',
  ACCESSOR_UNIT_CHANGE_TO_QA_OLD_UNIT = 'ac1c44d2-f65c-49cf-bbbf-d1263a7666d9',
  ACCESSOR_UNIT_CHANGE_TO_QA_NEW_UNIT = 'ab928347-750a-4493-b6b2-df070141727a',
  ACCESSOR_DAILY_DIGEST = 'cd9a21ab-9a81-4e5d-83fe-13413318d9a4',
  INNOVATOR_DAILY_DIGEST = '1f2f2f06-5d6a-424e-8c05-65b9c072d20d',
  UNIT_INACTIVATION_SUPPORT_COMPLETED = '1fbe19f7-2be8-4959-b53c-debe5add86a6',
  INNOVATOR_INCOMPLETE_RECORD = 'afb9c395-b7ff-4a4f-adee-e0c3bec2e9f3',
  QA_A_IDLE_SUPPORT= '420a22ac-b052-4180-8a48-daf787db3f7f'
}


/**
 * NOTE: Usually, display_name is optional because email-listener will fill it in.
 */
export type EmailTemplatesType = {
  [EmailTypeEnum.ACCOUNT_CREATION_TO_INNOVATOR]: { display_name?: string, innovation_service_url: string },
  [EmailTypeEnum.INNOVATION_SUBMITED_TO_INNOVATOR]: { display_name?: string, innovation_name: string },
  [EmailTypeEnum.INNOVATION_SUBMITTED_TO_ASSESSMENT_USERS]: { display_name?: string, innovation_name: string, innovation_url: string },
  [EmailTypeEnum.NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR]: { display_name?: string, innovation_name: string, needs_assessment_url: string },
  [EmailTypeEnum.ORGANISATION_SUGGESTION_TO_QA]: { display_name?: string, innovation_url: string },
  [EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_INNOVATOR]: { display_name?: string, innovation_name: string, organisation_name: string, support_url: string },
  [EmailTypeEnum.ACTION_CREATION_TO_INNOVATOR]: { display_name?: string, accessor_name: string, unit_name: string, action_url: string },
  [EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR]: { display_name?: string, accessor_name: string, unit_name: string, thread_url: string }
  [EmailTypeEnum.THREAD_CREATION_TO_ASSIGNED_USERS]: { display_name?: string, innovation_name: string, thread_url: string }
  [EmailTypeEnum.THREAD_MESSAGE_CREATION_TO_ALL]: { display_name?: string, subject: string, innovation_name: string, thread_url: string }
  [EmailTypeEnum.COMMENT_CREATION_TO_INNOVATOR]: { display_name?: string, accessor_name: string, unit_name: string, comment_url: string },
  [EmailTypeEnum.COMMENT_CREATION_TO_ASSIGNED_USERS]: { display_name?: string, innovation_name: string, comment_url: string },
  [EmailTypeEnum.COMMENT_REPLY_TO_ALL]: { display_name?: string, innovation_name: string, comment_url: string },
  [EmailTypeEnum.INNOVATION_ARCHIVED_TO_ASSIGNED_USERS]: { display_name?: string, innovation_name: string },
  [EmailTypeEnum.INNOVATION_TRANSFER_TO_NEW_USER]: { innovator_name: string, innovation_name: string, transfer_url: string },
  [EmailTypeEnum.INNOVATION_TRANSFER_TO_EXISTING_USER]: { innovator_name: string, innovation_name: string, transfer_url: string },
  [EmailTypeEnum.INNOVATION_TRANSFER_COMPLETED_TO_ORIGINAL_OWNER]: { innovator_name?: string, innovation_name: string, new_innovator_name: string, new_innovator_email: string },
  [EmailTypeEnum.INNOVATION_TRANSFER_CANCELLED_TO_NEW_OWNER]: { innovator_name?: string, innovation_name: string },
  [EmailTypeEnum.INNOVATION_TRANSFER_DECLINED_TO_ORIGINAL_OWNER]: { innovator_name?: string, new_innovator_name: string, innovation_name: string },
  [EmailTypeEnum.SLS_VALIDATION]: { display_name?: string, code: string },
  [EmailTypeEnum.LOCK_USER_TO_LOCKED_USER]: { display_name?: string },
  [EmailTypeEnum.ACCESSOR_UNIT_CHANGE_TO_USER_MOVED]: { display_name?: string, old_organisation: string, old_unit: string, new_organisation: string, new_unit: string },
  [EmailTypeEnum.ACCESSOR_UNIT_CHANGE_TO_QA_OLD_UNIT]: { display_name?: string, user_name: string, old_unit: string },
  [EmailTypeEnum.ACCESSOR_UNIT_CHANGE_TO_QA_NEW_UNIT]: { display_name?: string, user_name: string, new_unit: string },
  [EmailTypeEnum.ACCESSOR_DAILY_DIGEST]: { display_name?: string, actions_count: string, messages_count: string, supports_count: string },
  [EmailTypeEnum.INNOVATOR_DAILY_DIGEST]: { display_name?: string, actions_count: string, messages_count: string, supports_count: string },
  [EmailTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED]: { display_name?: string, unit_name: string, innovation_name: string, support_url: string },
  [EmailTypeEnum.INNOVATOR_INCOMPLETE_RECORD]: { display_name?: string, innovation_name: string },
  [EmailTypeEnum.QA_A_IDLE_SUPPORT]: { display_name?: string, innovation_name: string, innovator_name: string },
}
