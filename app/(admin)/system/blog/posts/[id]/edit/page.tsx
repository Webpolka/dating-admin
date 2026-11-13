// app/(admin)/admin/blog/posts/[id]/edit/page.tsx
import { PostFormClient } from "../../_components/post-form-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPostPage({ params }: PageProps) {
  const { id } = await params;
  const postId = parseInt(id, 10);

  if (isNaN(postId)) {
    return <div className="p-6 text-destructive">Неверный ID поста</div>;
  }

  return <PostFormClient postId={postId} backUrl="/system/blog/posts" />;
}