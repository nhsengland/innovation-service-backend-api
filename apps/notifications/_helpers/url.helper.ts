import { ServiceRoleEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { CurrentCatalogTypes } from '@notifications/shared/schemas/innovation-record';
import { ENV } from '../_config';

export const innovationOverviewUrl = (role: ServiceRoleEnum, innovationId: string, notificationId: string): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/overview')
    .setPathParams({ baseUrl, innovationId })
    .setQueryParams({ dismissNotification: notificationId })
    .buildUrl();
};

export const innovationRecordUrl = (role: ServiceRoleEnum, innovationId: string, notificationId: string): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/record')
    .setPathParams({ baseUrl, innovationId })
    .setQueryParams({ dismissNotification: notificationId })
    .buildUrl();
};

export const innovationRecordSectionUrl = (
  role: ServiceRoleEnum,
  innovationId: string,
  section: CurrentCatalogTypes.InnovationSections,
  notificationId: string
): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/record/sections/:section')
    .setPathParams({ baseUrl, innovationId, section })
    .setQueryParams({ dismissNotification: notificationId })
    .buildUrl();
};

export const howToProceedUrl = (
  role: ServiceRoleEnum.INNOVATOR,
  innovationId: string,
  notificationId: string
): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/how-to-proceed')
    .setPathParams({ baseUrl, innovationId })
    .setQueryParams({ dismissNotification: notificationId })
    .buildUrl();
};

export const manageInnovationUrl = (
  role: ServiceRoleEnum.INNOVATOR,
  innovationId: string,
  notificationId: string
): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/manage/innovation')
    .setPathParams({ baseUrl, innovationId })
    .setQueryParams({ dismissNotification: notificationId })
    .buildUrl();
};

export const assessmentUrl = (
  role: ServiceRoleEnum,
  innovationId: string,
  assessmentId: string,
  notificationId: string
): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/assessments/:assessmentId')
    .setPathParams({ baseUrl, innovationId, assessmentId })
    .setQueryParams({ dismissNotification: notificationId })
    .buildUrl();
};

export const taskUrl = (
  role: ServiceRoleEnum,
  innovationId: string,
  taskId: string,
  notificationId: string
): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/tasks/:taskId')
    .setPathParams({ baseUrl, innovationId, taskId })
    .setQueryParams({ dismissNotification: notificationId })
    .buildUrl();
};

export const threadsUrl = (role: ServiceRoleEnum, innovationId: string, notificationId: string): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/threads')
    .setPathParams({ baseUrl, innovationId })
    .setQueryParams({ dismissNotification: notificationId })
    .buildUrl();
};

export const threadUrl = (
  role: ServiceRoleEnum,
  innovationId: string,
  threadId: string,
  notificationId: string
): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/threads/:threadId')
    .setPathParams({ baseUrl, innovationId, threadId })
    .setQueryParams({ dismissNotification: notificationId })
    .buildUrl();
};

export const documentUrl = (
  role: ServiceRoleEnum,
  innovationId: string,
  documentId: string,
  notificationId: string
): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/documents/:documentId')
    .setPathParams({ baseUrl, innovationId, documentId })
    .setQueryParams({ dismissNotification: notificationId })
    .buildUrl();
};

export const supportStatusUrl = (
  role: ServiceRoleEnum.ACCESSOR | ServiceRoleEnum.QUALIFYING_ACCESSOR,
  innovationId: string,
  supportId: string,
  notificationId: string
): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/support/:supportId')
    .setPathParams({ baseUrl, innovationId, supportId })
    .setQueryParams({ dismissNotification: notificationId })
    .buildUrl();
};

export const supportSummaryUrl = (
  role: ServiceRoleEnum,
  innovationId: string,
  notificationId: string,
  unitId?: string
): string => {
  const baseUrl = frontendBaseUrl(role);
  const urlModel = new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/support-summary')
    .setPathParams({ baseUrl, innovationId })
    .setQueryParams({ dismissNotification: notificationId });

  if (unitId) {
    urlModel.addQueryParams({ unitId });
  }

  return urlModel.buildUrl();
};

export const dataSharingPreferencesUrl = (
  role: ServiceRoleEnum,
  innovationId: string,
  notificationId: string
): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/support')
    .setPathParams({ baseUrl, innovationId })
    .setQueryParams({ dismissNotification: notificationId })
    .buildUrl();
};

export const exportRequestUrl = (
  role: ServiceRoleEnum,
  innovationId: string,
  requestId: string,
  notificationId: string
): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/record/export-requests/:requestId')
    .setPathParams({ baseUrl, innovationId, requestId })
    .setQueryParams({ dismissNotification: notificationId })
    .buildUrl();
};

export const collaboratorInfoUrl = (
  role: ServiceRoleEnum,
  innovationId: string,
  collaboratorId: string,
  notificationId: string
): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/collaborations/:collaboratorId')
    .setPathParams({ baseUrl, innovationId, collaboratorId })
    .setQueryParams({ dismissNotification: notificationId })
    .buildUrl();
};

export const manageCollaboratorsUrl = (innovationId: string, notificationId: string): string => {
  const baseUrl = frontendBaseUrl(ServiceRoleEnum.INNOVATOR);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl/innovations/:innovationId/manage/innovation/collaborators')
    .setPathParams({ baseUrl, innovationId })
    .setQueryParams({ dismissNotification: notificationId })
    .buildUrl();
};

export const dashboardUrl = (role: ServiceRoleEnum, notificationId: string): string => {
  const baseUrl = frontendBaseUrl(role);
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath(':baseUrl')
    .setPathParams({ baseUrl })
    .setQueryParams({ dismissNotification: notificationId })
    .buildUrl();
};

export const createAccountUrl = (): string => {
  return new UrlModel(ENV.webBaseTransactionalUrl).addPath('signup').buildUrl();
};

export const nhsInnovationServiceUrl = (): string => {
  return new UrlModel(ENV.webBaseTransactionalUrl).buildUrl();
};

export const unsubscribeUrl = (notificationId: string): string => {
  return new UrlModel(ENV.webBaseTransactionalUrl)
    .addPath('account/email-notifications')
    .setQueryParams({ dismissNotification: notificationId })
    .buildUrl();
};

export const frontendBaseUrl = (role: ServiceRoleEnum): string => {
  switch (role) {
    case ServiceRoleEnum.ASSESSMENT:
      return 'assessment';
    case ServiceRoleEnum.ACCESSOR:
    case ServiceRoleEnum.QUALIFYING_ACCESSOR:
      return 'accessor';
    case ServiceRoleEnum.INNOVATOR:
      return 'innovator';
    case ServiceRoleEnum.ADMIN:
      return 'admin';
    default: {
      const x: never = role;
      throw new Error(`Unknown role: ${x}`); // never happens
    }
  }
};
