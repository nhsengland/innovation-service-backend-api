import { ResponseHelper } from '../helpers';

import type { AppResponse, BaseErrorType, ErrorNamesType } from '../types';

type ErrorDetailsType = { [key: string]: any } | { [key: string]: any }[];

export class UnauthorizedError extends Error implements BaseErrorType {
  details: undefined | ErrorDetailsType;
  constructor(name: ErrorNamesType, data?: { message?: string; details?: ErrorDetailsType }) {
    super(data?.message || 'Unauthorized operation');
    this.name = name;
    this.details = data?.details;
  }
  errorResponse(): AppResponse {
    return ResponseHelper.Unauthorized({ error: this.name, message: this.message });
  }
}

export class ForbiddenError extends Error implements BaseErrorType {
  details: undefined | ErrorDetailsType;
  constructor(name: ErrorNamesType, data?: { message?: string; details?: ErrorDetailsType }) {
    super(data?.message || 'Forbidden operation');
    this.name = name;
    this.details = data?.details;
  }
  errorResponse(): AppResponse {
    return ResponseHelper.Forbidden({
      error: this.name,
      message: this.message,
      details: this.details,
    });
  }
}

export class NotFoundError extends Error implements BaseErrorType {
  details: undefined | ErrorDetailsType;
  constructor(name: ErrorNamesType, data?: { message?: string; details?: ErrorDetailsType }) {
    super(data?.message || 'Resource not found');
    this.name = name;
    this.details = data?.details;
  }
  errorResponse(): AppResponse {
    return ResponseHelper.NotFound({
      error: this.name,
      message: this.message,
      details: this.details,
    });
  }
}

export class BadRequestError extends Error implements BaseErrorType {
  details: undefined | ErrorDetailsType;
  constructor(name: ErrorNamesType, data?: { message?: string; details?: ErrorDetailsType }) {
    super(data?.message || 'Invalid request');
    this.name = name;
    this.details = data?.details;
  }
  errorResponse(): AppResponse {
    return ResponseHelper.BadRequest({
      error: this.name,
      message: this.message,
      details: this.details,
    });
  }
}

export class InternalServerError extends Error implements BaseErrorType {
  details: undefined | ErrorDetailsType;
  constructor(name: ErrorNamesType, data?: { message?: string; details?: ErrorDetailsType }) {
    super(data?.message || 'Internal server error');
    this.name = name;
    this.details = data?.details;
  }
  errorResponse(): AppResponse {
    return ResponseHelper.Internal({ error: this.name, message: this.message });
  }
}

export class NotImplementedError extends Error implements BaseErrorType {
  details: undefined | ErrorDetailsType;
  constructor(name: ErrorNamesType, data?: { message?: string; details?: ErrorDetailsType }) {
    super(data?.message || 'Not Implemented');
    this.name = name;
    this.details = data?.details;
  }
  errorResponse(): AppResponse {
    return ResponseHelper.NotImplemented({
      error: this.name,
      message: this.message,
      details: this.details,
    });
  }
}

export class ServiceUnavailableError extends Error implements BaseErrorType {
  details: undefined | ErrorDetailsType;
  constructor(name: ErrorNamesType, data?: { message?: string; details?: ErrorDetailsType }) {
    super(data?.message || 'Service unavailable');
    this.name = name;
    this.details = data?.details;
  }
  errorResponse(): AppResponse {
    return ResponseHelper.ServiceUnavailable({
      error: this.name,
      message: this.message,
      details: this.details,
    });
  }
}

export class ConflictError extends Error implements BaseErrorType {
  details: undefined | ErrorDetailsType;
  constructor(name: ErrorNamesType, data?: { message?: string; details?: ErrorDetailsType }) {
    super(data?.message || 'Request conflict');
    this.name = name;
    this.details = data?.details;
  }
  errorResponse(): AppResponse {
    return ResponseHelper.Conflict({
      error: this.name,
      message: this.message,
      details: this.details,
    });
  }
}

export class UnprocessableEntityError extends Error implements BaseErrorType {
  details: undefined | ErrorDetailsType;
  constructor(name: ErrorNamesType, data?: { message?: string; details?: ErrorDetailsType }) {
    super(data?.message || 'Unable to process the required instruction');
    this.name = name;
    this.details = data?.details;
  }
  errorResponse(): AppResponse {
    return ResponseHelper.UnprocessableEntity({
      error: this.name,
      message: this.message,
      details: this.details,
    });
  }
}
