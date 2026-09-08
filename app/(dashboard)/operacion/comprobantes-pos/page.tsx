"use client";

import { PosDocsPreview } from "@/shared/components/PosDocsPreview";
import { appRoutes } from "@/shared/utils/app-routes";

export default function ComprobantesPosHubPage() {
  return <PosDocsPreview activeHref={appRoutes.posDocs.hub} />;
}
