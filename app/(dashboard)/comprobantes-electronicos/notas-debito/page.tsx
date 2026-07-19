"use client";

import { ElectronicDocsPreview } from "@/shared/components/ElectronicDocsPreview";
import { appRoutes } from "@/shared/utils/app-routes";

export default function ElectronicDebitNotesPage() {
  return <ElectronicDocsPreview activeHref={appRoutes.electronicDocs.debitNotes} />;
}
