// app/(admin)/system/blog/page.tsx
import { redirect } from "next/navigation";

export default function BlogIndexPage() {
  redirect("/system/blog/posts");
}