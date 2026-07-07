"use client";

import { useForm } from "react-hook-form";
import { Button, Label, TextArea } from "@heroui/react";
import type { ProfileData } from "../types";
import Person from "@gravity-ui/icons/Person";
import Envelope from "@gravity-ui/icons/Envelope";
import Telephone from "@gravity-ui/icons/Smartphone";
import { useState } from "react";

interface Props {
  profile: ProfileData;
  onSave: (data: Partial<ProfileData>) => Promise<void>;
}

export function ProfileForm({ profile, onSave }: Props) {
  const [pending, setPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: profile.name,
      email: profile.email,
      phone: profile.phone ?? "",
      bio: profile.bio ?? "",
    },
  });

  const onSubmit = async (data: Record<string, string>) => {
    setPending(true);
    try {
      await onSave({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        bio: data.bio || null,
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 max-w-lg"
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="name">Nombre</Label>
        <div className="relative">
          <Person
            width={16}
            height={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            id="name"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus focus:border-focus text-sm transition-shadow"
            {...register("name", { required: "El nombre es obligatorio" })}
          />
        </div>
        {errors.name && (
          <p className="text-danger text-sm">
            {String(errors.name.message ?? "")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="email">Correo electrónico</Label>
        <div className="relative">
          <Envelope
            width={16}
            height={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            id="email"
            type="email"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus focus:border-focus text-sm transition-shadow"
            {...register("email", { required: "El correo es obligatorio" })}
          />
        </div>
        {errors.email && (
          <p className="text-danger text-sm">
            {String(errors.email.message ?? "")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="phone">Teléfono</Label>
        <div className="relative">
          <Telephone
            width={16}
            height={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            id="phone"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus focus:border-focus text-sm transition-shadow"
            {...register("phone")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="bio">Biografía</Label>
        <TextArea
          id="bio"
          placeholder="Cuéntanos sobre ti..."
          className="w-full"
          {...register("bio")}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        isDisabled={pending}
        className="self-start"
      >
        {pending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
