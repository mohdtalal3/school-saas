import type { School } from "./school.types";

export interface CreateSchoolRequest {
  name: string;
  adminEmail: string;
  adminPassword: string;
  adminName?: string;
}

export interface CreateSchoolResponse {
  school: School;
  admin: {
    id: string;
    email: string;
    name: string;
  };
}

export interface UpdateInstituteProfileRequest {
  name?: string;
  tagline?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  country?: string | null;
  logo_url?: string | null;
}

export interface UpdateAccountSettingsRequest {
  currency_symbol?: string;
  currency_name?: string;
  timezone?: string;
}

export interface MasterLoginRequest {
  email: string;
  password: string;
}

export interface MasterLoginResponse {
  role: "master";
}