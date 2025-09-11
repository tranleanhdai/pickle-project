// src/hooks/useCreateBooking.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBooking } from '../api/booking';

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      // invalidate cache danh sách bookings → UI tự cập nhật
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
