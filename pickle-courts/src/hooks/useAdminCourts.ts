import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCourt, updateCourt, deleteCourt, type Court } from "../api/courts";

const QK = { courts: ["courts"] as const };

export function useCreateCourt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Court>) => createCourt(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.courts }),
  });
}

export function useUpdateCourt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Court> }) =>
      updateCourt(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.courts }),
  });
}

export function useDeleteCourt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCourt(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.courts }),
  });
}
