import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import type { Venue } from '../hooks/useVenues';

type Props = {
  venue: Venue;
  onPress?: () => void;
};

export default function VenueCard({ venue, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={{ marginBottom: 12, paddingVertical: 4 }}>
        <Card.Title title={venue.name} subtitle={venue.address} />
      </Card>
    </TouchableOpacity>
  );
}
