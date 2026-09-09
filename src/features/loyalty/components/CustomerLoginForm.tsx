"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, toast } from "@heroui/react";
import { useCustomerAuth } from "../hooks/useCustomerAuth";

export function CustomerLoginForm({
  onSuccess,
  redirectHint,
}: {
  onSuccess?: () => void;
  redirectHint?: string;
}) {
  const { login } = useCustomerAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(`Bienvenido, ${user.name}`);
      onSuccess?.();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
      {redirectHint ? (
        <p className="rounded-xl bg-accent/10 px-3 py-2 text-sm text-muted">
          {redirectHint}
        </p>
      ) : null}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Correo o cédula</span>
        <input
          type="text"
          required
          autoComplete="username"
          className="rounded-xl border border-separator bg-field-background px-3 py-2.5 text-field-foreground placeholder:text-field-placeholder"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@… o cédula"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Contraseña</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          className="rounded-xl border border-separator bg-field-background px-3 py-2.5 text-field-foreground placeholder:text-field-placeholder"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <Button type="submit" variant="primary" isDisabled={pending} className="w-full">
        {pending ? "Ingresando..." : "Iniciar sesión"}
      </Button>
      <p className="text-center text-xs text-muted">
        ¿Sin cuenta?{" "}
        <Link href="/mi-cuenta" className="font-medium text-accent hover:underline">
          Más información
        </Link>
      </p>
    </form>
  );
}
