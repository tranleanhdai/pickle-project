// pickle-courts/src/api/venues.ts
import { api } from "./client";

export type Venue = {
  id: string;
  name: string;
  address?: string;
  coverUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/** GET /api/venues */
export async function listVenues() {
  const { data } = await api.get<Venue[]>("/venues");
  return data;
}

/** GET /api/venues/:id */
export async function getVenue(id: string) {
  const { data } = await api.get<Venue>(`/venues/${id}`);
  return data;
}

/** POST /api/venues  (admin) */
export async function createVenue(body: Partial<Venue>) {
  const { data } = await api.post<Venue>("/venues", body);
  return data;
}

/** PATCH /api/venues/:id  (admin) */
export async function updateVenue(id: string, patch: Partial<Venue>) {
  const { data } = await api.patch<Venue>(`/venues/${id}`, patch);
  return data;
}

/** DELETE /api/venues/:id  (admin) */
export async function deleteVenue(id: string) {
  const { data } = await api.delete<{ ok: true }>(`/venues/${id}`);
  return data;
}
