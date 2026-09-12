"use client";

import { useAuth } from "@/src/features/auth";
import { ProfileForm, type ProfileData } from "@/src/features/profile";
import { apiUrl } from "@/shared/utils/api";
import { ContentCard, Skeleton } from "@/shared/components/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "@heroui/react";
import { roleLabel } from "@/shared/utils/roles";
import { branchDisplayLabel } from "@/shared/utils/auth-user";

function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <ContentCard className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
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

  const handleSave = useCallback(
    async (data: FormData | Partial<ProfileData>) => {
      const isForm = typeof FormData !== "undefined" && data instanceof FormData;
      const res = await fetch(apiUrl(`/api/profile?userId=${user!.id}`), {
        method: "PUT",
        ...(isForm
          ? { body: data as FormData }
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        toast.success("Perfil actualizado");
      } else {
        const err = await res.json().catch(() => null);
        toast.danger(
          typeof err?.message === "string"
            ? err.message
            : "Error al guardar el perfil",
        );
      }
    },
    [user],
  );

  if (authLoading || loading || !profile) {
    return <ProfileSkeleton />;
  }

  const branch = branchDisplayLabel(user?.branch, user?.role);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 overflow-hidden">
      <div className="flex items-end justify-between gap-2 px-0.5">
        <div>
          <h1 className="text-base font-semibold leading-tight">Mi perfil</h1>
          <p className="text-[11px] text-muted">
            {profile.username} · {roleLabel(profile.role)}
            {branch ? ` · ${branch}` : ""}
          </p>
        </div>
        <span className="text-[10px] text-muted tabular-nums">#{profile.id}</span>
      </div>

      <ContentCard className="p-4">
        <ProfileForm profile={profile} onSave={handleSave} />
      </ContentCard>
    </div>
  );
}
