export enum GenericErrorsEnum {
  SERVICE_SQL_UNAVAILABLE = 'GEN.0001',
  SERVICE_NOSQL_UNAVAILABLE = 'GEN.0002',
  SERVICE_IDENTIY_UNAVAILABLE = 'GEN.0003',
  SERVICE_IDENTIY_UNAUTHORIZED = 'GEN.0004',
  SERVICE_EMAIL_UNAVAILABLE = 'GEN.0005',

  SERVICE_FILE_STORAGE_ERROR = 'GEN.0006',

  INVALID_PAYLOAD = 'GEN.0100',

  INTERNAL_CONFIGURATION_ERROR = 'GEN.0300',
  INTERNAL_TYPING_ERROR = 'GEN.0301',

  UNKNOWN_ERROR = 'ERR.1000',
  NOT_IMPLEMENTED_ERROR = 'ERR.1001',
  EXTERNAL_SERVICE_ERROR = 'ERR.1002'
}

export enum UserErrorsEnum {
  REQUEST_USER_INVALID_TOKEN = 'U.0001',
  USER_IDENTITY_PROVIDER_NOT_FOUND = 'U.0002',
  USER_SQL_NOT_FOUND = 'U.0003',
  USER_INFO_EMPTY_INPUT = 'U.0004',
  USER_ALREADY_EXISTS = 'U.0005',
  USER_TYPE_INVALID = 'U.0006',
  USER_TERMS_OF_USE_NOT_FOUND = 'U.0007',
  USER_TERMS_OF_USE_INVALID = 'U.0008',
  USER_INVALID_ACCESSOR_PARAMETERS = 'U.0009',
  USER_MODEL_INVALID = 'U.0010',
  USER_ANNOUNCEMENT_NOT_FOUND = 'U.0011',
  USER_ROLE_NOT_FOUND = 'U.0012'
}

export enum OrganisationErrorsEnum {
  ORGANISATION_NOT_FOUND = 'O.0001',
  ORGANISATIONS_NOT_FOUND = 'O.0002',
  ORGANISATION_UNIT_NOT_FOUND = 'O.0003',
  ORGANISATION_UNITS_NOT_FOUND = 'O.0004',
  ORGANISATION_UNIT_ACTIVATE_NO_QA = 'O.0005',
  ORGANISATION_ALREADY_EXISTS = 'O.0006',
  ORGANISATION_UNIT_ALREADY_EXISTS = 'O.0007',
  ORGANISATION_USER_NOT_FOUND = 'O.0008',
  ORGANISATION_USER_FROM_OTHER_ORG = 'O.0009',
  ORGANISATION_UNIT_USER_ALREADY_EXISTS = 'O.0010',
  ORGANISATION_UNIT_USER_CANT_BE_INNOVATOR_OR_ADMIN = 'O.0011',
  ORGANISATION_UNIT_USER_MISMATCH_ROLE = 'O.0012'
}

export enum InnovationErrorsEnum {
  INNOVATION_INFO_EMPTY_INPUT = 'I.0001',
  INNOVATION_NOT_FOUND = 'I.0002',
  INNOVATION_ALREADY_EXISTS = 'I.0003',

  INNOVATION_WITH_INVALID_ASSESSMENTS = 'I.0004',
  INNOVATION_CANNOT_REQUEST_REASSESSMENT = 'I.0005',

  INNOVATION_DOCUMENT_VERSION_NOT_SUPPORTED = 'I.0006',
  INNOVATION_DOCUMENT_VERSION_MISMATCH = 'I.0007',

  INNOVATION_OWNER_NOT_FOUND = 'I.0008',

  INNOVATION_WIDTHRAW_ERROR = 'I.0010',

  INNOVATION_TRANSFER_ALREADY_EXISTS = 'I.0020',
  INNOVATION_TRANSFER_REQUESTED_FOR_SELF = 'I.0021',
  INNOVATION_TRANSFER_NOT_FOUND = 'I.0022',
  INNOVATION_TRANSFER_TARGET_USER_MUST_BE_INNOVATOR = 'I.0023',

  INNOVATION_NO_SECTIONS = 'I.0030',
  INNOVATION_SECTION_NOT_FOUND = 'I.0031',
  INNOVATION_SECTION_WITH_UNPROCESSABLE_STATUS = 'I.0032',
  INNOVATION_SECTIONS_INCOMPLETE = 'I.0033',
  INNOVATION_SECTIONS_CONFIG_UNAVAILABLE = 'I.0034',
  INNOVATION_SECTIONS_CONFIG_LOOKUP_NOT_ARRAY = 'I.0035',

  INNOVATION_SUPPORT_NOT_FOUND = 'I.0040',
  INNOVATION_SUPPORT_WITH_UNPROCESSABLE_ORGANISATION_UNIT = 'I.0041',
  INNOVATION_SUPPORT_ALREADY_EXISTS = 'I.0042',
  INNOVATION_SUPPORT_LOG_ERROR = 'I.0043',
  INNOVATION_SUPPORT_CANNOT_HAVE_ASSIGNED_ASSESSORS = 'I.0044',
  INNOVATION_SUPPORT_UNIT_NOT_ENGAGING = 'I.0045',

  INNOVATION_FILE_DELETE_ERROR = 'I.0050',

  INNOVATION_EVIDENCE_NOT_FOUND = 'I.0060',

  INNOVATION_ACTIVITY_LOG_ERROR = 'IAL.0070',
  INNOVATION_ACTIVITY_LOG_INVALID_ITEM = 'IAL.0071',

  INNOVATION_ASSESSMENT_NOT_FOUND = 'IA.0080',
  INNOVATION_ASSESSMENT_ALREADY_EXISTS = 'IA.0081',
  INNOVATION_ASSESSMENT_NOT_SUBMITTED = 'IA.0082',

  INNOVATION_THREAD_NOT_FOUND = 'IT.0001',
  INNOVATION_THREAD_CREATION_FAILED = 'IT.0003',

  INNOVATION_THREAD_MESSAGE_NOT_FOUND = 'ITM.0001',
  INNOVATION_THREAD_MESSAGE_NOT_EDITABLE = 'ITM.0002',
  INNOVATION_THREAD_MESSAGE_EDIT_UNAUTHORIZED = 'ITM.0003',

  INNOVATION_COMMENT_INVALID_PARAMETERS = 'IC.0001', // TODO: Deprecated!
  INNOVATION_COMMENT_CREATE_ERROR = 'IC.0002', // TODO: Deprecated!
  INNOVATION_COMMENT_NOT_FOUND = 'IC.0003', // TODO: Deprecated!

  INNOVATION_ACTION_NOT_FOUND = 'IA.0090',
  INNOVATION_ACTION_WITH_UNPROCESSABLE_STATUS = 'IA.0091',
  INNOVATION_ACTION_FROM_DIFFERENT_UNIT = 'IA.0092',

  INNOVATION_SHARING_PREFERENCES_UPDATE = 'ISP.0001',

  INNOVATION_EXPORT_REQUEST_ALREADY_EXISTS = 'IER.0001',
  INNOVATION_EXPORT_REQUEST_NOT_FOUND = 'IER.0002',
  INNOVATION_RECORD_EXPORT_REQUEST_FROM_DIFFERENT_UNIT = 'IER.0003',
  INNOVATION_RECORD_EXPORT_REQUEST_WITH_UNPROCESSABLE_STATUS = 'IER.0004',
  INNOVATION_RECORD_EXPORT_REQUEST_NO_PERMISSION_TO_UPDATE = 'IER.0005',

  INNOVATION_COLLABORATOR_NOT_FOUND = 'ICB.0001',
  INNOVATION_COLLABORATOR_WITH_VALID_REQUEST = 'ICB.0002',
  INNOVATION_COLLABORATOR_NO_ACCESS = 'ICB.0003',
  INNOVATION_COLLABORATOR_WITH_UNPROCESSABLE_STATUS = 'ICB.0004',
  INNOVATION_COLLABORATOR_CANT_BE_OWNER = 'ICB.0005',
  INNOVATION_COLLABORATOR_MUST_BE_INNOVATOR = 'ICB.0006',
  INNOVATION_COLLABORATOR_MUST_BE_OWNER = 'ICB.0007',

  INNOVATION_FILE_NOT_FOUND = 'IF.0001',
  INNOVATION_FILE_ON_INNOVATION_SECTION_MUST_BE_UPLOADED_BY_INNOVATOR = 'IF.0002',
  INNOVATION_FILE_NO_PERMISSION_TO_DELETE = 'IF.0003',
  INNOVATION_MAX_ALLOWED_FILES_REACHED = 'IF.0004',
  INNOVATION_FILE_ON_INNOVATION_EVIDENCE_MUST_BE_UPLOADED_BY_INNOVATOR = 'IF.0005',
  INNOVATION_FILE_FORBIDDEN_SECTION = 'IF.0006',

  INNOVATION_SUPPORT_SUMMARY_PROGRESS_UPDATE_NOT_FOUND = 'ISS.0001',
  INNOVATION_SUPPORT_SUMMARY_PROGRESS_DELETE_MUST_BE_FROM_UNIT = 'ISS.0002'
}

export enum EmailErrorsEnum {
  EMAIL_TEMPLATE_NOT_FOUND = 'EM.0001',
  EMAIL_TEMPLATE_WITH_INVALID_PROPERTIES = 'EM.0002',
  EMAIL_BAD_API_KEY = 'EM.0003'
}

export enum AdminErrorsEnum {
  ADMIN_TERMS_OF_USE_NOT_FOUND = 'AT.0001'
}

export enum AnnouncementErrorsEnum {
  ANNOUNCEMENT_NOT_FOUND = 'AN.0001',
  ANNOUNCEMENT_NO_TARGET_ROLES = 'AN.0002',
  ANNOUNCEMENT_NO_TARGET_USERS = 'AN.0003',
  ANNOUNCEMENT_CANT_BE_UPDATED_IN_DONE_STATUS = 'AN.0004',
  ANNOUNCEMENT_INVALID_PAYLOAD_FOR_THE_CUR_STATUS = 'AN.0005',
  ANNOUNCEMENT_CANT_BE_DELETED_IN_DONE_STATUS = 'AN.0006'
}
