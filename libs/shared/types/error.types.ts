import type { GenericErrorsEnum, UserErrorsEnum, OrganisationErrorsEnum, InnovationErrorsEnum, EmailErrorsEnum } from '../errors/errors.enums';
import type { AuthErrorsEnum } from '../services/auth/authorization-validation.model';


export type BaseErrorType = {
  errorResponse: () => void;
}

export type ErrorNamesType = AuthErrorsEnum | GenericErrorsEnum | UserErrorsEnum | OrganisationErrorsEnum | InnovationErrorsEnum | EmailErrorsEnum;
export type ErrorDetailsType = { [key: string]: any } | { [key: string]: any }[];
