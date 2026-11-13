// app/(admin)/system/blog/posts/page.tsx
import { Suspense } from "react";
import { PostsTableClient } from "./_components/posts-table-client";

export default function BlogPostsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <PostsTableClient />
    </Suspense>
  );
}