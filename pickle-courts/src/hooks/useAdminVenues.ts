// src/hooks/useAdminVenues.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createVenue, updateVenue, deleteVenue, type Venue } from "../api/venues";

export function useCreateVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Venue>) => createVenue(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venues"] });
    },
  });
}

export function useUpdateVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Venue> }) =>
      updateVenue(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venues"] });
    },
  });
}

export function useDeleteVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVenue(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venues"] });
    },
  });
}
