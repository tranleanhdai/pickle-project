import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export type Venue = {
  id?: string;          // backend có thể trả id
  _id?: string;         // hoặc _id
  name: string;
  address?: string;
  coverUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export function useVenues() {
  return useQuery({
    queryKey: ["venues"],
    queryFn: async (): Promise<Venue[]> => {
      const { data } = await api.get("/venues");
      return data;
    },
  });
}

export function useVenue(id?: string) {
  return useQuery({
    queryKey: ["venue", id],
    queryFn: async (): Promise<Venue> => {
      const { data } = await api.get(`/venues/${id}`);
      return data;
    },
    enabled: !!id, // chỉ fetch khi có id
  });
}
