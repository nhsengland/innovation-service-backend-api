import type {
  AdminErrorsEnum,
  AnnouncementErrorsEnum,
  EmailErrorsEnum,
  GenericErrorsEnum,
  InnovationErrorsEnum,
  OrganisationErrorsEnum,
  UserErrorsEnum
} from '../errors/errors.enums';
import type { AuthErrorsEnum } from '../services/auth/authorization-validation.model';
import type { AppResponse } from './request.types';

export type ErrorResponseType = {
  error: ErrorNamesType;
  message: string;
  details?: ErrorDetailsType;
};

export type BaseErrorType = {
  stack?: string;
  errorResponse: () => AppResponse<ErrorResponseType>;
};

export const isBaseErrorType = (error: any): error is BaseErrorType => {
  return error.errorResponse !== undefined;
};

export type ErrorNamesType =
  | AdminErrorsEnum
  | AuthErrorsEnum
  | GenericErrorsEnum
  | UserErrorsEnum
  | OrganisationErrorsEnum
  | InnovationErrorsEnum
  | EmailErrorsEnum
  | AnnouncementErrorsEnum;
export type ErrorDetailsType = { [key: string]: any } | { [key: string]: any }[];
