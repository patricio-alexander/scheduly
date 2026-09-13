import { toAmount } from "@/shared/utils/money";
import { personFullName } from "@/shared/utils/person-name";

/** Include compartido por los handlers: el vale siempre viaja con sus relaciones. */
export const voucherInclude = {
  person: {
    select: {
      id: true,
      firstName: true,
      secondName: true,
      firstLastName: true,
      secondLastName: true,
    },
  },
  branch: { select: { id: true, name: true } },
  registeredBy: {
    select: {
      id: true,
      username: true,
      person: {
        select: {
          firstName: true,
          secondName: true,
          firstLastName: true,
          secondLastName: true,
        },
      },
    },
  },
} as const;

type PersonName = {
  firstName: string | null;
  secondName: string | null;
  firstLastName: string | null;
  secondLastName: string | null;
};

export type VoucherWithRelations = {
  id: number;
  userId: number;
  amount: number;
  method: string;
  reason: string | null;
  issuedAt: Date;
  settledAt: Date | null;
  person: PersonName & { id: number };
  branch: { id: number; name: string } | null;
  registeredBy: {
    id: number;
    username: string | null;
    person: PersonName | null;
  };
};

function registrarName(account: VoucherWithRelations["registeredBy"]) {
  const fromPerson = personFullName(account.person);
  if (fromPerson && fromPerson !== "—") return fromPerson;
  return account.username?.trim() || "—";
}

export function serializeVoucher(voucher: VoucherWithRelations) {
  return {
    id: voucher.id,
    employee: {
      id: voucher.userId,
      name: personFullName(voucher.person),
    },
    branch: voucher.branch,
    amount: toAmount(voucher.amount),
    method: voucher.method,
    reason: voucher.reason ?? "",
    issuedAt: voucher.issuedAt.toISOString(),
    settledAt: voucher.settledAt?.toISOString() ?? null,
    registeredBy: {
      id: voucher.registeredBy.id,
      name: registrarName(voucher.registeredBy),
    },
  };
}
