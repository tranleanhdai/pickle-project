import React from "react";
import { View, Image } from "react-native";
import { Text, Card } from "react-native-paper";

type Props = {
  venueName?: string;
  courtName?: string;
  imageUrl: string | null; // cho phép null
};

export default function CourtHero({ venueName, courtName, imageUrl }: Props) {
  if (!imageUrl && !courtName && !venueName) return null;

  return (
    <Card style={{ marginBottom: 12, overflow: "hidden" }}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: "100%", aspectRatio: 16 / 9 }}
          resizeMode="cover"
        />
      ) : null}
      <View style={{ padding: 12 }}>
        {!!venueName && <Text style={{ fontSize: 16, fontWeight: "600" }}>{venueName}</Text>}
        {!!courtName && (
          <Text style={{ color: "#6b7280", marginTop: 2 }}>{courtName}</Text>
        )}
      </View>
    </Card>
  );
}
