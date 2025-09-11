import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export type Court = { id: string; name: string; venueId: string };

export function useCourts(venueId: string) {
  return useQuery({
    queryKey: ['courts', venueId],
    queryFn: async () => (await api.get<Court[]>('/courts', { params: { venueId } })).data,
    staleTime: 30_000,
  });
}
