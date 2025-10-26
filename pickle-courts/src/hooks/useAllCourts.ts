// src/hooks/useAllCourts.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Court } from "../api/courts";

const idOf = (x: any) => String(x?.id ?? x?._id ?? "");
const vIdOf = (x: any) =>
  String(x?.venueId ?? x?.venue?.id ?? x?.venue?._id ?? "");

type Opts = {
  enabled?: boolean;
  staleTimeMs?: number;
};

export function useAllCourts(opts: Opts = {}) {
  const { enabled = true, staleTimeMs = 60_000 } = opts;

  return useQuery<Court[]>({
    queryKey: ["courts", "all"],
    enabled, // <-- KHÔNG gọi có điều kiện; chỉ *fetch* có điều kiện
    staleTime: staleTimeMs,
    queryFn: async () => {
      const res = await api.get("/courts"); // GET /api/courts
      const list = Array.isArray(res.data?.items)
        ? res.data.items
        : Array.isArray(res.data)
        ? res.data
        : [];

      return list.map((c: any) => ({
        ...c,
        id: idOf(c),
        venueId: vIdOf(c),
      }));
    },
  });
}
