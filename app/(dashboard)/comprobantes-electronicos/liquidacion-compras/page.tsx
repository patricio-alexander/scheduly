"use client";

import { ElectronicDocsPreview } from "@/shared/components/ElectronicDocsPreview";
import { appRoutes } from "@/shared/utils/app-routes";

export default function ElectronicPurchaseSettlementPage() {
  return <ElectronicDocsPreview activeHref={appRoutes.electronicDocs.purchaseSettlement} />;
}
