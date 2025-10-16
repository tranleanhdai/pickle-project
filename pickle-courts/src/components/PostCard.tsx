import React, { useMemo, useState } from "react";
import { Image, View } from "react-native";
import { Card, Text, Chip } from "react-native-paper";
import type { Post } from "../types/post";
import { likePost, unlikePost } from "../api/posts";

type Props = {
  post: Post;
  onPressCourt?: () => void;
  onPressComments?: () => void;
};

export default function PostCard({ post, onPressCourt, onPressComments }: Props) {
  const first = post.images?.[0];
  const [likes, setLikes] = useState(post.likeCount);
  const [liked, setLiked] = useState(!!post.liked);
  const [loading, setLoading] = useState(false);

  const likeLabel = useMemo(() => (liked ? "Đã thích" : "Thích"), [liked]);

  const toggleLike = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (!liked) {
        const r = await likePost(post.id);
        setLiked(true);
        if (!r.duplicated) setLikes((n) => n + 1);
      } else {
        await unlikePost(post.id);
        setLiked(false);
        setLikes((n) => Math.max(0, n - 1));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ marginBottom: 16, overflow: "hidden" }} elevation={1}>
      {first?.url ? (
        <Image
          source={{ uri: first.url }}
          style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "#f3f4f6" }}
          resizeMode="cover"
        />
      ) : null}

      <Card.Content style={{ paddingVertical: 12 }}>
        {post.content ? (
          <Text style={{ marginBottom: 8 }} variant="bodyLarge">
            {post.content}
          </Text>
        ) : null}

        {/* Action bar: dùng Chip để đỡ vỡ layout Android */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <Chip
            icon="thumb-up"
            selected={liked}
            onPress={toggleLike}
            disabled={loading}
          >
            {likeLabel} · {likes}
          </Chip>

          <Chip icon="message-text-outline" onPress={onPressComments}>
            Bình luận · {post.commentCount}
          </Chip>

          <Chip icon="eye">{post.viewCount}</Chip>

          {onPressCourt ? (
            <Chip style={{ marginLeft: "auto" }} onPress={onPressCourt}>
              Xem sân
            </Chip>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );
}
