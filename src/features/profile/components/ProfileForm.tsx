"use client";

import { useForm } from "react-hook-form";
import { Button, Label } from "@heroui/react";
import type { ProfileData } from "../types";
import { apiUrl } from "@/shared/utils/api";
import { useEffect, useMemo, useRef, useState } from "react";
import Picture from "@gravity-ui/icons/Picture";

interface Props {
  profile: ProfileData;
  onSave: (data: FormData | Partial<ProfileData>) => Promise<void>;
}

const GENDER_OPTIONS = [
  { value: "", label: "—" },
  { value: "F", label: "Femenino" },
  { value: "M", label: "Masculino" },
  { value: "O", label: "Otro" },
];

const BLOOD_OPTIONS = ["", "O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function photoSrc(photo: string | null) {
  if (!photo) return null;
  if (photo.startsWith("http") || photo.startsWith("data:")) return photo;
  return apiUrl(photo);
}

export function ProfileForm({ profile, onSave }: Props) {
  const [pending, setPending] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: profile.name,
      email: profile.email,
      phone: profile.phone ?? "",
      birthday: toDateInput(profile.birthday),
      gender: profile.gender ?? "",
      bloodType: profile.bloodType ?? "",
      placeResidence: profile.placeResidence ?? "",
      direction: profile.direction ?? "",
    },
  });

  useEffect(() => {
    if (!photoFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const displayPhoto = useMemo(() => {
    if (removePhoto) return null;
    if (previewUrl) return previewUrl;
    return photoSrc(profile.photo);
  }, [previewUrl, profile.photo, removePhoto]);

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const fieldClass =
    "w-full h-8 px-2.5 rounded-lg border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-1 focus:ring-focus focus:border-focus text-xs transition-shadow";

  const onPickPhoto = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) return;
    setPhotoFile(file);
    setRemovePhoto(false);
  };

  const onSubmit = async (data: Record<string, string>) => {
    setPending(true);
    try {
      if (photoFile || removePhoto) {
        const form = new FormData();
        form.set("name", data.name);
        form.set("email", data.email);
        form.set("phone", data.phone || "");
        form.set("birthday", data.birthday || "");
        form.set("gender", data.gender || "");
        form.set("bloodType", data.bloodType || "");
        form.set("placeResidence", data.placeResidence || "");
        form.set("direction", data.direction || "");
        if (removePhoto) form.set("removePhoto", "1");
        if (photoFile) form.set("photo", photoFile);
        await onSave(form);
        setPhotoFile(null);
        setRemovePhoto(false);
      } else {
        await onSave({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          birthday: data.birthday || null,
          gender: data.gender || null,
          bloodType: data.bloodType || null,
          placeResidence: data.placeResidence || null,
          direction: data.direction || null,
        });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-separator bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-focus"
          title="Subir foto"
        >
          {displayPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayPhoto}
              alt="Foto de perfil"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-muted">
              {initials}
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/45 py-0.5 text-[10px] text-white">
            <Picture width={12} height={12} />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{profile.name}</p>
          <p className="text-[11px] text-muted truncate">
            PNG/JPG/WEBP · máx. 2 MB
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <button
              type="button"
              className="text-[11px] text-accent underline-offset-2 hover:underline"
              onClick={() => fileRef.current?.click()}
            >
              Cambiar foto
            </button>
            {(profile.photo || photoFile) && !removePhoto ? (
              <button
                type="button"
                className="text-[11px] text-danger underline-offset-2 hover:underline"
                onClick={() => {
                  setPhotoFile(null);
                  setRemovePhoto(true);
                }}
              >
                Quitar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
        <div className="col-span-2 flex flex-col gap-0.5">
          <Label htmlFor="name" className="text-[11px]">
            Nombre
          </Label>
          <input
            id="name"
            className={fieldClass}
            {...register("name", { required: "Obligatorio" })}
          />
          {errors.name ? (
            <p className="text-[10px] text-danger">
              {String(errors.name.message ?? "")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-0.5">
          <Label htmlFor="email" className="text-[11px]">
            Correo
          </Label>
          <input
            id="email"
            type="email"
            className={fieldClass}
            {...register("email", { required: "Obligatorio" })}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="phone" className="text-[11px]">
            Teléfono
          </Label>
          <input id="phone" className={fieldClass} {...register("phone")} />
        </div>

        <div className="flex flex-col gap-0.5">
          <Label htmlFor="birthday" className="text-[11px]">
            Cumpleaños
          </Label>
          <input
            id="birthday"
            type="date"
            className={fieldClass}
            {...register("birthday")}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="gender" className="text-[11px]">
            Género
          </Label>
          <select id="gender" className={fieldClass} {...register("gender")}>
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value || "none"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-0.5">
          <Label htmlFor="bloodType" className="text-[11px]">
            Sangre
          </Label>
          <select
            id="bloodType"
            className={fieldClass}
            {...register("bloodType")}
          >
            {BLOOD_OPTIONS.map((o) => (
              <option key={o || "none"} value={o}>
                {o || "—"}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="placeResidence" className="text-[11px]">
            Residencia
          </Label>
          <input
            id="placeResidence"
            className={fieldClass}
            placeholder="Ciudad"
            {...register("placeResidence")}
          />
        </div>

        <div className="col-span-2 flex flex-col gap-0.5">
          <Label htmlFor="direction" className="text-[11px]">
            Dirección
          </Label>
          <input
            id="direction"
            className={fieldClass}
            placeholder="Calle, sector…"
            {...register("direction")}
          />
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="sm"
        isDisabled={pending}
        className="self-end"
      >
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
