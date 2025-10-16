// src/hooks/usePosts.ts
import { useInfiniteQuery } from "@tanstack/react-query";
import { listPosts } from "../api/posts";
import type { Post } from "../types/post";

export function usePosts(courtId?: string) {
  const q = useInfiniteQuery({
    enabled: !!courtId,
    queryKey: ["posts", courtId],
    queryFn: async ({ pageParam }) => {
      const res = await listPosts(courtId!, pageParam);
      return res;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 10_000,
  });

  const pages = q.data?.pages ?? [];
  const items: Post[] = pages.flatMap((p) => p.items);

  return {
    items,
    isLoading: q.isLoading,
    isFetchingMore: q.isFetchingNextPage,
    hasAny: items.length > 0,
    error: q.error,
    fetchNext: () => q.fetchNextPage(),
  };
}
