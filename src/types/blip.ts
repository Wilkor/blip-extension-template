export interface BlipApplication {
  shortName: string;
  accessKey: string;
  tenantId: string;
  emailOwner: string;
  name?: string;
}

export interface BlipLoggedUser {
  email: string;
  fullName: string;
  culture?: string;
}

export interface BlipContext {
  application: BlipApplication | null;
  user: BlipLoggedUser | null;
  authorizationKey: string | null;
  loading: boolean;
}
