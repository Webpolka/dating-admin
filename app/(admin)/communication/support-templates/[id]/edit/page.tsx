// app/(admin)/communication/support-templates/[id]/edit/page.tsx
import { Suspense } from "react";
import { TemplateEditorClient } from "../../_components/template-editor-client";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const templateId = parseInt(id, 10);

  if (Number.isNaN(templateId)) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Неверный ID шаблона
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <TemplateEditorClient templateId={templateId} />
    </Suspense>
  );
}
