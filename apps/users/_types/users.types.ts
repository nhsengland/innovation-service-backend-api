import type { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum, ServiceRoleEnum } from '@users/shared/enums';

export type MinimalInfoDTO = {
  id: string;
  displayName: string;
};

export type UserFullInfoDTO = {
  id: string;
  email: string;
  phone: null | string;
  displayName: string;
  type: ServiceRoleEnum;          // TODO: this should change with the roles, keeping it for now as admin only supports one role and this will be reviewed
  lockedAt: null | string;
  innovations: {
    id: string;
    name: string;
  }[];
  userOrganisations: {
    id: string;
    name: string;
    size: null | string;
    role: AccessorOrganisationRoleEnum | InnovatorOrganisationRoleEnum;
    isShadow: boolean;
    units: { id: string, name: string, acronym: string, supportCount: null | number }[];
  }[];
};