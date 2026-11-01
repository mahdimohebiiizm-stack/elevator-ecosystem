import { api } from "@/lib/api";

export type ContractStatus =
  | "PENDING"
  | "QUOTED"
  | "ACTIVE"
  | "REJECTED"
  | "EXPIRED";

export type PaymentFrequency = "MONTHLY" | "QUARTERLY" | "FLEXIBLE";

export type CoreSyncStatus = "NOT_SYNCED" | "SYNCED" | "FAILED" | string;

export interface ServiceContractDto {
  id: string;
  user_id: string;
  building_name?: string | null;
  building_address: string;
  postal_code?: string | null;
  registration_plate?: string | null;
  employer_national_id?: string | null;
  manager_name?: string | null;
  manager_phone?: string | null;
  contract_number?: string | null;
  elevator_type: string;
  stops_count: number;
  capacity_kg: number;
  speed_ms: string;
  usage_type?: string | null;
  qr_code_hash?: string | null;
  annual_price?: number | null;
  monthly_fee?: number | null;
  total_debt?: number | null;
  payment_frequency?: PaymentFrequency | string | null;
  tax_amount?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status: ContractStatus;
  core_building_id?: string | null;
  core_elevator_id?: string | null;
  core_contract_id?: string | null;
  synced_at?: string | null;
  sync_status?: CoreSyncStatus | null;
  sync_error?: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    phone?: string;
    name?: string;
    role: string;
  };
}

export interface ContractCreateDto {
  building_address: string;
  building_name?: string;
  postal_code?: string;
  registration_plate?: string;
  employer_national_id?: string;
  manager_name?: string;
  manager_phone?: string;
  elevator_type: string;
  stops_count: number;
  capacity_kg?: number;
  speed_ms?: string;
  usage_type?: string;
  payment_frequency?: PaymentFrequency | string;
}

export interface ContractAdminUpdateDto {
  building_name?: string;
  postal_code?: string;
  registration_plate?: string;
  employer_national_id?: string;
  manager_name?: string;
  manager_phone?: string;
  contract_number?: string;
  elevator_type?: string;
  stops_count?: number;
  capacity_kg?: number;
  speed_ms?: string;
  usage_type?: string;
  annual_price?: number;
  monthly_fee?: number;
  total_debt?: number;
  payment_frequency?: PaymentFrequency | string;
  tax_amount?: number;
  start_date?: string;
  end_date?: string;
  status?: ContractStatus;
}

/**
 * Customer creates a service contract request
 */
export const createContractRequest = async (payload: ContractCreateDto) => {
  return await api.post<ServiceContractDto>("/contracts", payload);
};

/**
 * Customer fetches their own contracts
 */
export const fetchMyContracts = async () => {
  return await api.get<ServiceContractDto[]>("/contracts/my");
};

/**
 * Admin fetches all contracts
 */
export const fetchAdminContracts = async () => {
  return await api.get<ServiceContractDto[]>("/contracts/admin");
};

/**
 * Admin updates and quotes a contract
 */
export const updateAdminContract = async (
  contractId: string,
  payload: ContractAdminUpdateDto
) => {
  return await api.patch<ServiceContractDto>(
    `/contracts/admin/${contractId}`,
    payload
  );
};

/**
 * Admin manually triggers 1:1 data push and sync to Core App DB
 */
export const syncAdminContract = async (contractId: string) => {
  return await api.post<ServiceContractDto>(
    `/contracts/admin/${contractId}/sync`
  );
};
