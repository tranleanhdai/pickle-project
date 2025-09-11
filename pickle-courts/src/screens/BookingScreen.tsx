import { View } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import BookingDetails from '../components/BookingDetails';
import { useCreateBooking } from '../hooks/useCreateBooking';

export default function BookingScreen() {
  const route = useRoute<any>();
  const { venueId, courtId, startAt, endAt, price, date, userId, note } = route.params ?? {};

  const mutation = useCreateBooking();

  const onConfirm = () => {
    mutation.mutate(
      { courtId, date, startAt, endAt, price: Number(price), userId, note },
      {
        onSuccess: (data) => {
          alert(`Đặt sân thành công #${data._id}`);
        },
        onError: (err: any) => {
          alert(err?.message ?? 'Đặt sân thất bại');
        },
      }
    );
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text variant="titleLarge">Xác nhận đặt sân</Text>

      <BookingDetails
        venueId={venueId}
        courtId={courtId}
        date={date}
        startAt={startAt}
        endAt={endAt}
        price={price}
      />

      <Button mode="contained" onPress={onConfirm} disabled={mutation.isPending}>
        {mutation.isPending ? <ActivityIndicator /> : 'Xác nhận thanh toán'}
      </Button>
    </View>
  );
}
