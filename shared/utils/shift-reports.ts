import { prisma } from "@/shared/utils/prisma";
import { toAmount } from "@/shared/utils/money";
import {
  calcAppointmentCommission,
  resolveProductCommissionPct,
} from "@/shared/utils/commissions";
import { movementCategoryLabel } from "@/shared/utils/turno-cash";

const WEEKDAY_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const WEEKDAY_LONG = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

function to2(n: number) {
  return Number(Number(n || 0).toFixed(2));
}

export function formatDateKey(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDayBounds(dateStr: string) {
  const raw = String(dateStr || "").trim();
  const base = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : formatDateKey(new Date());
  const dayStart = new Date(`${base}T00:00:00`);
  const dayEnd = new Date(`${base}T23:59:59.999`);
  return { date: base, dayStart, dayEnd };
}

export function parseWeekRange(dateStr: string) {
  const { date, dayStart } = parseDayBounds(dateStr);
  const d = new Date(dayStart);
  const dow = d.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const weekStartDate = new Date(d);
  weekStartDate.setDate(d.getDate() + mondayOffset);
  weekStartDate.setHours(0, 0, 0, 0);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);

  const dayKeys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStartDate);
    day.setDate(weekStartDate.getDate() + i);
    dayKeys.push(formatDateKey(day));
  }

  return {
    anchorDate: date,
    weekStart: formatDateKey(weekStartDate),
    weekEnd: formatDateKey(weekEndDate),
    weekStartDate,
    weekEndDate,
    dayKeys,
  };
}

function saleTotal(lines: Array<{ quantity: number; price: number }>) {
  return to2(
    lines.reduce(
      (sum, line) => sum + toAmount(line.quantity) * toAmount(line.price),
      0,
    ),
  );
}

const productCommissionSelect = {
  name: true,
  price: true,
  commissionPct: true,
  category: { select: { commissionPct: true } },
} as const;

function posSaleCommission(
  lines: Array<{
    quantity: unknown;
    price: unknown;
    product?: {
      commissionPct?: unknown;
      category?: { commissionPct?: unknown } | null;
    } | null;
  }>,
) {
  return to2(
    lines.reduce((sum, line) => {
      const lineAmt = toAmount(line.quantity) * toAmount(line.price);
      const pct = resolveProductCommissionPct(line.product ?? {});
      return sum + lineAmt * (pct / 100);
    }, 0),
  );
}

function bucketMethod(method: string | null | undefined) {
  const m = String(method || "").toLowerCase();
  if (m === "transfer" || m === "transferencia") return "transfer" as const;
  if (m === "card" || m === "tarjeta") return "card" as const;
  if (m === "credito") return "other" as const;
  return "cash" as const;
}

function emptyDaySummary(date: string) {
  return {
    date,
    openingCashTotal: 0,
    closingCashTotal: 0,
    salesTotal: 0,
    salesCash: 0,
    salesTransfer: 0,
    salesCard: 0,
    cashOutTotal: 0,
    ordersCount: 0,
  };
}

function personLabel(person: {
  firstName: string | null;
  firstLastName: string | null;
} | null) {
  if (!person) return "—";
  return [person.firstName, person.firstLastName].filter(Boolean).join(" ") || "—";
}

function customerLabel(customer: {
  name: string | null;
  firstLastName: string | null;
  secondLastName: string | null;
} | null) {
  if (!customer) return "Cliente";
  return (
    [customer.name, customer.firstLastName, customer.secondLastName]
      .filter(Boolean)
      .join(" ") || "Cliente"
  );
}

function computeClosingTotal(opening: number | null, sales: number) {
  return to2(Number(opening || 0) + Number(sales || 0));
}

const UNATTRIBUTED_PERSON_ID = 0;

export type EmployeeTicketSource = "turno" | "tienda";

export type EmployeeProductionTicket = {
  id: number;
  source: EmployeeTicketSource;
  paidAt: string;
  customerName: string;
  services: number;
  products: number;
  total: number;
  method: string | null;
  itemsSummary: string;
};

export type EmployeeProductionRow = {
  personId: number;
  name: string;
  appointmentsCount: number;
  ticketsCount: number;
  servicesTotal: number;
  productsTotal: number;
  total: number;
  tickets: EmployeeProductionTicket[];
};

export type EmployeeProductionSummary = {
  employeesCount: number;
  appointmentsCount: number;
  ticketsCount: number;
  servicesTotal: number;
  productsTotal: number;
  total: number;
};

function emptyEmployeeRow(
  personId: number,
  name: string,
): EmployeeProductionRow {
  return {
    personId,
    name,
    appointmentsCount: 0,
    ticketsCount: 0,
    servicesTotal: 0,
    productsTotal: 0,
    total: 0,
    tickets: [],
  };
}

function summarizeEmployees(
  rows: EmployeeProductionRow[],
): EmployeeProductionSummary {
  return {
    employeesCount: rows.filter((r) => r.personId !== UNATTRIBUTED_PERSON_ID)
      .length,
    appointmentsCount: rows.reduce((s, r) => s + r.appointmentsCount, 0),
    ticketsCount: rows.reduce((s, r) => s + r.ticketsCount, 0),
    servicesTotal: to2(rows.reduce((s, r) => s + r.servicesTotal, 0)),
    productsTotal: to2(rows.reduce((s, r) => s + r.productsTotal, 0)),
    total: to2(rows.reduce((s, r) => s + r.total, 0)),
  };
}

function sortEmployeeRows(rows: EmployeeProductionRow[]) {
  return [...rows].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.name.localeCompare(b.name, "es");
  });
}

function addEmployeeTicket(
  map: Map<number, EmployeeProductionRow>,
  personId: number,
  name: string,
  ticket: EmployeeProductionTicket,
  keepTickets: boolean,
) {
  const row = map.get(personId) ?? emptyEmployeeRow(personId, name);
  row.servicesTotal = to2(row.servicesTotal + ticket.services);
  row.productsTotal = to2(row.productsTotal + ticket.products);
  row.total = to2(row.servicesTotal + row.productsTotal);
  row.ticketsCount += 1;
  if (ticket.source === "turno") row.appointmentsCount += 1;
  if (keepTickets) row.tickets.push(ticket);
  map.set(personId, row);
}

const paidAppointmentInclude = {
  staff: { select: { id: true, firstName: true, firstLastName: true } },
  customer: {
    select: { name: true, firstLastName: true, secondLastName: true },
  },
  payment: { select: { amount: true, method: true, paidAt: true } },
  services: {
    select: {
      service: { select: { name: true, price: true, commissionPct: true } },
    },
  },
  products: {
    select: {
      quantity: true,
      product: { select: productCommissionSelect },
    },
  },
} as const;

async function loadPaidAppointments(from: Date, to: Date) {
  return prisma.appointment.findMany({
    where: {
      status: { not: "cancelled" },
      payment: {
        is: {
          paidAt: { gte: from, lte: to },
        },
      },
    },
    include: paidAppointmentInclude,
  });
}

function foldAppointmentsIntoEmployees(
  map: Map<number, EmployeeProductionRow>,
  appointments: Awaited<ReturnType<typeof loadPaidAppointments>>,
  keepTickets: boolean,
) {
  for (const apt of appointments) {
    if (!apt.payment) continue;
    const paid = toAmount(apt.payment.amount);
    const calc = calcAppointmentCommission(apt.services, apt.products, paid);
    const services = to2(calc.servicesCommission);
    const products = to2(calc.productsCommission);
    const total = to2(services + products);
    if (total <= 0) continue;
    const itemsSummary = [
      ...apt.services.map((row) => row.service.name),
      ...apt.products.map((row) =>
        row.quantity > 1
          ? `${row.product.name} ×${row.quantity}`
          : row.product.name,
      ),
    ]
      .filter(Boolean)
      .join(", ");
    addEmployeeTicket(
      map,
      apt.staff.id,
      personLabel(apt.staff),
      {
        id: apt.id,
        source: "turno",
        paidAt: apt.payment.paidAt.toISOString(),
        customerName: customerLabel(apt.customer),
        services,
        products,
        total,
        method: apt.payment.method,
        itemsSummary: itemsSummary || apt.title || "Turno",
      },
      keepTickets,
    );
  }
}

function foldPosSalesIntoEmployees(
  map: Map<number, EmployeeProductionRow>,
  sales: Array<{
    id: number;
    productsCommission: number;
    paidAt: string;
    paymentMethod: string | null;
    customerName: string;
    itemsSummary?: string;
    sellerPersonId: number | null;
    sellerName: string;
  }>,
  keepTickets: boolean,
) {
  for (const sale of sales) {
    const products = to2(sale.productsCommission);
    if (products <= 0) continue;
    const personId = sale.sellerPersonId ?? UNATTRIBUTED_PERSON_ID;
    const name =
      personId === UNATTRIBUTED_PERSON_ID
        ? "Mostrador"
        : sale.sellerName || "Mostrador";
    addEmployeeTicket(
      map,
      personId,
      name,
      {
        id: sale.id,
        source: "tienda",
        paidAt: sale.paidAt,
        customerName: sale.customerName || "Cliente",
        services: 0,
        products,
        total: products,
        method: sale.paymentMethod,
        itemsSummary: sale.itemsSummary || "Venta tienda",
      },
      keepTickets,
    );
  }
}

export async function buildWeeklyShiftReport(dateStr: string) {
  const week = parseWeekRange(dateStr);

  const [sales, shiftsInWeek, outflows, appointments] = await Promise.all([
    prisma.sale.findMany({
      where: {
        status: { in: ["pagado", "entregado"] },
        OR: [
          { paidAt: { gte: week.weekStartDate, lte: week.weekEndDate } },
          {
            paidAt: null,
            date: { gte: week.weekStartDate, lte: week.weekEndDate },
          },
        ],
      },
      include: {
        lines: {
          select: {
            quantity: true,
            price: true,
            product: { select: productCommissionSelect },
          },
        },
        seller: {
          select: {
            userId: true,
            username: true,
            person: { select: { firstName: true, firstLastName: true } },
          },
        },
      },
    }),
    prisma.cashShift.findMany({
      where: {
        openedAt: { gte: week.weekStartDate, lte: week.weekEndDate },
      },
      select: { openedAt: true, openingCashTotal: true },
    }),
    prisma.cashShiftMovement.findMany({
      where: {
        direction: "out",
        createdAt: { gte: week.weekStartDate, lte: week.weekEndDate },
      },
      select: { amount: true, createdAt: true },
    }),
    loadPaidAppointments(week.weekStartDate, week.weekEndDate),
  ]);
  const employeeMap = new Map<number, EmployeeProductionRow>();
  foldAppointmentsIntoEmployees(employeeMap, appointments, false);
  foldPosSalesIntoEmployees(
    employeeMap,
    sales.map((sale) => ({
      id: sale.id,
      productsCommission: posSaleCommission(sale.lines),
      paidAt: (sale.paidAt ?? sale.date).toISOString(),
      paymentMethod: sale.paymentMethod,
      customerName: "",
      sellerPersonId: sale.seller?.userId ?? null,
      sellerName: sale.seller?.person
        ? personLabel(sale.seller.person)
        : sale.seller?.username || "Mostrador",
    })),
    false,
  );
  const employees = sortEmployeeRows([...employeeMap.values()]);
  const employeeSummary = summarizeEmployees(employees);

  const byDay = Object.fromEntries(
    week.dayKeys.map((k) => [k, emptyDaySummary(k)]),
  );

  for (const sale of sales) {
    const at = sale.paidAt ?? sale.date;
    const key = formatDateKey(at);
    if (!byDay[key]) continue;
    const total = saleTotal(sale.lines);
    const row = byDay[key];
    row.ordersCount += 1;
    row.salesTotal = to2(row.salesTotal + total);
    const bucket = bucketMethod(sale.paymentMethod);
    if (bucket === "transfer") row.salesTransfer = to2(row.salesTransfer + total);
    else if (bucket === "card") row.salesCard = to2(row.salesCard + total);
    else if (bucket === "cash") row.salesCash = to2(row.salesCash + total);
  }

  for (const shift of shiftsInWeek) {
    const openKey = formatDateKey(shift.openedAt);
    if (byDay[openKey]) {
      byDay[openKey].openingCashTotal = to2(
        byDay[openKey].openingCashTotal + toAmount(shift.openingCashTotal),
      );
    }
  }

  for (const m of outflows) {
    const key = formatDateKey(m.createdAt);
    if (byDay[key]) {
      byDay[key].cashOutTotal = to2(
        byDay[key].cashOutTotal + toAmount(m.amount),
      );
    }
  }

  for (const key of week.dayKeys) {
    byDay[key].closingCashTotal = computeClosingTotal(
      byDay[key].openingCashTotal,
      byDay[key].salesTotal,
    );
  }

  const summary = emptyDaySummary(week.weekStart);
  for (const key of week.dayKeys) {
    const src = byDay[key];
    summary.openingCashTotal = to2(summary.openingCashTotal + src.openingCashTotal);
    summary.closingCashTotal = to2(summary.closingCashTotal + src.closingCashTotal);
    summary.salesTotal = to2(summary.salesTotal + src.salesTotal);
    summary.salesCash = to2(summary.salesCash + src.salesCash);
    summary.salesTransfer = to2(summary.salesTransfer + src.salesTransfer);
    summary.salesCard = to2(summary.salesCard + src.salesCard);
    summary.cashOutTotal = to2(summary.cashOutTotal + src.cashOutTotal);
    summary.ordersCount += src.ordersCount;
  }

  const days = week.dayKeys.map((key) => {
    const d = new Date(`${key}T12:00:00`);
    const row = byDay[key];
    return {
      ...row,
      weekday: WEEKDAY_LONG[d.getDay()],
      weekdayShort: WEEKDAY_SHORT[d.getDay()],
      dateLabel: d.toLocaleDateString("es-EC", {
        day: "numeric",
        month: "short",
      }),
    };
  });

  return {
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    anchorDate: week.anchorDate,
    days,
    summary,
    employees,
    employeeSummary,
  };
}

export async function buildDailyShiftReport(dateStr: string) {
  const { date, dayStart, dayEnd } = parseDayBounds(dateStr);

  const [shifts, sales, movements, appointments] = await Promise.all([
    prisma.cashShift.findMany({
      where: {
        openedAt: { lte: dayEnd },
        OR: [{ closedAt: null }, { closedAt: { gte: dayStart } }],
      },
      include: {
        person: {
          select: { firstName: true, firstLastName: true },
        },
      },
      orderBy: { openedAt: "asc" },
    }),
    prisma.sale.findMany({
      where: {
        status: { in: ["pagado", "entregado"] },
        OR: [
          { paidAt: { gte: dayStart, lte: dayEnd } },
          { paidAt: null, date: { gte: dayStart, lte: dayEnd } },
        ],
      },
      include: {
        customer: {
          select: {
            name: true,
            firstLastName: true,
            secondLastName: true,
          },
        },
        seller: {
          select: {
            username: true,
            userId: true,
            person: { select: { firstName: true, firstLastName: true } },
          },
        },
        lines: {
          include: {
            product: { select: { id: true, ...productCommissionSelect } },
          },
        },
      },
      orderBy: [{ paidAt: "desc" }, { date: "desc" }],
    }),
    prisma.cashShiftMovement.findMany({
      where: {
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      include: {
        person: {
          select: { firstName: true, firstLastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    loadPaidAppointments(dayStart, dayEnd),
  ]);

  const saleRows = sales.map((sale) => {
    const total = saleTotal(
      sale.lines.map((l) => ({ quantity: l.quantity, price: l.price })),
    );
    const customerName = [
      sale.customer.name,
      sale.customer.firstLastName,
      sale.customer.secondLastName,
    ]
      .filter(Boolean)
      .join(" ");
    return {
      id: sale.id,
      shiftId: sale.shiftId,
      paidAt: (sale.paidAt ?? sale.date).toISOString(),
      paymentMethod: sale.paymentMethod,
      documentType: sale.documentType,
      customerName,
      operatorName: sale.seller?.person
        ? personLabel(sale.seller.person)
        : sale.seller?.username || "Mostrador",
      sellerPersonId: sale.seller?.userId ?? null,
      total,
      productsCommission: posSaleCommission(sale.lines),
      itemsSummary: sale.lines
        .map((line) =>
          line.quantity > 1
            ? `${line.product.name} ×${line.quantity}`
            : line.product.name,
        )
        .join(", "),
      items: sale.lines.map((line) => ({
        id: line.id,
        productId: line.productId,
        name: line.product.name,
        quantity: line.quantity,
        price: toAmount(line.price),
        lineTotal: to2(toAmount(line.quantity) * toAmount(line.price)),
      })),
    };
  });

  const outflows = movements
    .filter((m) => m.direction === "out")
    .map((m) => ({
      id: m.id,
      shiftId: m.shiftId,
      createdAt: m.createdAt.toISOString(),
      category: m.category,
      categoryLabel: movementCategoryLabel(m.category),
      concept: m.concept,
      amount: toAmount(m.amount),
      notes: m.notes,
      operatorName: personLabel(m.person),
    }));

  const inflows = movements
    .filter((m) => m.direction === "in")
    .map((m) => ({
      id: m.id,
      shiftId: m.shiftId,
      createdAt: m.createdAt.toISOString(),
      category: m.category,
      categoryLabel: movementCategoryLabel(m.category),
      concept: m.concept,
      amount: toAmount(m.amount),
      notes: m.notes,
      operatorName: personLabel(m.person),
    }));

  const shiftRows = shifts.map((shift) => {
    const openedOnDay =
      shift.openedAt >= dayStart && shift.openedAt <= dayEnd;
    const openingCashOnDay = openedOnDay
      ? toAmount(shift.openingCashTotal)
      : null;

    let salesTotalDay = 0;
    let salesCashDay = 0;
    let ordersCountDay = 0;
    for (const sale of saleRows) {
      if (sale.shiftId !== shift.id) continue;
      ordersCountDay += 1;
      salesTotalDay += sale.total;
      const bucket = bucketMethod(sale.paymentMethod);
      if (bucket === "cash") salesCashDay += sale.total;
    }
    const cashOutDay = to2(
      outflows
        .filter((m) => m.shiftId === shift.id)
        .reduce((s, m) => s + m.amount, 0),
    );
    const cashInDay = to2(
      inflows
        .filter((m) => m.shiftId === shift.id)
        .reduce((s, m) => s + m.amount, 0),
    );

    return {
      id: shift.id,
      status: shift.status,
      operatorName: personLabel(shift.person),
      openedAt: shift.openedAt.toISOString(),
      closedAt: shift.closedAt?.toISOString() ?? null,
      openingCashOnDay,
      closingCashOnDay: computeClosingTotal(openingCashOnDay, salesTotalDay),
      salesCashDay: to2(salesCashDay),
      salesTotalDay: to2(salesTotalDay),
      cashOutDay,
      cashInDay,
      cashEnteredDay: to2(salesCashDay + cashInDay),
      ordersCountDay,
      cashDifference: shift.cashDifference,
    };
  });

  const openingCashTotal = to2(
    shiftRows.reduce((s, r) => s + Number(r.openingCashOnDay || 0), 0),
  );
  const salesTotal = to2(saleRows.reduce((s, r) => s + r.total, 0));
  const cashOutTotal = to2(outflows.reduce((s, r) => s + r.amount, 0));
  const cashInMovementsTotal = to2(inflows.reduce((s, r) => s + r.amount, 0));
  let salesCash = 0;
  let salesTransfer = 0;
  let salesCard = 0;
  for (const sale of saleRows) {
    const bucket = bucketMethod(sale.paymentMethod);
    if (bucket === "transfer") salesTransfer += sale.total;
    else if (bucket === "card") salesCard += sale.total;
    else if (bucket === "cash") salesCash += sale.total;
  }

  const employeeMap = new Map<number, EmployeeProductionRow>();
  foldAppointmentsIntoEmployees(employeeMap, appointments, true);
  foldPosSalesIntoEmployees(
    employeeMap,
    saleRows.map((sale) => ({
      id: sale.id,
      productsCommission: sale.productsCommission,
      paidAt: sale.paidAt,
      paymentMethod: sale.paymentMethod,
      customerName: sale.customerName,
      itemsSummary: sale.itemsSummary,
      sellerPersonId: sale.sellerPersonId,
      sellerName: sale.operatorName,
    })),
    true,
  );
  for (const row of employeeMap.values()) {
    row.tickets.sort(
      (a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime(),
    );
  }
  const employees = sortEmployeeRows([...employeeMap.values()]);
  const employeeSummary = summarizeEmployees(employees);

  return {
    date,
    summary: {
      shiftsCount: shiftRows.length,
      ordersCount: saleRows.length,
      openingCashTotal,
      closingCashTotal: computeClosingTotal(openingCashTotal, salesTotal),
      salesTotal,
      salesCash: to2(salesCash),
      salesTransfer: to2(salesTransfer),
      salesCard: to2(salesCard),
      cashOutTotal,
      cashInMovementsTotal,
      cashEnteredTotal: to2(salesCash + cashInMovementsTotal),
      outflowsCount: outflows.length,
      inflowsCount: inflows.length,
    },
    employeeSummary,
    employees,
    shifts: shiftRows,
    outflows,
    inflows,
    sales: saleRows.map((sale) => {
      const { productsCommission, sellerPersonId, ...rest } = sale;
      return rest;
    }),
  };
}
