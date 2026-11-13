// app/(admin)/communication/support-templates/new/page.tsx
import { Suspense } from "react";
import { TemplateEditorClient } from "../_components/template-editor-client";

export default function NewTemplatePage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <TemplateEditorClient templateId={null} />
    </Suspense>
  );
}
