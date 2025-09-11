import React from 'react';
import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';

type Props = {
  courtName: string;
  date: string;
  today: string;
  tomorrow: string;
  onChangeDate: (d: string) => void;
};

export default function CourtHeader({ courtName, date, today, tomorrow, onChangeDate }: Props) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 6 }}>{courtName}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button mode={date === today ? 'contained' : 'outlined'} onPress={() => onChangeDate(today)}>
          Hôm nay
        </Button>
        <Button mode={date === tomorrow ? 'contained' : 'outlined'} onPress={() => onChangeDate(tomorrow)}>
          Ngày mai
        </Button>
      </View>
    </View>
  );
}
