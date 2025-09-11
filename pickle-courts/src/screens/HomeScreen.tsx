import React from 'react';
import { View, FlatList } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useVenues } from '../hooks/useVenues';
import VenueCard from '../components/VenueCard';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const venuesQ = useVenues();

  if (venuesQ.isLoading) return <Text style={{ padding: 16 }}>Đang tải…</Text>;
  if (venuesQ.error)   return <Text style={{ padding: 16 }}>Không tải được danh sách địa điểm</Text>;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={venuesQ.data ?? []}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => (
          <VenueCard
            venue={item}
            onPress={() => navigation.navigate('Venue', {
              venueId: item.id,
              venueName: item.name,
              venueAddress: item.address,
            })}
          />
        )}
      />
    </View>
  );
}
