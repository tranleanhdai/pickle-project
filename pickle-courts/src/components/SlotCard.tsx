import React from 'react';
import { Alert } from 'react-native';
import { Card, Button, Text } from 'react-native-paper';
import type { Slot } from '../types/slot';

type Props = {
  slot: Slot;
  onBook: (slot: Slot) => void;
  onCancel: (bookingId: string) => void;
  onEditNote: (slot: Slot) => void;
  isBooking?: boolean;
};

export default function SlotCard({ slot, onBook, onCancel, onEditNote, isBooking }: Props) {
  return (
    <Card style={{ marginBottom: 12 }}>
      <Card.Title
        title={`${slot.startAt} → ${slot.endAt}`}
        subtitle={`${new Intl.NumberFormat('vi-VN').format(slot.price)} đ`}
      />
      <Card.Content>
        <Text style={{ color: slot.isBooked ? 'red' : 'green' }}>
          {slot.isBooked ? 'ĐÃ ĐẶT' : 'CÒN TRỐNG'}
        </Text>
        {!!slot.note && slot.isBooked && (
          <Text style={{ marginTop: 4, opacity: 0.7 }}>Ghi chú: {slot.note}</Text>
        )}
      </Card.Content>
      <Card.Actions style={{ gap: 8 }}>
        {!slot.isBooked && (
          <Button mode="contained" disabled={isBooking} onPress={() => onBook(slot)}>
            {isBooking ? 'Đang đặt...' : 'Đặt sân'}
          </Button>
        )}
        {slot.isBooked && slot.isMine && slot.bookingId && (
          <>
            <Button
              mode="outlined"
              onPress={() =>
                Alert.alert('Xác nhận', 'Bạn muốn hủy đặt sân này?', [
                  { text: 'Không' },
                  { text: 'Hủy', style: 'destructive', onPress: () => onCancel(slot.bookingId!) },
                ])
              }
            >
              Hủy
            </Button>
            <Button onPress={() => onEditNote(slot)}>Ghi chú</Button>
          </>
        )}
      </Card.Actions>
    </Card>
  );
}
