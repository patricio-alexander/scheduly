"use client";

import { useAuth } from "@/src/features/auth";
import { ProfileForm, type ProfileData } from "@/src/features/profile";
import { apiUrl } from "@/shared/utils/api";
import { ContentCard, PageHeader, Skeleton } from "@/shared/components/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "@heroui/react";

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
      </div>
      <ContentCard className="p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
        <Skeleton className="h-10 w-32" />
      </ContentCard>
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetch(apiUrl(`/api/profile?userId=${user.id}`))
      .then((r) => r.json())
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [user]);

  const handleSave = useCallback(async (data: Partial<ProfileData>) => {
    const res = await fetch(apiUrl(`/api/profile?userId=${user!.id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setProfile(updated);
      toast.success("Perfil actualizado correctamente");
    } else {
      toast.danger("Error al guardar el perfil");
    }
  }, [user]);

  if (authLoading || loading || !profile) {
    return <ProfileSkeleton />;
  }

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <PageHeader
        icon={<span className="text-sm font-bold">{initials}</span>}
        title="Mi perfil"
        description="Administra tu información personal y de contacto"
      />

      <ContentCard className="p-6">
        <ProfileForm profile={profile} onSave={handleSave} />
      </ContentCard>

      <ContentCard className="p-6">
        <h2 className="text-lg font-semibold mb-4">Información de la cuenta</h2>
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between py-3 border-b border-separator">
            <span className="text-muted">Usuario</span>
            <span className="font-medium">{profile.username}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-separator">
            <span className="text-muted">Rol</span>
            <span className="font-medium capitalize">{profile.role === "admin" ? "Administrador" : "Usuario"}</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-muted">ID</span>
            <span className="font-medium tabular-nums">#{profile.id}</span>
          </div>
        </div>
      </ContentCard>
    </div>
  );
}
