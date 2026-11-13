// app/(admin)/system/blog/posts/_components/post-form-client.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useBlogPost,
  useCreateBlogPost,
  useUpdateBlogPost,
  type BlogPostPayload,
  type BlogPostStatus,
  type BlogPostValidationErrors,
} from "@/hooks/admin/use-blog-posts";
import { useBlogCategories } from "@/hooks/admin/use-blog-categories";
import { CategoryManagerModal } from "@/components/admin/category-manager-modal";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Newspaper, ChevronRight, Save, Loader2,
  PanelRight,
} from "lucide-react";
import type { MediaItem } from "@/hooks/admin/use-media";
import { PostContentCard } from "./post-content-card";
import { PostSettingsCard } from "./post-settings-card";

interface PostFormClientProps {
  postId: number | null;
  backUrl: string;
}

export function PostFormClient({ postId, backUrl }: PostFormClientProps) {
  const router = useRouter();
  const isEdit = postId !== null;

  const { data: existingPost, isLoading: isPostLoading } = useBlogPost(postId);
  const { data: categoriesData, isLoading: isCategoriesLoading } = useBlogCategories();
  const createMutation = useCreateBlogPost();
  const updateMutation = useUpdateBlogPost();

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [status, setStatus] = useState<BlogPostStatus>("draft");
  const [isFeatured, setIsFeatured] = useState(false);
  const [coverMediaId, setCoverMediaId] = useState<number | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [errors, setErrors] = useState<BlogPostValidationErrors>({});

  // Ждём пока загрузятся ВСЕ данные (пост + категории)
  useEffect(() => {
    if (isEdit && isPostLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDataLoaded(false);
      return;
    }
    if (isEdit && !existingPost?.data) {
      setIsDataLoaded(false);
      return;
    }
    if (isCategoriesLoading || !categoriesData) {
      setIsDataLoaded(false);
      return;
    }

    // Все данные готовы — заполняем форму (edit mode)
    if (isEdit && existingPost?.data) {
      const p = existingPost.data;
      
      setTitle(p.title);
      
      setSlug(p.slug);
      
      setExcerpt(p.excerpt ?? "");
      
      setBody(p.body ?? "");
      
      setCategoryId(p.category_id);
      
      setStatus(p.status);
      
      setIsFeatured(p.is_featured);
      
      setCoverMediaId(p.cover_media_id);
      
      setCoverPreviewUrl(p.cover_sm_url ?? null);
      
      setSlugTouched(true);
    }
    
    setIsDataLoaded(true);
  }, [existingPost, isEdit, isPostLoading, isCategoriesLoading, categoriesData]);

  // Auto-generate slug from title (create mode only)
  useEffect(() => {
    if (!isDataLoaded) return;
    if (isEdit) return;
    if (slugTouched) return;
    const generated = slugify(title);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlug(generated);
  }, [title, isEdit, slugTouched, isDataLoaded]);

  const categories = categoriesData?.data ?? [];

  const clearFieldError = (field: string) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    clearFieldError("title");
  };

  const handleSlugChange = (val: string) => {
    setSlug(slugify(val));
    setSlugTouched(true);
    clearFieldError("slug");
  };

  const handleExcerptChange = (val: string) => {
    setExcerpt(val);
    clearFieldError("excerpt");
  };

  const handleStatusChange = (val: string) => {
    setStatus(val as BlogPostStatus);
    clearFieldError("status");
  };

  const handleCategoryChange = (val: string | null) => {
    setCategoryId(val ? parseInt(val, 10) : null);
    clearFieldError("category_id");
  };

  const handleCoverSelect = (media: MediaItem) => {
    setCoverMediaId(media.id);
    setCoverPreviewUrl(media.sm_url || media.url);
    clearFieldError("cover_media_id");
  };

  const handleCoverRemove = () => {
    setCoverMediaId(null);
    setCoverPreviewUrl(null);
  };

  // F12: убрал useCallback — избыточная микрооптимизация.
  const handleBodyChange = (html: string) => {
    setBody(html);
    clearFieldError("body");
  };

  const hasError = (field: string): boolean => Boolean(errors[field]);
  const getFieldError = (field: string): string | null => {
    const err = errors[field];
    return err && err.length > 0 ? err[0] : null;
  };

  const handleSave = () => {
    setErrors({});

    const payload: BlogPostPayload = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || null,
      body: body || "",
      category_id: categoryId,
      status,
      is_featured: isFeatured,
      cover_media_id: coverMediaId,
    };

    const onError = (error: unknown) => {
      const errResponse = error as {
        response?: { data?: { errors?: BlogPostValidationErrors } };
      };
      const newErrors = errResponse?.response?.data?.errors ?? {};
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
      }
    };

    if (isEdit && postId !== null) {
      updateMutation.mutate(
        { id: postId, payload },
        {
          onSuccess: () => {
            // Остаемся на странице редактирования — правильный UX.
            // Toast "Пост обновлен" уже показан в хуке useUpdateBlogPost.
          },
          onError,
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: (createdPost) => {
          if (createdPost?.id) {
            router.push(`/system/blog/posts/${createdPost.id}/edit`);
          } else {
            router.push("/system/blog/posts");
          }
        },
        onError,
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (!isDataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-60px)]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(backUrl)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <button
                onClick={() => router.push("/system/blog/posts")}
                className="hover:text-foreground transition-colors"
              >
                К записям блога
              </button>
              <ChevronRight className="w-4 h-4" />
              <span>{isEdit ? "Редактирование" : "Создание"}</span>
            </div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Newspaper className="w-6 h-6" />
              {title || "Новый пост"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen((v) => !v)}
            className="hidden lg:inline-flex"
          >
            <PanelRight className="w-4 h-4" />
            {sidebarOpen ? "Скрыть панель" : "Показать панель"}
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Сохранить
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main grid */}
      <div
        className={`grid grid-cols-1 gap-6 items-stretch ${
          sidebarOpen ? "lg:grid-cols-3" : "lg:grid-cols-1"
        }`}
      >
        {/* Left column — title + editor */}
        <div className={`flex ${sidebarOpen ? "lg:col-span-2" : "lg:col-span-1"}`}>
          <PostContentCard
            title={title}
            body={body}
            hasTitleError={hasError("title")}
            hasBodyError={hasError("body")}
            titleError={getFieldError("title")}
            bodyError={getFieldError("body")}
            onTitleChange={handleTitleChange}
            onBodyChange={handleBodyChange}
          />
        </div>

        {/* Right column — settings */}
        {sidebarOpen && (
          <div className="lg:col-span-1">
            <PostSettingsCard
              excerpt={excerpt}
              coverPreviewUrl={coverPreviewUrl}
              coverMediaId={coverMediaId}
              slug={slug}
              categoryId={categoryId}
              status={status}
              isFeatured={isFeatured}
              categories={categories}
              errors={errors}
              isEdit={isEdit}
              createdAt={existingPost?.data?.created_at ?? null}
              updatedAt={existingPost?.data?.updated_at ?? null}
              viewsCount={existingPost?.data?.views_count ?? 0}
              onExcerptChange={handleExcerptChange}
              onCoverSelect={handleCoverSelect}
              onCoverRemove={handleCoverRemove}
              onSlugChange={handleSlugChange}
              onCategoryChange={handleCategoryChange}
              onStatusChange={handleStatusChange}
              onFeaturedChange={setIsFeatured}
              onClearError={clearFieldError}
              onOpenCategoryModal={() => setCategoryModalOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Category modal */}
      <CategoryManagerModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        selectedId={categoryId}
        onSelect={(id) => setCategoryId(id)}
      />
    </div>
  );
}

// ============================================
// Хелперы
// ============================================
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}