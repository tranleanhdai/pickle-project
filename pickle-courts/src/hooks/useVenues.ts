import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export type Venue = { id: string; name: string; address: string };

export function useVenues() {
  return useQuery({
    queryKey: ['venues'],
    queryFn: async () => (await api.get<Venue[]>('/venues')).data,
    staleTime: 30_000,
  });
}
