import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import type {
  AppointmentStatus,
  NotificationType,
  Prisma,
} from "@/generated/prisma/client";
import { hashPassword } from "../shared/utils/password";
import { calcAppointmentCommission } from "../shared/utils/commissions";
import { SYSTEM_ROLES } from "../shared/utils/system-roles";

type SeedPaymentMethod = "cash" | "card" | "transfer";

type SeedAccount = {
  personId: number;
  accountId: number;
  username: string;
};

function parseFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { firstName: parts[0] ?? "Usuario", firstLastName: "" };
  }
  return { firstName: parts[0], firstLastName: parts.slice(1).join(" ") };
}

function appRoleToDbRoleName(appRole: string): string {
  const match = SYSTEM_ROLES.find((r) => r.appRole === appRole);
  return match?.name ?? "Empleado";
}

function mapNotificationType(type: string): NotificationType {
  if (type === "warning") return "alert";
  if (type === "success") return "info";
  if (type === "alert" || type === "reminder" || type === "message") {
    return type;
  }
  return "info";
}

function customerFromDemo(c: {
  name: string;
  lastnames: string;
  phone: string;
  email: string;
}) {
  const nameParts = c.name.trim().split(/\s+/);
  const lastParts = c.lastnames.trim().split(/\s+/);
  return {
    name: `${c.name} ${c.lastnames}`,
    firstName: nameParts[0] ?? c.name,
    secondName: nameParts.slice(1).join(" ") || null,
    firstLastName: lastParts[0] ?? c.lastnames,
    secondLastName: lastParts.slice(1).join(" ") || null,
    phone: c.phone,
    email: c.email,
  };
}

async function ensureDefaultUnit(prisma: PrismaClient) {
  return prisma.unit.upsert({
    where: { name: "Unidad" },
    create: {
      name: "Unidad",
      abbreviation: "u",
      description: "Unidad",
    },
    update: {},
  });
}

async function upsertStaffAccount(
  prisma: PrismaClient,
  opts: {
    username: string;
    password: string;
    fullName: string;
    email: string;
    phone?: string;
    role: string;
  },
): Promise<SeedAccount> {
  const { firstName, firstLastName } = parseFullName(opts.fullName);
  let account = await prisma.account.findFirst({
    where: { username: opts.username },
    include: { person: true },
  });

  if (!account) {
    const person = await prisma.person.create({
      data: {
        firstName,
        firstLastName: firstLastName || null,
        documentType: "05",
      },
    });
    await prisma.personData.create({
      data: {
        idUser: person.id,
        personalEmail: opts.email,
        cellPhone: opts.phone ?? null,
      },
    });
    account = await prisma.account.create({
      data: {
        username: opts.username,
        password: opts.password,
        userId: person.id,
        isActive: true,
      },
      include: { person: true },
    });
  } else {
    const personId = account.userId!;
    await prisma.person.update({
      where: { id: personId },
      data: { firstName, firstLastName: firstLastName || null },
    });
    await prisma.personData.upsert({
      where: { idUser: personId },
      create: {
        idUser: personId,
        personalEmail: opts.email,
        cellPhone: opts.phone ?? null,
      },
      update: {
        personalEmail: opts.email,
        cellPhone: opts.phone ?? null,
      },
    });
    account = await prisma.account.update({
      where: { id: account.id },
      data: { password: opts.password, isActive: true },
      include: { person: true },
    });
  }

  const role = await prisma.role.findFirst({
    where: { name: appRoleToDbRoleName(opts.role) },
  });
  if (role) {
    await prisma.accountRole.upsert({
      where: {
        accountId_roleId: { accountId: account.id, roleId: role.id },
      },
      create: { accountId: account.id, roleId: role.id },
      update: {},
    });
  }

  return {
    personId: account.userId!,
    accountId: account.id,
    username: account.username ?? opts.username,
  };
}

const TARGET_APPOINTMENTS_MIN = 120;
const TARGET_APPOINTMENTS_MAX = 140;
const TODAY_APPOINTMENTS_MIN = 12;
const TODAY_APPOINTMENTS_MAX = 20;
const LOCALE = "es-EC";

/** 4 empleados por local · 4 bolitas de equipo en el simulador (×4 c/u) */
const STAFF_PER_BRANCH = 4;

/** Credenciales compartidas con AppsWeb/simulador/scheduly/flows */
const SEED_PASSWORDS = {
  programmer: "12345678",
  owner: "Andrea2026",
  staff: "12345678",
  customer: "12345678",
} as const;

/** ─── Datos demo: Andrea Guerrero · estructura bots (4 locales) ─── */
const DEMO = {
  business: {
    businessName: "Andrea Guerrero Estética y Peluquería",
    address: "Cristóbal Colón y 18 de Noviembre, Loja, Ecuador",
    phone: "0994960155",
    whatsapp: "https://wa.me/593994960155",
    facebook: "https://www.facebook.com/andreaguerreropeluqueriayspa1/",
    instagram: "https://www.instagram.com/andreaguerrero_peluqueriayspa/",
    hours: "Lunes a sábado · 8:00 AM – 8:00 PM",
    description:
      "Centro de belleza en Loja: peluquería, tratamientos capilares, spa de uñas, depilación y maquillaje profesional. Cuatro locales.",
    accentColor: "#D4AF37",
    successColor: "#22C55E",
    warningColor: "#F0B429",
    dangerColor: "#F04438",
  },
  programmer: {
    username: "administrador",
    name: "Mantenimiento Técnico",
    email: "mantenimiento@andreaguerrero.ec",
    phone: "0994000000",
    bio: "Cuenta técnica compartida · rol Programador.",
  },
  admin: {
    username: "andrea",
    name: "Andrea Guerrero",
    email: "andrea@andreaguerrero.ec",
    phone: "0994960155",
    bio: "Dueña y owner · Andrea Guerrero Estética y Peluquería, Loja.",
  },
  branchAdmins: [
    {
      username: "admin_colon",
      name: "Karla Espinoza",
      email: "colon@andreaguerrero.ec",
      phone: "0995112233",
      bio: "Encargada local Cristóbal Colón",
      branchCode: "colon",
    },
    {
      username: "admin_eguiguren",
      name: "Paola Jiménez",
      email: "eguiguren@andreaguerrero.ec",
      phone: "0995223344",
      bio: "Encargada local Eguiguren",
      branchCode: "eguiguren",
    },
    {
      username: "admin_lourdes",
      name: "Verónica Cueva",
      email: "lourdes@andreaguerrero.ec",
      phone: "0995334455",
      bio: "Encargada local Lourdes",
      branchCode: "lourdes",
    },
    {
      username: "admin_centrosur",
      name: "Diana Mora",
      email: "centrosur@andreaguerrero.ec",
      phone: "0995445566",
      bio: "Encargada local Centro Sur",
      branchCode: "centrosur",
    },
  ],
  staff: [
    {
      username: "est_colon_maria",
      name: "María García",
      email: "maria.garcia@andreaguerrero.ec",
      role: "employee" as const,
      phone: "0987112233",
      bio: "Estilista · local Colón.",
    },
    {
      username: "est_colon_lucas",
      name: "Lucas Vera",
      email: "lucas.vera@andreaguerrero.ec",
      role: "employee" as const,
      phone: "0987112234",
      bio: "Estilista · local Colón.",
    },
    {
      username: "est_colon_sofia",
      name: "Sofía Mendoza",
      email: "sofia.mendoza@andreaguerrero.ec",
      role: "employee" as const,
      phone: "0987112235",
      bio: "Estilista · local Colón.",
    },
    {
      username: "est_colon_andres",
      name: "Andrés Castro",
      email: "andres.castro@andreaguerrero.ec",
      role: "employee" as const,
      phone: "0987112236",
      bio: "Estilista · local Colón.",
    },
    {
      username: "est_eguiguren_camila",
      name: "Camila Rojas",
      email: "camila.rojas@andreaguerrero.ec",
      role: "employee" as const,
      phone: "0987223344",
      bio: "Estilista · local Eguiguren.",
    },
    {
      username: "est_eguiguren_diego",
      name: "Diego Salinas",
      email: "diego.salinas@andreaguerrero.ec",
      role: "employee" as const,
      phone: "0987223345",
      bio: "Estilista · local Eguiguren.",
    },
    {
      username: "est_eguiguren_valeria",
      name: "Valeria Núñez",
      email: "valeria.nunez@andreaguerrero.ec",
      role: "employee" as const,
      phone: "0987223346",
      bio: "Estilista · local Eguiguren.",
    },
    {
      username: "est_eguiguren_marco",
      name: "Marco Palacios",
      email: "marco.palacios@andreaguerrero.ec",
      role: "employee" as const,
      phone: "0987223347",
      bio: "Estilista · local Eguiguren.",
    },
    {
      username: "est_lourdes_natalia",
      name: "Natalia Ortiz",
      email: "natalia.ortiz@andreaguerrero.ec",
      role: "employee" as const,
      phone: "0987334455",
      bio: "Spa de uñas · local Lourdes.",
    },
    {
      username: "est_lourdes_andre",
      name: "André Pineda",
      email: "andre.pineda@andreaguerrero.ec",
      role: "employee" as const,
      phone: "0987334456",
      bio: "Estilista · local Lourdes.",
    },
    {
      username: "est_lourdes_elena",
      name: "Elena Vargas",
      email: "elena.vargas@andreaguerrero.ec",
      role: "employee" as const,
      phone: "0987334457",
      bio: "Spa de uñas · local Lourdes.",
    },
    {
      username: "est_lourdes_julian",
      name: "Julián Cordero",
      email: "julian.cordero@andreaguerrero.ec",
      role: "employee" as const,
      phone: "0987334458",
      bio: "Estilista · local Lourdes.",
    },
    {
      username: "est_centrosur_paula",
      name: "Paula Jiménez",
      email: "paula.jimenez@andreaguerrero.ec",
      role: "employee" as const,
      phone: "0987445566",
      bio: "Estilista · local Centro Sur.",
    },
    {
      username: "est_centrosur_kevin",
      name: "Kevin Mora",
      email: "kevin.mora@andreaguerrero.ec",
      role: "employee" as const,
      phone: "0987445567",
      bio: "Estilista · local Centro Sur.",
    },
    {
      username: "est_centrosur_rosa",
      name: "Rosa Aguilar",
      email: "rosa.aguilar@andreaguerrero.ec",
      role: "employee" as const,
      phone: "0987445568",
      bio: "Estilista · local Centro Sur.",
    },
    {
      username: "est_centrosur_fernando",
      name: "Fernando Ríos",
      email: "fernando.rios@andreaguerrero.ec",
      role: "employee" as const,
      phone: "0987445569",
      bio: "Estilista · local Centro Sur.",
    },
  ],
  customers: [
    {
      name: "María Fernanda",
      lastnames: "López Mendoza",
      phone: "0987654321",
      email: "maria.lopez@gmail.com",
    },
    {
      name: "Carla Andrea",
      lastnames: "Vega Torres",
      phone: "0992345678",
      email: "carla.vega@hotmail.com",
    },
    {
      name: "Pedro Javier",
      lastnames: "Ramírez Soto",
      phone: "0976543210",
      email: "pedro.ramirez@yahoo.com",
    },
    {
      name: "Laura Patricia",
      lastnames: "Torres Medina",
      phone: "0965432109",
      email: "laura.torres@gmail.com",
    },
    {
      name: "Sofía Isabel",
      lastnames: "Reyes Vega",
      phone: "0943210987",
      email: "sofia.reyes@gmail.com",
    },
    {
      name: "Valentina",
      lastnames: "Morales Ruiz",
      phone: "0921098765",
      email: "valentina.morales@gmail.com",
    },
    {
      name: "Andrea",
      lastnames: "Cevallos Ponce",
      phone: "0954329876",
      email: "andrea.cevallos@gmail.com",
    },
    {
      name: "Daniela",
      lastnames: "Pulla Chiriboga",
      phone: "0932107654",
      email: "daniela.pulla@outlook.com",
    },
    {
      name: "Camila",
      lastnames: "Ordóñez Castillo",
      phone: "0989012345",
      email: "camila.ordonez@gmail.com",
    },
    {
      name: "Fernanda",
      lastnames: "Ávila Samaniego",
      phone: "0978901234",
      email: "fernanda.avila@hotmail.com",
    },
    {
      name: "Gabriela",
      lastnames: "Jaramillo Peña",
      phone: "0967890123",
      email: "gabriela.jaramillo@outlook.com",
    },
    {
      name: "Lucía",
      lastnames: "Maldonado Ríos",
      phone: "0956789012",
      email: "lucia.maldonado@gmail.com",
    },
    {
      name: "Patricia",
      lastnames: "Burneo León",
      phone: "0945678901",
      email: "patricia.burneo@hotmail.com",
    },
    {
      name: "Diana",
      lastnames: "Aguirre Celi",
      phone: "0934567890",
      email: "diana.aguirre@gmail.com",
    },
    {
      name: "Katherine",
      lastnames: "Romero Valdivieso",
      phone: "0923456789",
      email: "katherine.romero@yahoo.com",
    },
    {
      name: "Michelle",
      lastnames: "Salinas Quizhpe",
      phone: "0912345678",
      email: "michelle.salinas@gmail.com",
    },
    {
      name: "Johanna",
      lastnames: "Piedra Armijos",
      phone: "0998761234",
      email: "johanna.piedra@hotmail.com",
    },
    {
      name: "Carolina",
      lastnames: "Ochoa Vivanco",
      phone: "0987651234",
      email: "carolina.ochoa@gmail.com",
    },
    {
      name: "Verónica",
      lastnames: "Cueva Palacios",
      phone: "0976541234",
      email: "veronica.cueva@outlook.com",
    },
    {
      name: "Elizabeth",
      lastnames: "Guerrero Mora",
      phone: "0965431234",
      email: "elizabeth.guerrero@gmail.com",
    },
  ],
  services: [
    {
      name: "Corte de cabello",
      price: 12,
      durationMinutes: 30,
      commissionPct: 40,
    },
    {
      name: "Corte infantil",
      price: 8,
      durationMinutes: 25,
      commissionPct: 40,
    },
    {
      name: "Brushing y acabado",
      price: 6,
      durationMinutes: 20,
      commissionPct: 45,
    },
    {
      name: "Tinte completo",
      price: 45,
      durationMinutes: 90,
      commissionPct: 30,
    },
    {
      name: "Mechas balayage",
      price: 65,
      durationMinutes: 120,
      commissionPct: 28,
    },
    {
      name: "Lavado + Blowout",
      price: 15,
      durationMinutes: 45,
      commissionPct: 35,
    },
    {
      name: "Tratamiento capilar",
      price: 25,
      durationMinutes: 60,
      commissionPct: 32,
    },
    {
      name: "Peinado para eventos",
      price: 30,
      durationMinutes: 60,
      commissionPct: 38,
    },
    {
      name: "Corte + Blowout (combo)",
      price: 18,
      durationMinutes: 45,
      commissionPct: 38,
    },
    {
      name: "Alisado permanente",
      price: 80,
      durationMinutes: 150,
      commissionPct: 25,
    },
    {
      name: "Hidratación profunda",
      price: 22,
      durationMinutes: 50,
      commissionPct: 32,
    },
    { name: "Manicura", price: 10, durationMinutes: 40, commissionPct: 45 },
    { name: "Pedicura", price: 14, durationMinutes: 50, commissionPct: 45 },
    { name: "Spa de uñas", price: 22, durationMinutes: 70, commissionPct: 40 },
    {
      name: "Depilación facial",
      price: 8,
      durationMinutes: 25,
      commissionPct: 50,
    },
    {
      name: "Depilación corporal",
      price: 18,
      durationMinutes: 40,
      commissionPct: 45,
    },
    {
      name: "Maquillaje profesional",
      price: 35,
      durationMinutes: 60,
      commissionPct: 40,
    },
    {
      name: "Perfilado de cejas",
      price: 5,
      durationMinutes: 15,
      commissionPct: 50,
    },
  ],
  categories: [
    {
      name: "Cuidado capilar",
      description: "Shampoos, acondicionadores y tratamientos",
    },
    {
      name: "Styling profesional",
      description: "Serums, ceras modeladoras y kits de acabado",
    },
    { name: "Uñas y spa", description: "Esmaltes, kits y cuidado de uñas" },
    { name: "Coloración", description: "Tintes y productos de color" },
    { name: "Accesorios", description: "Cepillos y herramientas de venta" },
  ],
  products: [
    {
      name: "Shampoo profesional",
      price: 12,
      stock: 45,
      category: "Cuidado capilar",
    },
    {
      name: "Acondicionador reparador",
      price: 14,
      stock: 38,
      category: "Cuidado capilar",
    },
    {
      name: "Cera modeladora",
      price: 9.5,
      stock: 22,
      category: "Styling profesional",
    },
    {
      name: "Mascarilla capilar",
      price: 18,
      stock: 8,
      category: "Cuidado capilar",
    },
    {
      name: "Serum reparador",
      price: 11,
      stock: 30,
      category: "Styling profesional",
    },
    {
      name: "Spray termoprotector",
      price: 13.5,
      stock: 3,
      category: "Styling profesional",
    },
    { name: "Tinte retail", price: 22, stock: 12, category: "Coloración" },
    {
      name: "Ampolla reparadora",
      price: 6.5,
      stock: 55,
      category: "Cuidado capilar",
    },
    { name: "Esmalte premium", price: 7.5, stock: 40, category: "Uñas y spa" },
    {
      name: "Kit manicura casa",
      price: 16.9,
      stock: 14,
      category: "Uñas y spa",
    },
    {
      name: "Cepillo desenredante",
      price: 15.9,
      stock: 18,
      category: "Accesorios",
    },
    {
      name: "Serum puntas abiertas",
      price: 14.5,
      stock: 4,
      category: "Cuidado capilar",
    },
  ],
  suppliers: [
    {
      name: "Beauty Supply Loja",
      phone: "072567890",
      email: "pedidos@beautysupplyloja.ec",
      taxId: "1100123456001",
      address: "Av. Universitaria, Loja",
    },
    {
      name: "Distribelle Sur",
      phone: "072345678",
      email: "ventas@distribellesur.ec",
      taxId: "1100987654001",
      address: "Calle Bolívar, Loja",
    },
  ],
  appointmentTemplates: [
    {
      title: "Corte de cabello",
      description: "Corte y perfilado.",
      serviceNames: ["Corte de cabello"],
    },
    {
      title: "Corte y blowout",
      description: "Corte + brushing y acabado.",
      serviceNames: ["Corte + Blowout (combo)"],
    },
    {
      title: "Tinte completo",
      description: "Coloración completa con gloss.",
      serviceNames: ["Tinte completo"],
    },
    {
      title: "Mechas balayage",
      description: "Balayage en medios y puntas.",
      serviceNames: ["Mechas balayage"],
    },
    {
      title: "Tratamiento capilar",
      description: "Hidratación profunda + blowout.",
      serviceNames: ["Tratamiento capilar", "Lavado + Blowout"],
    },
    {
      title: "Spa de uñas",
      description: "Manicura y pedicura spa.",
      serviceNames: ["Spa de uñas"],
    },
    {
      title: "Manicura",
      description: "Manicura clásica con esmaltado.",
      serviceNames: ["Manicura"],
    },
    {
      title: "Pedicura",
      description: "Pedicura completa.",
      serviceNames: ["Pedicura"],
    },
    {
      title: "Depilación",
      description: "Depilación facial y perfilado.",
      serviceNames: ["Depilación facial", "Perfilado de cejas"],
    },
    {
      title: "Maquillaje evento",
      description: "Maquillaje profesional para evento.",
      serviceNames: ["Maquillaje profesional"],
    },
    {
      title: "Peinado matrimonio",
      description: "Peinado recogido con ondas.",
      serviceNames: ["Peinado para eventos"],
    },
    {
      title: "Alisado",
      description: "Alisado permanente con queratina.",
      serviceNames: ["Alisado permanente"],
    },
    {
      title: "Combo premium",
      description: "Corte, blowout e hidratación.",
      serviceNames: ["Corte + Blowout (combo)", "Hidratación profunda"],
    },
    {
      title: "Corte + productos",
      description: "Corte con venta de serum.",
      serviceNames: ["Corte de cabello"],
      productNames: ["Serum reparador"],
    },
  ],
  employeeMyDay: [
    {
      dayOffset: 0,
      hour: 9,
      minute: 0,
      status: "completed" as const,
      templateIndex: 0,
      customerIndex: 0,
    },
    {
      dayOffset: 0,
      hour: 10,
      minute: 30,
      status: "completed" as const,
      templateIndex: 1,
      customerIndex: 1,
    },
    {
      dayOffset: 0,
      hour: 11,
      minute: 30,
      status: "completed" as const,
      templateIndex: 5,
      customerIndex: 2,
    },
    {
      dayOffset: 0,
      hour: 14,
      minute: 0,
      status: "scheduled" as const,
      templateIndex: 3,
      customerIndex: 3,
    },
    {
      dayOffset: 0,
      hour: 16,
      minute: 30,
      status: "scheduled" as const,
      templateIndex: 8,
      customerIndex: 4,
    },
    {
      dayOffset: 1,
      hour: 10,
      minute: 0,
      status: "scheduled" as const,
      templateIndex: 9,
      customerIndex: 5,
    },
    {
      dayOffset: 2,
      hour: 11,
      minute: 30,
      status: "paid_pending" as const,
      templateIndex: 6,
      customerIndex: 6,
    },
    {
      dayOffset: 4,
      hour: 15,
      minute: 0,
      status: "scheduled" as const,
      templateIndex: 7,
      customerIndex: 7,
    },
  ],
  paymentNotes: {
    cash: ["Pago en efectivo", "Cliente pagó en caja", ""],
    card: ["Datafast · Visa", "Datafast · Mastercard", "Débito aprobado"],
    transfer: [
      "Transferencia Banco de Loja",
      "Depósito Banco Pichincha",
      "Transferencia Deuna",
    ],
  },
  tasks: [
    {
      title: "Reponer shampoo y acondicionador",
      description: "Los cuatro locales — stock bajo.",
      status: "todo" as const,
      priority: "high" as const,
      assigneeIndex: 1,
      dueDays: 0,
      sortOrder: 1,
    },
    {
      title: "Confirmar turnos de mañana",
      description: "WhatsApp a clientes 099 496 0155.",
      status: "todo" as const,
      priority: "medium" as const,
      assigneeIndex: 0,
      dueDays: 0,
      sortOrder: 2,
    },
    {
      title: "Limpiar esterilizadora",
      description: "Protocolo de higiene semanal.",
      status: "todo" as const,
      priority: "low" as const,
      assigneeIndex: 2,
      dueDays: 2,
      sortOrder: 3,
    },
    {
      title: "Actualizar precios en vitrina",
      description: "Incluir spa de uñas y maquillaje.",
      status: "in_progress" as const,
      priority: "medium" as const,
      assigneeIndex: 0,
      dueDays: 1,
      sortOrder: 1,
    },
    {
      title: "Pedir esmaltes y guantes",
      description: "Proveedor Beauty Supply Loja.",
      status: "in_progress" as const,
      priority: "high" as const,
      assigneeIndex: 1,
      dueDays: 0,
      sortOrder: 2,
    },
    {
      title: "Publicar promo fin de semana",
      description: "Facebook + Instagram Andrea Guerrero.",
      status: "done" as const,
      priority: "medium" as const,
      assigneeIndex: 3,
      dueDays: -1,
      sortOrder: 1,
    },
    {
      title: "Capacitación técnicas de color",
      description: "Sesión interna con el equipo.",
      status: "done" as const,
      priority: "low" as const,
      assigneeIndex: 0,
      dueDays: -3,
      sortOrder: 2,
    },
  ],
} as const;

async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter });

  const ownerPassword = await hashPassword(SEED_PASSWORDS.owner);
  const programmerPassword = await hashPassword(SEED_PASSWORDS.programmer);

  for (const role of SYSTEM_ROLES) {
    const existing = await prisma.role.findFirst({ where: { name: role.name } });
    if (!existing) {
      await prisma.role.create({ data: { name: role.name } });
    }
  }
  console.log("System roles ensured:", SYSTEM_ROLES.map((r) => r.name).join(", "));

  const programmer = await upsertStaffAccount(prisma, {
    username: DEMO.programmer.username,
    password: programmerPassword,
    fullName: DEMO.programmer.name,
    email: DEMO.programmer.email,
    phone: DEMO.programmer.phone,
    role: "programmer",
  });
  console.log("Programmer account ready:", programmer.username);

  const admin = await upsertStaffAccount(prisma, {
    username: DEMO.admin.username,
    password: ownerPassword,
    fullName: DEMO.admin.name,
    email: DEMO.admin.email,
    phone: DEMO.admin.phone,
    role: "owner",
  });

  console.log("Owner account created:", admin.username);

  await seedTestData(prisma, admin);
  await prisma.$disconnect();
}

function pick<T>(items: T[], index: number): T {
  return items[index % items.length];
}

function atTime(base: Date, hour: number, minute: number): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysInMonthSoFar(now: Date): number {
  return now.getDate();
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function calcTotal(
  servicePrices: number[],
  productLines: Array<{ price: number; quantity: number }>,
): number {
  const servicesTotal = servicePrices.reduce((sum, price) => sum + price, 0);
  const productsTotal = productLines.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0,
  );
  return servicesTotal + productsTotal;
}

type SeedService = {
  id: number;
  name: string;
  price: number;
  commissionPct: number;
};

type AppointmentTemplate = {
  title: string;
  description: string;
  serviceNames: readonly string[];
  productNames?: readonly string[];
};

async function registerCompletedAppointmentPayment(
  prisma: PrismaClient,
  params: {
    appointmentId: number;
    userId: number;
    appointmentDate: Date;
    linkedServices: SeedService[];
    productLines: Array<{ price: number; quantity: number }>;
    paymentIndex: number;
  },
) {
  const total = calcTotal(
    params.linkedServices.map((s) => s.price),
    params.productLines,
  );
  const method = pickPaymentMethod(params.paymentIndex);

  await prisma.appointmentPayment.create({
    data: {
      appointmentId: params.appointmentId,
      amount: total,
      method,
      paidAt: params.appointmentDate,
      notes: pickPaymentNote(method, params.paymentIndex),
    },
  });

  const commission = calcAppointmentCommission(
    params.linkedServices.map((s) => ({
      service: { price: s.price, commissionPct: s.commissionPct },
    })),
    params.productLines.map((line) => ({
      product: { price: line.price },
      quantity: line.quantity,
    })),
    total,
  );

  await prisma.commissionRecord.create({
    data: {
      userId: params.userId,
      appointmentId: params.appointmentId,
      baseAmount: commission.baseAmount,
      ratePct: commission.ratePct,
      amount: commission.amount,
      createdAt: params.appointmentDate,
    },
  });
}

async function seedEmployeeMyDayAppointments(
  prisma: PrismaClient,
  now: Date,
  users: Array<{ personId: number }>,
  customers: Array<{ id: number; name: string }>,
  services: SeedService[],
  products: Array<{ id: number; name: string; price: number }>,
  branches: Array<{ id: number }>,
  appointmentTemplates: AppointmentTemplate[],
) {
  let paymentIndex = 5000;

  for (let employeeIndex = 0; employeeIndex < users.length; employeeIndex++) {
    const user = users[employeeIndex];
    const branch =
      branches[Math.floor(employeeIndex / STAFF_PER_BRANCH)] ?? branches[0];

    for (
      let planIndex = 0;
      planIndex < DEMO.employeeMyDay.length;
      planIndex++
    ) {
      const plan = DEMO.employeeMyDay[planIndex];
      const template =
        appointmentTemplates[
          (plan.templateIndex + employeeIndex) % appointmentTemplates.length
        ];
      const customer =
        customers[
          (plan.customerIndex + employeeIndex + planIndex) % customers.length
        ];
      const appointmentDate = atTime(
        addDays(startOfDay(now), plan.dayOffset),
        plan.hour,
        plan.minute,
      );

      const apt = await prisma.appointment.create({
        data: {
          title: template.title,
          description: template.description,
          customerId: customer.id,
          userId: user.personId,
          branchId: branch.id,
          appointmentDate,
          status: plan.status,
          reminderSent: plan.status === "scheduled" ? "no" : "yes",
          stockDeducted: false,
        },
      });

      const linkedServices = template.serviceNames
        .map((name) => services.find((s) => s.name === name))
        .filter((s): s is SeedService => Boolean(s));

      for (const svc of linkedServices) {
        await prisma.appointmentService.create({
          data: { appointmentId: apt.id, serviceId: svc.id },
        });
      }

      const productLines: Array<{ price: number; quantity: number }> = [];
      for (const productName of template.productNames ?? []) {
        const product = products.find((p) => p.name === productName);
        if (!product) continue;
        productLines.push({ price: product.price, quantity: 1 });
        await prisma.appointmentProduct.create({
          data: { appointmentId: apt.id, productId: product.id, quantity: 1 },
        });
      }

      if (plan.status === "completed") {
        await registerCompletedAppointmentPayment(prisma, {
          appointmentId: apt.id,
          userId: user.personId,
          appointmentDate,
          linkedServices,
          productLines,
          paymentIndex: paymentIndex++,
        });

        if (productLines.length > 0) {
          await prisma.appointment.update({
            where: { id: apt.id },
            data: { stockDeducted: true },
          });
        }
      }
    }
  }
}

function buildSubscriptionPayload(now: Date): Prisma.InputJsonValue {
  const startAt = addDays(now, -45).toISOString();
  const expiresAt = addDays(now, 320).toISOString();

  const section = (
    id: number,
    key: string,
    name: string,
    status: "active" | "planned" | "maintenance" = "active",
  ) => ({
    id,
    key,
    name,
    status,
    max_records_limit: null,
    usage_count: 0,
    capabilities: [],
  });

  return {
    maintenance: false,
    subscribed: true,
    subscription: {
      id: 1,
      plan_name: "Scheduly Pro",
      period: "yearly",
      status: "active",
      start_at: startAt,
      expires_at: expiresAt,
      /** Feature permanente: multi_stock. No se puede desactivar. */
      features: [{ key: "multi_stock", status: "active", locked: true }],
      modules: [
        {
          id: 1,
          name: "Administración",
          key: "admin",
          status: "active",
          is_maintainer: false,
          image_url: null,
          is_trial: false,
          start_trial: null,
          limit_days_trial: null,
          end_trial: null,
          sections: [
            section(1, "/panel", "Panel"),
            section(2, "/administracion/usuarios", "Usuarios"),
            section(3, "/administracion/cuentas", "Cuentas", "planned"),
            section(4, "/administracion/roles", "Roles"),
          ],
        },
        {
          id: 8,
          name: "Finanzas",
          key: "finance",
          status: "active",
          is_maintainer: false,
          image_url: null,
          is_trial: false,
          start_trial: null,
          limit_days_trial: null,
          end_trial: null,
          sections: [
            section(1, "/finanzas/centro", "Finanzas"),
            section(2, "/finanzas/cobranzas", "Cobranzas"),
          ],
        },
        {
          id: 2,
          name: "Operación",
          key: "operation",
          status: "active",
          is_maintainer: false,
          image_url: null,
          is_trial: false,
          start_trial: null,
          limit_days_trial: null,
          end_trial: null,
          sections: [
            section(1, "/operacion/agenda", "Agenda"),
            section(2, "/operacion/servicios", "Servicios"),
            section(3, "/operacion/caja", "Caja", "planned"),
            section(4, "/operacion/turno", "Turno", "planned"),
            section(5, "/operacion/tareas", "Tareas"),
            section(
              6,
              "/operacion/comprobantes-pos",
              "Comprobantes POS",
              "planned",
            ),
            section(
              7,
              "/operacion/comprobantes-pos/reimpresion",
              "Reimpresión caja",
              "planned",
            ),
            section(
              8,
              "/comprobantes-electronicos/facturas",
              "Facturas",
              "planned",
            ),
            section(
              9,
              "/comprobantes-electronicos/notas-venta",
              "Notas de venta",
              "planned",
            ),
            section(
              10,
              "/comprobantes-electronicos/emitidos",
              "Emitidos",
              "planned",
            ),
            section(
              11,
              "/operacion/supervision-caja",
              "Supervisión caja",
              "planned",
            ),
          ],
        },
        {
          id: 3,
          name: "Ventas y Compras",
          key: "sales",
          status: "active",
          is_maintainer: false,
          image_url: null,
          is_trial: false,
          start_trial: null,
          limit_days_trial: null,
          end_trial: null,
          sections: [
            section(1, "/ventas/pedidos", "Pedidos", "planned"),
            section(2, "/ventas/clientes", "Clientes"),
            section(3, "/compras/proveedores", "Proveedores"),
            section(4, "/ventas/ventas", "Ventas"),
            section(5, "/compras", "Compras"),
          ],
        },
        {
          id: 4,
          name: "Inventario",
          key: "inventory",
          status: "active",
          is_maintainer: false,
          image_url: null,
          is_trial: false,
          start_trial: null,
          limit_days_trial: null,
          end_trial: null,
          sections: [
            section(1, "/inventario/productos", "Productos"),
            section(2, "/administracion/sucursales", "Sucursales / locales"),
            section(3, "/inventario/movimientos", "Movimientos", "planned"),
            section(4, "/inventario/categorias", "Categorías"),
            section(5, "/inventario/tramos", "Tramos", "planned"),
            section(6, "/inventario/unidades", "Unidades"),
            section(7, "/inventario/lotes", "Lotes y vencimientos", "planned"),
            section(8, "/inventario/valor", "Inventario valorizado"),
          ],
        },
        {
          id: 11,
          name: "Marketing",
          key: "marketing",
          status: "active",
          is_maintainer: false,
          image_url: null,
          is_trial: false,
          start_trial: null,
          limit_days_trial: null,
          end_trial: null,
          sections: [
            section(1, "/marketing/promociones", "Promociones"),
            section(2, "/canal/catalogo", "Catálogo config", "planned"),
            section(3, "/publicidad", "Campañas", "planned"),
            section(
              4,
              "/publicidad/dispositivos",
              "Dispositivos TV",
              "planned",
            ),
            section(5, "/publicidad/reproductor", "Reproductor", "planned"),
          ],
        },
        {
          id: 5,
          name: "Sistema",
          key: "system",
          status: "active",
          is_maintainer: false,
          image_url: null,
          is_trial: false,
          start_trial: null,
          limit_days_trial: null,
          end_trial: null,
          sections: [
            section(1, "/sistema/configuracion", "Configuración"),
            section(2, "/sistema/configuracion?tab=backups", "Backups JSON"),
            section(3, "/sistema/perfil", "Perfil"),
            section(4, "/sistema/donaciones", "Donaciones", "planned"),
          ],
        },
      ],
    },
    plans: [
      {
        id: 1,
        name: "Plan Prueba",
        sort_order: 1,
        channel: "web",
        prices: [
          { id: 1, price: 0, period: "MONTHLY" },
          { id: 2, price: 0, period: "ANNUALLY" },
        ],
        modules: [
          { id: 1, key: "dashboard", name: "Panel", is_trial: false },
          { id: 2, key: "operacion", name: "Operación", is_trial: false },
          { id: 3, key: "ventas", name: "Ventas", is_trial: true },
        ],
        offers: [{ offer_id: 5, offer_name: "Promo verano" }],
      },
      {
        id: 2,
        name: "Scheduly Pro",
        sort_order: 2,
        channel: "web",
        prices: [
          { id: 3, price: 29990, period: "MONTHLY" },
          { id: 4, price: 299900, period: "ANNUALLY" },
        ],
        modules: [
          { id: 1, key: "dashboard", name: "Panel", is_trial: false },
          { id: 2, key: "operacion", name: "Operación", is_trial: false },
          { id: 3, key: "ventas", name: "Ventas", is_trial: false },
          { id: 4, key: "inventory", name: "Inventario", is_trial: false },
          { id: 5, key: "finance", name: "Finanzas", is_trial: false },
          { id: 6, key: "admin", name: "Administración", is_trial: false },
          { id: 7, key: "system", name: "Sistema", is_trial: false },
          { id: 9, key: "purchases", name: "Compras", is_trial: false },
        ],
        offers: [],
      },
    ],
  };
}

function dayLoadFactor(date: Date): number {
  const dow = date.getDay();
  // Dom: cerrado parcial · Lun: moderado · Mar–Vie: pico · Sáb: muy concurrido
  const weights = [0.35, 0.75, 1, 1.05, 1.1, 1.15, 1.25];
  return weights[dow] ?? 1;
}

function appointmentsForDay(
  dayOffset: number,
  now: Date,
  base: number,
): number {
  const day = addDays(startOfDay(now), dayOffset);
  return Math.max(1, Math.round(base * dayLoadFactor(day)));
}

function pickPaymentMethod(index: number): SeedPaymentMethod {
  const roll = index % 20;
  if (roll < 10) return "cash";
  if (roll < 17) return "card";
  return "transfer";
}

function pickPaymentNote(method: SeedPaymentMethod, index: number): string {
  const notes = DEMO.paymentNotes[method];
  return pick([...notes], index);
}

type DayPlan = {
  dayOffset: number;
  hour: number;
  minute: number;
  status: AppointmentStatus;
};

function buildAppointmentPlans(now: Date): DayPlan[] {
  const timeSlots: Array<[number, number]> = [
    [9, 0],
    [9, 30],
    [10, 0],
    [10, 30],
    [11, 0],
    [11, 30],
    [12, 0],
    [12, 30],
    [14, 0],
    [14, 30],
    [15, 0],
    [15, 30],
    [16, 0],
    [16, 30],
    [17, 0],
    [17, 30],
    [18, 0],
    [18, 30],
    [19, 0],
  ];

  const plans: DayPlan[] = [];
  const currentHour = now.getHours();

  const todayCount =
    TODAY_APPOINTMENTS_MIN +
    ((now.getDate() + now.getMonth()) %
      (TODAY_APPOINTMENTS_MAX - TODAY_APPOINTMENTS_MIN + 1));

  for (let i = 0; i < todayCount; i++) {
    const [hour, minute] = pick(timeSlots, i);
    let status: AppointmentStatus;
    if (hour < currentHour - 1) {
      status = pick(
        [
          "completed",
          "completed",
          "completed",
          "pending_payment",
          "cancelled",
        ] as AppointmentStatus[],
        i,
      );
    } else if (hour <= currentHour) {
      status = pick(
        [
          "completed",
          "pending_payment",
          "paid_pending",
          "scheduled",
        ] as AppointmentStatus[],
        i,
      );
    } else {
      status = pick(
        [
          "scheduled",
          "scheduled",
          "paid_pending",
          "rescheduled",
        ] as AppointmentStatus[],
        i,
      );
    }
    plans.push({ dayOffset: 0, hour, minute, status });
  }

  // Días -1..-6 (resto de la ventana "semana"): actividad según día de la semana
  for (let dayOffset = -1; dayOffset >= -6; dayOffset--) {
    const perDay = appointmentsForDay(dayOffset, now, 9);
    for (let i = 0; i < perDay; i++) {
      const [hour, minute] = pick(timeSlots, Math.abs(dayOffset) * 10 + i);
      const status = pick(
        [
          "completed",
          "completed",
          "completed",
          "completed",
          "pending_payment",
          "cancelled",
          "rescheduled",
          "paid_pending",
        ] as AppointmentStatus[],
        i + Math.abs(dayOffset),
      );
      plans.push({ dayOffset, hour, minute, status });
    }
  }

  // Resto del mes en curso (antes de la ventana de 7 días)
  const monthDay = daysInMonthSoFar(now);
  const earlierMonthDays = Math.max(0, monthDay - 7);
  for (let dayOfMonth = 1; dayOfMonth <= earlierMonthDays; dayOfMonth++) {
    const dayOffset = dayOfMonth - monthDay;
    const perDay = appointmentsForDay(dayOffset, now, 3);
    for (let i = 0; i < perDay; i++) {
      const [hour, minute] = pick(timeSlots, dayOfMonth * 5 + i);
      const status = pick(
        [
          "completed",
          "completed",
          "completed",
          "cancelled",
          "pending_payment",
          "rescheduled",
        ] as AppointmentStatus[],
        dayOfMonth + i,
      );
      plans.push({ dayOffset, hour, minute, status });
    }
  }

  // Futuro (1–14 días): agenda viva
  const futureCount = 16;
  for (let i = 0; i < futureCount; i++) {
    const dayOffset = 1 + (i % 14);
    const [hour, minute] = pick(timeSlots, i + 3);
    const status = pick(
      [
        "scheduled",
        "scheduled",
        "scheduled",
        "paid_pending",
        "rescheduled",
      ] as AppointmentStatus[],
      i,
    );
    plans.push({ dayOffset, hour, minute, status });
  }

  // Ajuste fino al rango 120–140
  let target =
    TARGET_APPOINTMENTS_MIN +
    (monthDay % (TARGET_APPOINTMENTS_MAX - TARGET_APPOINTMENTS_MIN + 1));
  target = clamp(target, TARGET_APPOINTMENTS_MIN, TARGET_APPOINTMENTS_MAX);

  if (plans.length > target) {
    // Conservar hoy + semana + futuro; recortar primero el mes temprano
    const keepPriority = (p: DayPlan) => {
      if (p.dayOffset === 0) return 0;
      if (p.dayOffset >= -6 && p.dayOffset <= -1) return 1;
      if (p.dayOffset > 0) return 2;
      return 3;
    };
    plans.sort((a, b) => keepPriority(a) - keepPriority(b));
    plans.length = target;
  } else {
    let fill = 0;
    while (plans.length < target) {
      const dayOffset = -((fill % 6) + 1);
      const [hour, minute] = pick(timeSlots, fill + 7);
      plans.push({
        dayOffset,
        hour,
        minute,
        status: pick(
          [
            "completed",
            "completed",
            "pending_payment",
            "cancelled",
          ] as AppointmentStatus[],
          fill,
        ),
      });
      fill++;
    }
  }

  return plans;
}

async function refreshOperationalData(prisma: PrismaClient) {
  await prisma.commissionRecord.deleteMany({});
  await prisma.appointmentPayment.deleteMany({});
  await prisma.appointmentProduct.deleteMany({});
  await prisma.appointmentService.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.notification.deleteMany({});
}

async function seedBusinessSettings(prisma: PrismaClient) {
  const colors = {
    accentColor: DEMO.business.accentColor,
    successColor: DEMO.business.successColor,
    warningColor: DEMO.business.warningColor,
    dangerColor: DEMO.business.dangerColor,
  };

  await prisma.appSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      name: DEMO.business.businessName,
      alias: "andrea-guerrero",
      description: `${DEMO.business.description} Horario: ${DEMO.business.hours}`,
      phone: DEMO.business.phone,
      socialWhatsapp: DEMO.business.whatsapp,
      socialFacebook: DEMO.business.facebook,
      socialInstagram: DEMO.business.instagram,
      logoPath: null,
      ...colors,
    },
    update: {
      name: DEMO.business.businessName,
      alias: "andrea-guerrero",
      description: `${DEMO.business.description} Horario: ${DEMO.business.hours}`,
      phone: DEMO.business.phone,
      socialWhatsapp: DEMO.business.whatsapp,
      socialFacebook: DEMO.business.facebook,
      socialInstagram: DEMO.business.instagram,
      ...colors,
    },
  });

  await prisma.sriBillingSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      environment: "pruebas",
      tradeName: DEMO.business.businessName,
      matrixAddress: DEMO.business.address,
      establishmentAddress: DEMO.business.address,
      phone: DEMO.business.phone,
      email: DEMO.admin.email,
    },
    update: {
      environment: "pruebas",
      tradeName: DEMO.business.businessName,
      matrixAddress: DEMO.business.address,
      establishmentAddress: DEMO.business.address,
      phone: DEMO.business.phone,
      email: DEMO.admin.email,
    },
  });
}

async function seedAccountRoles(
  prisma: PrismaClient,
  accounts: Array<{ accountId: number; role: string }>,
) {
  const roles = await prisma.role.findMany();
  const roleByAppRole = Object.fromEntries(
    SYSTEM_ROLES.map((r) => [r.appRole, r.name]),
  );

  for (const entry of accounts) {
    const roleName = roleByAppRole[entry.role] ?? appRoleToDbRoleName(entry.role);
    const roleId = roles.find((r) => r.name === roleName)?.id;
    if (!roleId) continue;
    await prisma.accountRole.upsert({
      where: {
        accountId_roleId: { accountId: entry.accountId, roleId },
      },
      create: { accountId: entry.accountId, roleId },
      update: {},
    });
  }
}

async function seedTestData(prisma: PrismaClient, admin: SeedAccount) {
  const adminPersonId = admin.personId;
  const adminAccountId = admin.accountId;
  const staffPassword = await hashPassword(SEED_PASSWORDS.staff);
  const now = new Date();

  await seedBusinessSettings(prisma);

  const users = await Promise.all(
    DEMO.staff.map((u) =>
      upsertStaffAccount(prisma, {
        username: u.username,
        password: staffPassword,
        fullName: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
      }),
    ),
  );

  const branchAdminUsers = await Promise.all(
    DEMO.branchAdmins.map((adminUser) =>
      upsertStaffAccount(prisma, {
        username: adminUser.username,
        password: staffPassword,
        fullName: adminUser.name,
        email: adminUser.email,
        phone: adminUser.phone,
        role: "admin",
      }),
    ),
  );

  await seedAccountRoles(prisma, [
    { accountId: adminAccountId, role: "owner" },
    ...branchAdminUsers.map((u) => ({
      accountId: u.accountId,
      role: "admin" as const,
    })),
    ...users.map((u, i) => ({
      accountId: u.accountId,
      role: DEMO.staff[i].role,
    })),
  ]);

  const customersData = [...DEMO.customers];

  console.log("Refrescando turnos, pagos, notificaciones y clientes...");
  await refreshOperationalData(prisma);
  await prisma.customer.deleteMany({});

  const customers = await Promise.all(
    customersData.map((c) =>
      prisma.customer.create({ data: customerFromDemo(c) }),
    ),
  );

  const demoCustomerPassword = await hashPassword(SEED_PASSWORDS.customer);
  try {
    await prisma.customer.update({
      where: { id: customers[0].id },
      data: { password: demoCustomerPassword },
    });
  } catch {
    // Client Prisma desfasado (generated owned by root) · hash vía SQL
    await prisma.$executeRaw`
      UPDATE Customer SET password = ${demoCustomerPassword} WHERE id = ${customers[0].id}
    `;
  }
  await prisma.customerLoyalty.create({
    data: {
      customerId: customers[0].id,
      points: 100,
      tier: "bronze",
    },
  });

  const servicesData = [...DEMO.services];

  const services: Array<{
    id: number;
    name: string;
    price: number;
    durationMinutes: number;
    commissionPct: number;
  }> = [];
  for (const s of servicesData) {
    const existing = await prisma.service.findFirst({
      where: { name: s.name },
    });
    if (existing) {
      services.push(
        await prisma.service.update({
          where: { id: existing.id },
          data: {
            price: s.price,
            durationMinutes: s.durationMinutes,
            commissionPct: s.commissionPct,
          },
        }),
      );
    } else {
      services.push(await prisma.service.create({ data: s }));
    }
  }

  const categoriesData = [...DEMO.categories];

  const categories: Array<{ id: number; name: string }> = [];
  for (const c of categoriesData) {
    const existing = await prisma.category.findFirst({
      where: { name: c.name },
    });
    if (existing) {
      categories.push(
        await prisma.category.update({
          where: { id: existing.id },
          data: { description: c.description },
        }),
      );
    } else {
      categories.push(await prisma.category.create({ data: c }));
    }
  }

  const categoryByName = Object.fromEntries(
    categories.map((c) => [c.name, c.id]),
  );

  const defaultUnit = await ensureDefaultUnit(prisma);

  // Stocks finales deseados (incluye alertas ≤5 y uno en 0)
  const productsData = [...DEMO.products];

  const products: Array<{
    id: number;
    name: string;
    price: number;
    stock: number;
  }> = [];
  for (const p of productsData) {
    const payload = {
      name: p.name,
      price: p.price,
      stock: p.stock,
      type: "final" as const,
      unitId: defaultUnit.id,
      categoryId: categoryByName[p.category] ?? null,
    };
    const existing = await prisma.product.findFirst({
      where: { name: p.name },
    });
    if (existing) {
      products.push(
        await prisma.product.update({
          where: { id: existing.id },
          data: payload,
        }),
      );
    } else {
      products.push(await prisma.product.create({ data: payload }));
    }
  }

  const branchSeeds = [
    {
      key: "colon",
      name: "Andrea Guerrero · Cristóbal Colón",
      address: "18 de Noviembre y Cristóbal Colón, Loja",
      phone: "0994960155",
      city: "Loja",
      province: "Loja",
      position: 1,
      locationKind: "propia" as const,
      establishmentCode: "001",
    },
    {
      key: "eguiguren",
      name: "Andrea Guerrero · Eguiguren",
      address: "18 de Noviembre y José Antonio Eguiguren, Loja",
      phone: "0994960155",
      city: "Loja",
      province: "Loja",
      position: 2,
      locationKind: "propia" as const,
      establishmentCode: "002",
    },
    {
      key: "lourdes",
      name: "Andrea Guerrero · Lourdes",
      address: "Av. Lourdes y Quito, Loja",
      phone: "0994960155",
      city: "Loja",
      province: "Loja",
      position: 3,
      locationKind: "vitrina" as const,
      establishmentCode: "003",
    },
    {
      key: "centrosur",
      name: "Andrea Guerrero · Centro Sur",
      address: "18 de Noviembre y Mercadillo, Loja",
      phone: "0994960155",
      city: "Loja",
      province: "Loja",
      position: 4,
      locationKind: "vitrina" as const,
      establishmentCode: "004",
    },
  ];

  const branches: Array<{ id: number; name: string; key: string }> = [];
  for (const b of branchSeeds) {
    const { key, ...data } = b;
    const existing = await prisma.branch.findFirst({
      where: { name: data.name },
    });
    const row = existing
      ? await prisma.branch.update({
          where: { id: existing.id },
          data: { ...data, isActive: true, isVisible: true },
        })
      : await prisma.branch.create({
          data: { ...data, isActive: true, isVisible: true },
        });
    branches.push({ id: row.id, name: row.name, key });
  }

  await prisma.branch.updateMany({
    where: { id: { notIn: branches.map((b) => b.id) } },
    data: { isActive: false, isVisible: false },
  });

  const mainBranch = branches.find((b) => b.key === "colon") ?? branches[0];

  await prisma.accountBranch.deleteMany();
  await prisma.accountBranch.create({
    data: {
      accountId: adminAccountId,
      branchId: mainBranch.id,
      isPrimary: true,
    },
  });

  for (const branchAdmin of branchAdminUsers) {
    const seed = DEMO.branchAdmins.find(
      (a) => a.username === branchAdmin.username,
    );
    const branch = branches.find((b) => b.key === seed?.branchCode);
    if (!branch) continue;
    await prisma.accountBranch.create({
      data: {
        accountId: branchAdmin.accountId,
        branchId: branch.id,
        isPrimary: true,
      },
    });
    await prisma.branch.update({
      where: { id: branch.id },
      data: { managerAccountId: branchAdmin.accountId },
    });
  }

  for (let branchIndex = 0; branchIndex < branches.length; branchIndex++) {
    const branch = branches[branchIndex];
    for (let slot = 0; slot < STAFF_PER_BRANCH; slot++) {
      const user = users[branchIndex * STAFF_PER_BRANCH + slot];
      if (!user) continue;
      await prisma.accountBranch.create({
        data: {
          accountId: user.accountId,
          branchId: branch.id,
          isPrimary: true,
        },
      });
    }
  }

  for (const product of products) {
    for (const branch of branches) {
      const portion = Math.max(0, Math.floor(product.stock / branches.length));
      await prisma.branchStock.upsert({
        where: {
          storeId_productId: { storeId: branch.id, productId: product.id },
        },
        create: {
          storeId: branch.id,
          productId: product.id,
          quantity: portion,
        },
        update: { quantity: portion },
      });
    }
  }

  for (const service of services) {
    for (const branch of branches) {
      await prisma.serviceBranch.upsert({
        where: {
          serviceId_branchId: { serviceId: service.id, branchId: branch.id },
        },
        create: { serviceId: service.id, branchId: branch.id, isActive: true },
        update: { isActive: true },
      });
    }
  }

  await prisma.expense.deleteMany();

  await prisma.expense.createMany({
    data: [
      {
        amount: 120,
        concept: "Reposición insumos local Cristóbal Colón",
        category: "Insumos",
        createdBy: adminAccountId,
        status: "paid",
      },
      {
        amount: 650,
        concept: "Alquiler local Eguiguren",
        category: "Alquiler",
        createdBy: adminAccountId,
        status: "paid",
      },
      {
        amount: 80,
        concept: "Insumos spa local Lourdes",
        category: "Insumos",
        createdBy: adminAccountId,
        status: "paid",
      },
      {
        amount: 95,
        concept: "Materiales peinado Centro Sur",
        category: "Insumos",
        createdBy: adminAccountId,
        status: "paid",
      },
    ],
  });

  await prisma.loyaltySettings.upsert({
    where: { id: 1 },
    create: {},
    update: {},
  });

  await prisma.reward.deleteMany();
  const corteService =
    services.find((s) => s.name.toLowerCase().includes("corte")) ?? services[0];
  const capilarProduct =
    products.find((p) => p.name.toLowerCase().includes("shampoo")) ??
    products[0];
  const blowoutService =
    services.find((s) => s.name.toLowerCase().includes("blowout")) ??
    services[1];

  await prisma.reward.createMany({
    data: [
      {
        name: "10% en próximo corte",
        description: "Descuento en corte clásico",
        pointsCost: 80,
        sortOrder: 1,
        serviceId: corteService?.id ?? null,
        discountPct: 10,
      },
      {
        name: "Producto capilar gratis",
        description: "Shampoo o acondicionador retail",
        pointsCost: 150,
        sortOrder: 2,
        productId: capilarProduct?.id ?? null,
        discountPct: 100,
      },
      {
        name: "Combo blowout premium",
        description: "Brushing + serum reparador",
        pointsCost: 220,
        sortOrder: 3,
        serviceId: blowoutService?.id ?? null,
        discountPct: 15,
      },
    ],
  });

  await prisma.servicePromotion.deleteMany();
  await prisma.servicePromotion.create({
    data: {
      name: "2x1 martes de blowout",
      description:
        "Brushing y acabado 2x1 todos los martes en sucursales participantes",
      discountPct: 50,
      comboLabel: "2x1",
      startsAt: addDays(now, -14),
      endsAt: addDays(now, 45),
      serviceIds: services
        .filter((s) => s.name.toLowerCase().includes("blowout"))
        .map((s) => s.id),
      branchIds: branches.map((b) => b.id),
    },
  });

  await prisma.feedPost.deleteMany();
  await prisma.feedPost.createMany({
    data: [
      {
        title: "Promo spa de uñas",
        body: "Manicura + pedicura con descuento los sábados. Reserva al 099 496 0155.",
        type: "promotion",
        sortOrder: 1,
      },
      {
        title: "Tratamientos capilares",
        body: "Hidratación y color profesional en los locales de Loja.",
        type: "service",
        sortOrder: 2,
      },
      {
        title: "Síguenos",
        body: "Mira trabajos y promociones en Facebook e Instagram Andrea Guerrero.",
        type: "reward",
        sortOrder: 3,
      },
    ],
  });

  const subscriptionPayload = buildSubscriptionPayload(now);
  const existingEntitlement = await prisma.appEntitlement.findFirst({
    orderBy: { id: "desc" },
  });
  if (existingEntitlement) {
    await prisma.appEntitlement.update({
      where: { id: existingEntitlement.id },
      data: {
        payload: subscriptionPayload,
        source: "local",
        status: "gestor_pull",
      },
    });
  } else {
    await prisma.appEntitlement.create({
      data: {
        payload: subscriptionPayload,
        source: "local",
        status: "gestor_pull",
      },
    });
  }

  type AppointmentTemplate = {
    title: string;
    description: string;
    serviceNames: readonly string[];
    productNames?: readonly string[];
  };

  const appointmentTemplates: AppointmentTemplate[] =
    DEMO.appointmentTemplates.map((t) => ({ ...t }));
  const plans = buildAppointmentPlans(now);
  const appointments: Array<{
    id: number;
    appointmentDate: Date;
    status: AppointmentStatus;
  }> = [];

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const template = pick(appointmentTemplates, i);
    const customer = pick(customers, i);
    const user = pick(users, i);
    const appointmentDate = atTime(
      addDays(startOfDay(now), plan.dayOffset),
      plan.hour,
      plan.minute,
    );
    const status = plan.status;

    const branch = branches[i % branches.length];
    const apt = await prisma.appointment.create({
      data: {
        title: template.title,
        description: template.description,
        customerId: customer.id,
        userId: user.personId,
        branchId: branch.id,
        appointmentDate,
        status,
        reminderSent: i % 4 === 0 ? "yes" : "no",
        stockDeducted: false,
      },
    });

    const linkedServices = template.serviceNames
      .map((name) => services.find((s) => s.name === name))
      .filter((s): s is (typeof services)[number] => Boolean(s));

    for (const svc of linkedServices) {
      await prisma.appointmentService
        .create({ data: { appointmentId: apt.id, serviceId: svc.id } })
        .catch(() => {});
    }

    const productLines: Array<{
      productId: number;
      price: number;
      quantity: number;
    }> = [];

    const templateProducts = template.productNames ?? [];
    for (const productName of templateProducts) {
      const product = products.find((p) => p.name === productName);
      if (!product) continue;
      const quantity = 1;
      productLines.push({
        productId: product.id,
        price: product.price,
        quantity,
      });
      await prisma.appointmentProduct
        .create({
          data: { appointmentId: apt.id, productId: product.id, quantity },
        })
        .catch(() => {});
    }

    if (templateProducts.length === 0 && i % 2 === 0) {
      const product = pick(products, i);
      const quantity = 1 + (i % 3);
      productLines.push({
        productId: product.id,
        price: product.price,
        quantity,
      });
      await prisma.appointmentProduct
        .create({
          data: { appointmentId: apt.id, productId: product.id, quantity },
        })
        .catch(() => {});
    }

    if (i % 7 === 0) {
      const extra = pick(products, i + 3);
      const quantity = 1;
      if (!productLines.some((line) => line.productId === extra.id)) {
        productLines.push({
          productId: extra.id,
          price: extra.price,
          quantity,
        });
        await prisma.appointmentProduct
          .create({
            data: { appointmentId: apt.id, productId: extra.id, quantity },
          })
          .catch(() => {});
      }
    }

    if (status === "completed") {
      await registerCompletedAppointmentPayment(prisma, {
        appointmentId: apt.id,
        userId: user.personId,
        appointmentDate,
        linkedServices,
        productLines,
        paymentIndex: i,
      });

      if (productLines.length > 0) {
        await prisma.appointment.update({
          where: { id: apt.id },
          data: { stockDeducted: true },
        });
      }
    }

    appointments.push({ id: apt.id, appointmentDate, status });
  }

  await seedEmployeeMyDayAppointments(
    prisma,
    now,
    users,
    customers,
    services,
    products,
    branches,
    appointmentTemplates,
  );

  // Restaurar stocks demo (sin decrementar por turnos) para alertas estables
  for (const p of productsData) {
    const product = products.find((x) => x.name === p.name);
    if (!product) continue;
    await prisma.product.update({
      where: { id: product.id },
      data: { stock: p.stock },
    });
  }

  const lowStockProducts = productsData.filter((p) => p.stock <= 5);

  const notificationTemplates = [
    {
      title: "Nuevo turno agendado",
      message: "Se agendó un turno para {customer} el {date} a las {time}.",
      type: "info",
    },
    {
      title: "Recordatorio de turno",
      message: "Mañana a las {time} le toca a {customer}.",
      type: "warning",
    },
    {
      title: "Turno completado",
      message: "Se cerró el turno de {customer} con pago registrado.",
      type: "success",
    },
    {
      title: "Turno cancelado",
      message: "Se canceló el turno de {customer} del {date}.",
      type: "error",
    },
    {
      title: "Turno reagendado",
      message: "{customer} reagendó para el {date} a las {time}.",
      type: "warning",
    },
    {
      title: "Pago pendiente",
      message: "El turno de {customer} quedó pendiente de pago.",
      type: "info",
    },
    {
      title: "Cliente frecuente",
      message: "{customer} reservó nuevamente esta semana.",
      type: "success",
    },
    {
      title: "Cierre de caja",
      message: "Revisa el resumen de ingresos del día.",
      type: "info",
    },
  ];

  let notificationsCreated = 0;

  // Notificaciones para admin (mezcla leídas / no leídas + alertas de stock)
  for (let i = 0; i < 12; i++) {
    const tmpl = pick(notificationTemplates, i);
    const customer = pick(customers, i);
    const apt = pick(appointments, i);
    const createdAt = addDays(now, -(i % 10));

    await prisma.notification.create({
      data: {
        userId: adminPersonId,
        title: tmpl.title,
        message: tmpl.message
          .replace("{customer}", customer.name)
          .replace("{date}", apt.appointmentDate.toLocaleDateString(LOCALE))
          .replace(
            "{time}",
            apt.appointmentDate.toLocaleTimeString(LOCALE, {
              hour: "2-digit",
              minute: "2-digit",
            }),
          ),
        type: mapNotificationType(tmpl.type),
        seen: i > 5,
        createdAt,
      },
    });
    notificationsCreated++;
  }

  for (const [idx, p] of lowStockProducts.entries()) {
    const out = p.stock <= 0;
    await prisma.notification.create({
      data: {
        userId: adminPersonId,
        title: out ? `Sin stock: ${p.name}` : `Stock bajo: ${p.name}`,
        message: out
          ? `"${p.name}" se quedó sin unidades. Reponer inventario.`
          : `"${p.name}" tiene solo ${p.stock} unidad(es) (mínimo 5).`,
        type: "alert",
        seen: idx > 1,
        createdAt: addDays(now, -idx),
      },
    });
    notificationsCreated++;
  }

  // Algunas notificaciones para empleados
  for (const user of users) {
    for (let i = 0; i < 4; i++) {
      const tmpl = pick(notificationTemplates, i + user.personId);
      const customer = pick(customers, i + user.personId);
      const apt = pick(appointments, i + user.personId);
      await prisma.notification.create({
        data: {
          userId: user.personId,
          title: tmpl.title,
          message: tmpl.message
            .replace("{customer}", customer.name)
            .replace("{date}", apt.appointmentDate.toLocaleDateString(LOCALE))
            .replace(
              "{time}",
              apt.appointmentDate.toLocaleTimeString(LOCALE, {
                hour: "2-digit",
                minute: "2-digit",
              }),
            ),
          type: mapNotificationType(tmpl.type),
          seen: i > 1,
          createdAt: addDays(now, -(i % 5)),
        },
      });
      notificationsCreated++;
    }
  }

  const paymentsCount = await prisma.appointmentPayment.count();

  // Proveedores y compras de ejemplo
  await prisma.supplierOrderPayment.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.supplier.deleteMany();

  const suppliers: Array<{ id: number; name: string }> = [];
  for (const s of DEMO.suppliers) {
    suppliers.push(
      await prisma.supplier.create({
        data: {
          name: s.name,
          phone: s.phone,
          email: s.email,
          identNumber: s.taxId,
          address: s.address,
        },
      }),
    );
  }

  const productByName = Object.fromEntries(products.map((p) => [p.name, p]));
  const shampoo = productByName["Shampoo profesional"];
  const mascarilla = productByName["Mascarilla capilar"];
  const cera = productByName["Cera modeladora"];

  if (suppliers[0] && shampoo && mascarilla) {
    await prisma.purchaseOrder.create({
      data: {
        supplierId: suppliers[0].id,
        date: addDays(now, -5),
        notes: "Factura #1042 · reposición mensual",
        status: "recibido",
        paymentMethod: "transfer",
        lines: {
          create: [
            { productId: shampoo.id, quantity: 10, unitPrice: 7.2 },
            { productId: mascarilla.id, quantity: 8, unitPrice: 4.5 },
          ],
        },
      },
    });
  }

  if (suppliers[1] && cera && productByName["Serum reparador"]) {
    const aceite = productByName["Serum reparador"];
    await prisma.purchaseOrder.create({
      data: {
        supplierId: suppliers[1].id,
        date: addDays(now, -2),
        notes: "Compra mostrador · efectivo",
        status: "recibido",
        paymentMethod: "cash",
        lines: {
          create: [
            { productId: cera.id, quantity: 6, unitPrice: 5.8 },
            { productId: aceite.id, quantity: 4, unitPrice: 6.5 },
          ],
        },
      },
    });
  }

  const purchasesCount = await prisma.purchaseOrder.count();

  // Tareas de ejemplo para el Kanban
  await prisma.taskItem.deleteMany();
  await prisma.taskPlan.deleteMany();
  const staffPool = [{ id: adminPersonId }, ...users.map((u) => ({ id: u.personId }))];
  const taskPlan = await prisma.taskPlan.create({
    data: {
      title: "Operaciones semana",
      description: "Tareas demo del Kanban",
      status: "published",
      publishedAt: now,
      createdByUserId: adminAccountId,
    },
  });

  for (const task of DEMO.tasks) {
    await prisma.taskItem.create({
      data: {
        planId: taskPlan.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignedUserId: staffPool[task.assigneeIndex]?.id ?? adminPersonId,
        dueDate: addDays(now, task.dueDays),
        sortOrder: task.sortOrder,
        resultNote: task.description,
      },
    });
  }

  const todayCount = appointments.filter((a) => {
    const d = a.appointmentDate;
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }).length;
  const weekStart = startOfDay(addDays(now, -6));
  const weekCount = appointments.filter(
    (a) => a.appointmentDate >= weekStart && a.appointmentDate <= now,
  ).length;
  const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthCount = appointments.filter(
    (a) => a.appointmentDate >= monthStart && a.appointmentDate <= now,
  ).length;
  const futureCount = appointments.filter(
    (a) => a.appointmentDate > now,
  ).length;
  const statusCounts = appointments.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log("Datos de prueba insertados correctamente:");
  console.log(`  - ${DEMO.business.businessName} · ${DEMO.business.address}`);
  console.log("  - SRI ambiente pruebas");
  console.log(
    `  - Programador: ${DEMO.programmer.username} / ${SEED_PASSWORDS.programmer}`,
  );
  console.log(
    `  - Owner: ${DEMO.admin.username} / ${SEED_PASSWORDS.owner} (${DEMO.admin.email})`,
  );
  console.log(
    `  - ${branchAdminUsers.length} admins de sucursal (contraseña: ${SEED_PASSWORDS.staff})`,
  );
  DEMO.branchAdmins.forEach((a) => {
    console.log(`      · ${a.username} → ${a.branchCode}`);
  });
  console.log(
    `  - ${users.length} empleados (${STAFF_PER_BRANCH} por sucursal · contraseña: ${SEED_PASSWORDS.staff})`,
  );
  console.log(`  - ${customers.length} clientes`);
  console.log(`  - ${services.length} servicios`);
  console.log(`  - ${categories.length} categorías`);
  console.log(`  - ${branches.length} sucursales · multistock por local`);
  console.log(`  - ${appointments.length} turnos (refrescados)`);
  console.log(
    `  - ${DEMO.employeeMyDay.length * users.length} turnos «Mi día» (${DEMO.employeeMyDay.filter((p) => p.status === "completed").length} completados por empleado)`,
  );
  console.log(`      · hoy: ${todayCount}`);
  console.log(`      · últimos 7 días: ${weekCount}`);
  console.log(`      · mes en curso: ${monthCount}`);
  console.log(`      · futuros: ${futureCount}`);
  console.log(`      · estados: ${JSON.stringify(statusCounts)}`);
  console.log(`  - ${paymentsCount} pagos registrados`);
  console.log(
    `  - ${suppliers.length} proveedores · ${purchasesCount} compras`,
  );
  console.log(`  - ${DEMO.tasks.length} tareas (Kanban)`);
  console.log(`  - ${notificationsCreated} notificaciones`);
  console.log(`  - entitlement: subscribed=true, maintenance=false`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
