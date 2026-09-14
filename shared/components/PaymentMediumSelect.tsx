"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ComboBox, Input, Label, ListBox } from "@heroui/react";
import { apiUrl } from "@/shared/utils/api";
import { mediumKindToMethod } from "@/shared/utils/payment-media";

export type PaymentMediumOption = {
  id: number;
  name: string;
  kind: string;
  code: string | null;
};

export function useActivePaymentMedia() {
  const [media, setMedia] = useState<PaymentMediumOption[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/finance/payment-media?active=1"), {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { media?: PaymentMediumOption[] };
      const list = Array.isArray(json.media) ? json.media : [];
      setMedia(
        list.filter((row) => {
          const kind = String(row.kind || "").toLowerCase();
          return kind === "cash" || kind === "card" || kind === "transfer";
        }),
      );
    } catch {
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { media, loading, reload: load };
}

export function PaymentMediumSelect({
  value,
  onChange,
  isDisabled,
  label = "Medio de pago",
  className,
}: {
  value: number | null;
  onChange: (medium: PaymentMediumOption) => void;
  isDisabled?: boolean;
  label?: string;
  className?: string;
}) {
  const { media, loading } = useActivePaymentMedia();
  const selected = useMemo(
    () => media.find((row) => row.id === value) ?? null,
    [media, value],
  );
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (value != null || media.length === 0) return;
    const cash =
      media.find((row) => String(row.kind).toLowerCase() === "cash") ?? media[0];
    onChangeRef.current(cash);
  }, [media, value]);

  return (
    <ComboBox
      aria-label={label}
      className={className}
      selectedKey={selected ? String(selected.id) : null}
      isDisabled={isDisabled || loading}
      onSelectionChange={(key) => {
        const next = media.find((row) => String(row.id) === String(key || ""));
        if (next) onChange(next);
      }}
    >
      <Label>{label}</Label>
      <ComboBox.InputGroup>
        <Input />
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox>
          {media.map((row) => (
            <ListBox.Item key={row.id} id={String(row.id)} textValue={row.name}>
              {row.name}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
}

export function methodFromMedium(medium: PaymentMediumOption | null) {
  return mediumKindToMethod(medium?.kind || "cash");
}
