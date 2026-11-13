// app/(admin)/system/blog/posts/new/page.tsx
import { PostFormClient } from "../_components/post-form-client";

export default function NewBlogPostPage() {
  return <PostFormClient postId={null} backUrl="/system/blog/posts" />;
}