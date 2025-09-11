import React from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useCourts } from '../hooks/useCourts';
import CourtCard from '../components/CourtCard';

export default function VenueScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { venueId, venueName, venueAddress } = route.params as {
    venueId: string; venueName: string; venueAddress: string;
  };

  const courtsQ = useCourts(venueId);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Venue info */}
      <Text style={{ fontSize: 22, fontWeight: 'bold' }}>{venueName}</Text>
      <Text style={{ color: 'gray', marginBottom: 16 }}>{venueAddress}</Text>

      {/* Courts list */}
      {courtsQ.isLoading ? (
        <Text>Đang tải…</Text>
      ) : courtsQ.error ? (
        <Text style={{ color: 'red' }}>Không tải được danh sách sân</Text>
      ) : (
        <FlatList
          data={courtsQ.data ?? []}
          keyExtractor={(c) => c.id}
          refreshControl={
            <RefreshControl refreshing={courtsQ.isFetching} onRefresh={() => courtsQ.refetch()} />
          }
          ListEmptyComponent={<Text>Chưa có sân cho địa điểm này</Text>}
          renderItem={({ item }) => (
            <CourtCard
              court={item}
              onPress={() => navigation.navigate('Court', { courtId: item.id, courtName: item.name })}
            />
          )}
        />
      )}
    </View>
  );
}
