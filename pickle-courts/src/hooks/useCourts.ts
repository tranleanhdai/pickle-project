import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export type Court = {
  id: string;
  name: string;
  venueId: string;
  coverUrl?: string | null;   // 👈 thêm
};

export function useCourts(venueId?: string) {
  return useQuery({
    queryKey: ["courts", venueId],
    queryFn: () => api.get(`/courts?venueId=${venueId}`).then(r => r.data),
    enabled: !!venueId, // ⬅️ chỉ gọi khi có venueId
  });
}
