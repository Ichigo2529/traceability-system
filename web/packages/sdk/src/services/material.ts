import { ApiClient } from "../client";
import {
  MaterialRequest,
  MaterialRequestCatalogItem,
  MaterialRequestDetail,
  MaterialRequestIssueOptionsResponse,
  MaterialRequestItem,
  MaterialRequestNextNumbers,
} from "../types";

export class MaterialService {
  constructor(private client: ApiClient) {}

  async getRequests(filters?: { status?: string; date_from?: string; date_to?: string }): Promise<MaterialRequest[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.date_from) params.set("date_from", filters.date_from);
    if (filters?.date_to) params.set("date_to", filters.date_to);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return this.client.get<MaterialRequest[]>(`/material-requests${suffix}`);
  }

  async getPendingRequests(): Promise<MaterialRequest[]> {
    return this.client.get<MaterialRequest[]>("/material-requests/pending");
  }

  async getCatalog(): Promise<MaterialRequestCatalogItem[]> {
    return this.client.get<MaterialRequestCatalogItem[]>("/material-requests/catalog");
  }

  async getNextNumbers(): Promise<MaterialRequestNextNumbers> {
    return this.client.get<MaterialRequestNextNumbers>("/material-requests/next-numbers");
  }

  async getRequestById(id: string): Promise<MaterialRequestDetail> {
    return this.client.get<MaterialRequestDetail>(`/material-requests/${id}`);
  }

  async createRequest(data: {
    request_no?: string;
    dmi_no?: string;
    request_date?: string;
    model_id: string;
    section?: string;
    cost_center?: string;
    process_name?: string;
    remarks?: string;
    items: MaterialRequestItem[];
  }): Promise<MaterialRequest> {
    return this.client.post<MaterialRequest>("/material-requests", data);
  }

  async approveRequest(id: string): Promise<{ id: string; status: string }> {
    return this.client.post(`/material-requests/${id}/approve`, {});
  }

  async rejectRequest(id: string, reason?: string): Promise<{ id: string; status: string }> {
    return this.client.post(`/material-requests/${id}/reject`, { reason });
  }

  async issueRequest(id: string, payload?: { dmi_no?: string; remarks?: string }): Promise<{ id: string; status: string }> {
    return this.client.post(`/material-requests/${id}/issue`, payload ?? {});
  }

  async dispatchToForklift(id: string): Promise<{ id: string; status: string; dispatched: boolean }> {
    return this.client.post(`/material-requests/${id}/dispatch-to-forklift`, {});
  }

  async getIssueOptions(id: string): Promise<MaterialRequestIssueOptionsResponse> {
    return this.client.get<MaterialRequestIssueOptionsResponse>(`/material-requests/${id}/issue-options`);
  }

  async issueRequestWithAllocation(
    id: string,
    payload: {
      dmi_no?: string;
      remarks?: string;
      allocations: Array<{
        item_id: string;
        part_number: string;
        do_number: string;
        supplier_id?: string;
        vendor_id?: string;
        issued_packs: number;
        issued_qty?: number;
        supplier_pack_size?: number;
        vendor_pack_size?: number;
        remarks?: string;
      }>;
    }
  ): Promise<{ id: string; status: string }> {
    const normalized = {
      ...payload,
      allocations: payload.allocations.map((line) => ({
        ...line,
        supplier_id: line.supplier_id ?? line.vendor_id,
        supplier_pack_size: line.supplier_pack_size ?? line.vendor_pack_size,
      })),
    };
    return this.client.post(`/material-requests/${id}/issue-with-allocation`, normalized);
  }

  async confirmReceipt(
    id: string,
    payload: {
      scans: Array<{
        part_number: string;
        do_number: string;
        scan_data: string;
      }>;
      remarks?: string;
    }
  ): Promise<{ id: string; status: string; received_by_user_id?: string; received_at?: string; scans_saved?: number }> {
    return this.client.post(`/material-requests/${id}/confirm-receipt`, payload);
  }

  async acknowledgeForklift(id: string): Promise<{ id: string; status: string; forklift_acknowledged: boolean }> {
    return this.client.post(`/material-requests/${id}/ack-forklift`, {});
  }

  async withdrawRequest(id: string, reason?: string): Promise<{ id: string; status: string; alert_status?: string }> {
    return this.client.post(`/material-requests/${id}/withdraw`, { reason });
  }
}
