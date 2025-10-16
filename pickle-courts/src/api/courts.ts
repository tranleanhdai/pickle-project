// pickle-courts/src/api/courts.ts
import { api } from "./client";

export type Court = {
  id: string;
  _id?: string;            // phòng khi backend trả _id
  venueId: string;
  name: string;
  coverUrl?: string | null;
  pricePerHour?: number;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/** --- đã có sẵn --- */
export async function setCourtCover(courtId: string, coverUrl: string) {
  const { data } = await api.patch(`/courts/${courtId}/cover`, { coverUrl });
  return data as { id: string; name: string; venueId: string; coverUrl: string | null };
}

/** --- mới thêm: CRUD --- */
export async function listCourts() {
  const { data } = await api.get<Court[]>("/courts");
  return data;
}

export async function getCourt(id: string) {
  const { data } = await api.get<Court>(`/courts/${id}`);
  return data;
}

export async function createCourt(body: Partial<Court>) {
  const { data } = await api.post<Court>("/courts", body);
  return data;
}

export async function updateCourt(id: string, patch: Partial<Court>) {
  const { data } = await api.patch<Court>(`/courts/${id}`, patch);
  return data;
}

export async function deleteCourt(id: string) {
  const { data } = await api.delete<{ ok: boolean }>(`/courts/${id}`);
  return data;
}
