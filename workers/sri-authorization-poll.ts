import cron from "node-cron";
import { prisma } from "@/shared/utils/prisma";
import { pollPendingElectronicDocumentAuthorizations } from "@/src/features/electronic-docs/services/invoice-service";

const DEFAULT_CRON = "*/3 * * * *";

export function startSriAuthorizationPollWorker() {
  const enabled = process.env.SRI_POLL_ENABLED !== "false";
  if (!enabled) {
    console.log("[worker:sri-auth] disabled (SRI_POLL_ENABLED=false)");
    return;
  }

  const schedule = process.env.SRI_POLL_CRON?.trim() || DEFAULT_CRON;
  if (!cron.validate(schedule)) {
    console.error(`[worker:sri-auth] invalid cron expression: ${schedule}`);
    return;
  }

  cron.schedule(schedule, () => {
    void (async () => {
      try {
        const result = await pollPendingElectronicDocumentAuthorizations(prisma);
        if (result.checked > 0) {
          console.log(
            `[worker:sri-auth] checked=${result.checked} updated=${result.updated}`,
          );
        }
      } catch (error) {
        console.error("[worker:sri-auth] poll failed", error);
      }
    })();
  });

  console.log(`[worker:sri-auth] scheduled (${schedule})`);
}
