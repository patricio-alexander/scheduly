"use client";

import { useAuth } from "@/src/features/auth";
import { ProfileForm, type ProfileData } from "@/src/features/profile";
import { apiUrl } from "@/shared/utils/api";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import User from "@gravity-ui/icons/Person";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

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
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }, []);

  if (authLoading || loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="bg-accent/10 rounded-xl p-3">
          <User width={24} height={24} className="text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Mi Perfil</h1>
          <p className="text-muted text-sm">
            Administra tu información personal
          </p>
        </div>
      </div>

      {saved && (
        <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-3">
          <p className="text-success text-sm">
            Cambios guardados correctamente
          </p>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-separator p-6">
        <ProfileForm profile={profile} onSave={handleSave} />
      </div>

      <div className="bg-surface rounded-xl border border-separator p-6">
        <h2 className="text-lg font-semibold mb-2">Información de la cuenta</h2>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between py-2 border-b border-separator">
            <span className="text-muted">Usuario</span>
            <span className="font-medium">{profile.username}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-separator">
            <span className="text-muted">Rol</span>
            <span className="font-medium capitalize">{profile.role}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted">ID</span>
            <span className="font-medium">#{profile.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
