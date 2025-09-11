import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Slot } from '../types/slot';

export function useAvailability(courtId: string, date: string) {
  return useQuery({
    queryKey: ['availability', courtId, date],
    queryFn: async () => (await api.get<Slot[]>('/availability', { params: { courtId, date } })).data,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}
