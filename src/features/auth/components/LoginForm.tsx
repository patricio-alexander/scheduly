"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Label } from "@heroui/react";
import { loginSchema, type LoginFormData } from "../lib/auth-schema";
import { useAuth } from "../hooks/useAuth";
import { useState } from "react";
import Person from "@gravity-ui/icons/Person";
import Lock from "@gravity-ui/icons/Lock";

const inputClassName =
  "w-full pl-10 pr-3 py-2.5 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus focus:border-focus text-sm transition-shadow";

export function LoginForm() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username" className="text-sm font-medium">
          Usuario
        </Label>
        <div className="relative">
          <Person
            width={16}
            height={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <Controller
            name="username"
            control={control}
            render={({ field }) => (
              <input
                id="username"
                placeholder="ej: admin"
                autoComplete="username"
                className={inputClassName}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            )}
          />
        </div>
        {errors.username && (
          <p className="text-danger text-sm">{String(errors.username.message ?? "")}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" className="text-sm font-medium">
          Contraseña
        </Label>
        <div className="relative">
          <Lock
            width={16}
            height={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`${inputClassName} pr-16`}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? "Ocultar" : "Ver"}
          </button>
        </div>
        {errors.password && (
          <p className="text-danger text-sm">{String(errors.password.message ?? "")}</p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 flex items-start gap-2"
        >
          <Lock width={16} height={16} className="text-danger shrink-0 mt-0.5" />
          <p className="text-danger text-sm">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        isDisabled={pending}
        fullWidth
        size="lg"
        className="mt-1 font-semibold"
      >
        {pending ? "Ingresando..." : "Iniciar sesión"}
      </Button>
    </form>
  );
}
