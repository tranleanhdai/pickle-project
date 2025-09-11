import React, { useMemo, useState } from 'react';
import { View, FlatList, RefreshControl, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import dayjs from 'dayjs';

import { useAvailability } from '../hooks/useAvailability';
import { useBookSlot, useCancelBooking, useUpdateBookingNote } from '../hooks/useBookingMutations';
import type { Slot } from '../types/slot';

import CourtHeader from '../components/CourtHeader';
import SlotCard from '../components/SlotCard';
import NoteDialog from '../components/NoteDialog';

export default function CourtScreen() {
  const route = useRoute<any>();
  const { courtId, courtName } = route.params as { courtId: string; courtName: string };

  const today = dayjs().format('YYYY-MM-DD');
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const [date, setDate] = useState<string>(today);

  const q = useAvailability(courtId, date);
  const bookM = useBookSlot(courtId, date);
  const cancelM = useCancelBooking(courtId, date);
  const updateNoteM = useUpdateBookingNote(courtId, date);

  // Dialog note
  const [openNote, setOpenNote] = useState(false);
  const [draftNote, setDraftNote] = useState('');
  const [pendingSlot, setPendingSlot] = useState<Slot | null>(null);
  const [mode, setMode] = useState<'book' | 'edit'>('book');

  const openBookDialog = (slot: Slot) => {
    setMode('book'); setPendingSlot(slot); setDraftNote(''); setOpenNote(true);
  };
  const openEditDialog = (slot: Slot) => {
    setMode('edit'); setPendingSlot(slot); setDraftNote(slot.note || ''); setOpenNote(true);
  };

  const header = useMemo(
    () => <CourtHeader courtName={courtName} date={date} today={today} tomorrow={tomorrow} onChangeDate={setDate} />,
    [courtName, date, today, tomorrow]
  );

  if (q.isLoading) return <Text style={{ padding: 16 }}>Đang tải…</Text>;
  if (q.error) return <Text style={{ padding: 16, color: 'red' }}>Không tải được khung giờ</Text>;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {header}

      <FlatList
        data={q.data ?? []}
        keyExtractor={(s) => s.id}
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
        ListEmptyComponent={<Text>Không có khung giờ</Text>}
        renderItem={({ item }) => (
          <SlotCard
            slot={item}
            isBooking={bookM.isPending}
            onBook={openBookDialog}
            onCancel={(id) => cancelM.mutate(id, {
              onSuccess: () => Alert.alert('Đã hủy', 'Bạn đã hủy đặt sân.'),
              onError: (err: any) => Alert.alert('Lỗi', err?.response?.data?.error || err?.message || 'Hủy thất bại'),
            })}
            onEditNote={openEditDialog}
          />
        )}
      />

      <NoteDialog
        visible={openNote}
        mode={mode}
        draftNote={draftNote}
        setDraftNote={setDraftNote}
        onClose={() => setOpenNote(false)}
        onSubmit={() => {
          setOpenNote(false);
          if (mode === 'book' && pendingSlot) {
            bookM.mutate(
              { slot: pendingSlot, note: draftNote.trim() || undefined },
              {
                onSuccess: () => Alert.alert('Thành công', 'Bạn đã đặt sân!'),
                onError: (err: any) => {
                  const msg = err?.response?.status === 409
                    ? 'Suất này vừa có người đặt mất rồi.'
                    : err?.response?.data?.error || err?.message || 'Đặt sân thất bại';
                  Alert.alert('Lỗi', msg);
                },
              }
            );
          }
          if (mode === 'edit' && pendingSlot?.bookingId) {
            updateNoteM.mutate(
              { bookingId: pendingSlot.bookingId, note: draftNote },
              {
                onSuccess: () => Alert.alert('OK', 'Đã cập nhật ghi chú.'),
                onError: (err: any) => Alert.alert('Lỗi', err?.response?.data?.error || err?.message || 'Cập nhật thất bại'),
              }
            );
          }
        }}
      />
    </View>
  );
}
