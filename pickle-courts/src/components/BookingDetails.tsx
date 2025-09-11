import React from 'react';
import { Card, Text } from 'react-native-paper';

type Props = {
  venueId: string;
  courtId: string;
  date: string;
  startAt: string;
  endAt: string;
  price: number | string;
};

export default function BookingDetails({
  venueId, courtId, date, startAt, endAt, price,
}: Props) {
  return (
    <Card style={{ padding: 16 }}>
      <Text>Venue: {venueId}</Text>
      <Text>Court: {courtId}</Text>
      <Text>Ngày: {date}</Text>
      <Text>Giờ: {startAt} → {endAt}</Text>
      <Text>Giá: {Number(price).toLocaleString()} đ</Text>
    </Card>
  );
}
