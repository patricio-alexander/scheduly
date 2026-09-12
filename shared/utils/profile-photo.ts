import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/shared/utils/prisma";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const MAX_BYTES = 2 * 1024 * 1024;

function uploadsDir() {
  return path.join(process.cwd(), "public", "uploads", "avatars");
}

/** Guarda foto de perfil en public/uploads/avatars y actualiza Person.photo. */
export async function savePersonPhoto(
  personId: number,
  file: File,
  previousPhoto: string | null | undefined,
): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error("Formato no permitido (PNG, JPG o WEBP)");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("La foto no puede superar 2 MB");
  }

  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });

  if (previousPhoto?.startsWith("/uploads/avatars/")) {
    const prev = path.join(process.cwd(), "public", previousPhoto);
    await unlink(prev).catch(() => undefined);
  }

  const filename = `person-${personId}-${Date.now()}${ext}`;
  const absolute = path.join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolute, buffer);

  const photoPath = `/uploads/avatars/${filename}`;
  await prisma.person.update({
    where: { id: personId },
    data: { photo: photoPath },
  });
  return photoPath;
}

export async function clearPersonPhoto(
  personId: number,
  previousPhoto: string | null | undefined,
): Promise<void> {
  if (previousPhoto?.startsWith("/uploads/avatars/")) {
    const prev = path.join(process.cwd(), "public", previousPhoto);
    await unlink(prev).catch(() => undefined);
  }
  await prisma.person.update({
    where: { id: personId },
    data: { photo: null },
  });
}
