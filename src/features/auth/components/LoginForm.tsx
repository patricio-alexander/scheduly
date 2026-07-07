"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Label } from "@heroui/react";
import { loginSchema, type LoginFormData } from "../lib/auth-schema";
import { useAuth } from "../hooks/useAuth";
import { useState } from "react";
import Person from "@gravity-ui/icons/Person";
import Lock from "@gravity-ui/icons/Lock";

export function LoginForm() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setPending(true);
    setError("");
    try {
      await login(data.username, data.password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar sesión");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Label htmlFor="username">Usuario</Label>
        <div className="relative">
          <Person width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            id="username"
            placeholder="admin"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus focus:border-focus text-sm transition-shadow"
            {...register("username")}
          />
        </div>
        {errors.username && (
          <p className="text-danger text-sm">{String(errors.username.message ?? "")}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Lock width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus focus:border-focus text-sm transition-shadow"
            {...register("password")}
          />
        </div>
        {errors.password && (
          <p className="text-danger text-sm">{String(errors.password.message ?? "")}</p>
        )}
      </div>
      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-2.5">
          <p className="text-danger text-sm">{error}</p>
        </div>
      )}
      <Button type="submit" variant="primary" isDisabled={pending} fullWidth className="mt-1">
        {pending ? "Ingresando..." : "Iniciar sesión"}
      </Button>
    </form>
  );
}
