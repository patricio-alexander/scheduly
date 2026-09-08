import { prisma } from "@/shared/utils/prisma";

export type SystemLogInput = {
  httpMethod: string;
  endPoint: string;
  action: string;
  description?: string | null;
  system?: string | null;
  date?: Date;
};

/** Escritura a SystemLog (estilo EdDeli Logs). */
export async function writeSystemLog(input: SystemLogInput): Promise<void> {
  try {
    await prisma.systemLog.create({
      data: {
        httpMethod: input.httpMethod,
        endPoint: input.endPoint,
        action: input.action,
        description: input.description ?? null,
        system: input.system ?? null,
        date: input.date ?? new Date(),
      },
    });
  } catch (err) {
    console.error("SystemLog write failed", err);
  }
}

/** Variante fire-and-forget (middleware / rutas que no pueden await). */
export function writeSystemLogFireAndForget(input: SystemLogInput): void {
  void writeSystemLog(input);
}
