import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import type { AppointmentStatus, PaymentMethod, Prisma } from "@/generated/prisma/client";
import { hashPassword } from "../shared/utils/password";

const TARGET_APPOINTMENTS_MIN = 120;
const TARGET_APPOINTMENTS_MAX = 140;
const TODAY_APPOINTMENTS_MIN = 12;
const TODAY_APPOINTMENTS_MAX = 20;

async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter });

  const adminPassword = await hashPassword("123456");

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: { password: adminPassword },
    create: {
      username: "admin",
      name: "Administrador",
      email: "admin@scheduly.cl",
      password: adminPassword,
      role: "admin",
    },
  });

  console.log("Admin user created:", admin.username);

  await seedTestData(prisma, admin.id);
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

function buildSubscriptionPayload(now: Date): Prisma.InputJsonValue {
  const startAt = addDays(now, -45).toISOString();
  const expiresAt = addDays(now, 320).toISOString();

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
            {
              id: 1,
              key: "/",
              name: "Dashboard",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 2,
              key: "/administracion/usuarios",
              name: "Usuarios",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 3,
              key: "/administracion/roles",
              name: "Roles",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
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
            {
              id: 1,
              key: "/operacion/agenda",
              name: "Agenda",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 2,
              key: "/operacion/tareas",
              name: "Tareas",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 3,
              key: "/operacion/caja",
              name: "Caja",
              status: "planned",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
          ],
        },
        {
          id: 3,
          name: "Ventas",
          key: "sales",
          status: "active",
          is_maintainer: false,
          image_url: null,
          is_trial: false,
          start_trial: null,
          limit_days_trial: null,
          end_trial: null,
          sections: [
            {
              id: 1,
              key: "/ventas/historial",
              name: "Registro de ventas",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 2,
              key: "/ventas/clientes",
              name: "Clientes",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
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
            {
              id: 1,
              key: "/inventario/productos",
              name: "Productos",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 2,
              key: "/inventario/categorias",
              name: "Categorías",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 3,
              key: "/inventario/unidades",
              name: "Unidades",
              status: "maintenance",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
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
            {
              id: 1,
              key: "/sistema/configuracion",
              name: "Configuración",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 2,
              key: "/sistema/planes",
              name: "Planes",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 3,
              key: "/sistema/modulos",
              name: "Módulos",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 4,
              key: "/sistema/perfil",
              name: "Perfil",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 5,
              key: "/sistema/notificaciones",
              name: "Notificaciones",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
          ],
        },
        {
          id: 6,
          name: "Documentos electrónicos",
          key: "electronicDocs",
          status: "active",
          is_maintainer: false,
          image_url: null,
          is_trial: false,
          start_trial: null,
          limit_days_trial: null,
          end_trial: null,
          sections: [
            {
              id: 1,
              key: "/comprobantes-electronicos",
              name: "Centro",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 2,
              key: "/comprobantes-electronicos/facturas",
              name: "Facturas",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 3,
              key: "/comprobantes-electronicos/notas-venta",
              name: "Notas de venta",
              status: "planned",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
          ],
        },
      ],
    },
  };
}

type DayPlan = {
  dayOffset: number;
  hour: number;
  minute: number;
  status: AppointmentStatus;
};

function buildAppointmentPlans(now: Date): DayPlan[] {
  const timeSlots: Array<[number, number]> = [
    [9, 0], [9, 30], [10, 0], [10, 30], [11, 0], [11, 30],
    [12, 0], [12, 30], [14, 0], [14, 30], [15, 0], [15, 30],
    [16, 0], [16, 30], [17, 0], [17, 30], [18, 0], [18, 30], [19, 0],
  ];

  const plans: DayPlan[] = [];
  const currentHour = now.getHours();

  const todayCount =
    TODAY_APPOINTMENTS_MIN +
    ((now.getDate() + now.getMonth()) % (TODAY_APPOINTMENTS_MAX - TODAY_APPOINTMENTS_MIN + 1));

  for (let i = 0; i < todayCount; i++) {
    const [hour, minute] = pick(timeSlots, i);
    let status: AppointmentStatus;
    if (hour < currentHour - 1) {
      status = pick(
        ["completed", "completed", "completed", "pending_payment", "cancelled"] as AppointmentStatus[],
        i,
      );
    } else if (hour <= currentHour) {
      status = pick(
        ["completed", "pending_payment", "paid_pending", "scheduled"] as AppointmentStatus[],
        i,
      );
    } else {
      status = pick(
        ["scheduled", "scheduled", "paid_pending", "rescheduled"] as AppointmentStatus[],
        i,
      );
    }
    plans.push({ dayOffset: 0, hour, minute, status });
  }

  // Días -1..-6 (resto de la ventana "semana"): actividad densa
  for (let dayOffset = -1; dayOffset >= -6; dayOffset--) {
    const perDay = 8 + ((Math.abs(dayOffset) * 3) % 5); // 8–12
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
    const perDay = 2 + (dayOfMonth % 4); // 2–5
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
      ["scheduled", "scheduled", "scheduled", "paid_pending", "rescheduled"] as AppointmentStatus[],
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
          ["completed", "completed", "pending_payment", "cancelled"] as AppointmentStatus[],
          fill,
        ),
      });
      fill++;
    }
  }

  return plans;
}

async function refreshOperationalData(prisma: PrismaClient) {
  await prisma.payment.deleteMany({});
  await prisma.appointmentsProducts.deleteMany({});
  await prisma.appointmentsServices.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.notification.deleteMany({});
}

async function seedTestData(prisma: PrismaClient, adminId: number) {
  const password = await hashPassword("123456");
  const now = new Date();

  const usersData = [
    {
      username: "jperez",
      name: "Juan Pérez",
      email: "juan.perez@scheduly.cl",
      password,
      role: "employee",
      phone: "+56 9 1234 5678",
      bio: "Barbero senior. Especialista en cortes clásicos y barba.",
      photo: null,
    },
    {
      username: "mgarcia",
      name: "María García",
      email: "maria.garcia@scheduly.cl",
      password,
      role: "employee",
      phone: "+56 9 8765 4321",
      bio: "Estilista colorista. Mechas, balayage y tratamientos.",
      photo: null,
    },
    {
      username: "crojas",
      name: "Camila Rojas",
      email: "camila.rojas@scheduly.cl",
      password,
      role: "employee",
      phone: "+56 9 5544 3322",
      bio: "Estilista junior. Peinados, blowout y cortes femeninos.",
      photo: null,
    },
    {
      username: "flopez",
      name: "Felipe López",
      email: "felipe.lopez@scheduly.cl",
      password,
      role: "employee",
      phone: "+56 9 6677 8899",
      bio: "Barbero y recepción. Atiende combos y venta de productos.",
      photo: null,
    },
  ];

  const users = await Promise.all(
    usersData.map((u) =>
      prisma.user.upsert({
        where: { username: u.username },
        update: {
          name: u.name,
          email: u.email,
          password: u.password,
          role: u.role,
          phone: u.phone,
          bio: u.bio,
        },
        create: u,
      }),
    ),
  );

  const customersData = [
    { name: "Carlos", lastnames: "Muñoz López", phone: "+56 9 1111 1111", email: "carlos.munoz@example.com" },
    { name: "Ana", lastnames: "Fernández Rojas", phone: "+56 9 2222 2222", email: "ana.fernandez@example.com" },
    { name: "Pedro", lastnames: "Ramírez Soto", phone: "+56 9 3333 3333", email: "pedro.ramirez@example.com" },
    { name: "Laura", lastnames: "Torres Medina", phone: "+56 9 4444 4444", email: "laura.torres@example.com" },
    { name: "Diego", lastnames: "Herrera Castro", phone: "+56 9 5555 5555", email: "diego.herrera@example.com" },
    { name: "Sofía", lastnames: "Reyes Vega", phone: "+56 9 6666 6666", email: "sofia.reyes@example.com" },
    { name: "Matías", lastnames: "Ortiz Flores", phone: "+56 9 7777 7777", email: "matias.ortiz@example.com" },
    { name: "Valentina", lastnames: "Morales Ruiz", phone: "+56 9 8888 8888", email: "valentina.morales@example.com" },
    { name: "Javiera", lastnames: "Silva Paredes", phone: "+56 9 9012 3456", email: "javiera.silva@example.com" },
    { name: "Tomás", lastnames: "Navarro Díaz", phone: "+56 9 9123 4567", email: "tomas.navarro@example.com" },
    { name: "Isidora", lastnames: "Campos Aguirre", phone: "+56 9 9234 5678", email: "isidora.campos@example.com" },
    { name: "Benjamín", lastnames: "Vargas Núñez", phone: "+56 9 9345 6789", email: "benjamin.vargas@example.com" },
    { name: "Catalina", lastnames: "Méndez Soto", phone: "+56 9 9456 7890", email: "catalina.mendez@example.com" },
    { name: "Nicolás", lastnames: "Pizarro Leiva", phone: "+56 9 9567 8901", email: "nicolas.pizarro@example.com" },
    { name: "Francisca", lastnames: "Araya Contreras", phone: "+56 9 9678 9012", email: "francisca.araya@example.com" },
    { name: "Sebastián", lastnames: "Bravo Fuentes", phone: "+56 9 9789 0123", email: "sebastian.bravo@example.com" },
    { name: "Antonia", lastnames: "Espinoza Riquelme", phone: "+56 9 9890 1234", email: "antonia.espinoza@example.com" },
    { name: "Ignacio", lastnames: "Salazar Moya", phone: "+56 9 9901 2345", email: "ignacio.salazar@example.com" },
    { name: "Emilia", lastnames: "Cortés Valdés", phone: "+56 9 9012 9876", email: "emilia.cortes@example.com" },
    { name: "Maximiliano", lastnames: "Henríquez Lagos", phone: "+56 9 9123 8765", email: "maximiliano.henriquez@example.com" },
    { name: "Constanza", lastnames: "Figueroa Palma", phone: "+56 9 9234 7654", email: "constanza.figueroa@example.com" },
    { name: "Vicente", lastnames: "Gutiérrez Arancibia", phone: "+56 9 9345 6543", email: "vicente.gutierrez@example.com" },
  ];

  const customers = await Promise.all(
    customersData.map((c) =>
      prisma.customer.upsert({
        where: { email: c.email },
        update: c,
        create: c,
      }),
    ),
  );

  const servicesData = [
    { name: "Corte de cabello", price: 15000 },
    { name: "Corte infantil", price: 10000 },
    { name: "Arreglo de barba", price: 8000 },
    { name: "Tinte completo", price: 35000 },
    { name: "Mechas balayage", price: 45000 },
    { name: "Lavado + Blowout", price: 18000 },
    { name: "Tratamiento capilar", price: 25000 },
    { name: "Peinado para eventos", price: 30000 },
    { name: "Corte + Barba (combo)", price: 20000 },
    { name: "Alisado permanente", price: 55000 },
    { name: "Retoque de raíz", price: 22000 },
    { name: "Hidratación profunda", price: 28000 },
    { name: "Perfilado de cejas", price: 6000 },
    { name: "Depilación facial", price: 7000 },
  ];

  const services: Array<{ id: number; name: string; price: number }> = [];
  for (const s of servicesData) {
    const existing = await prisma.service.findFirst({ where: { name: s.name } });
    if (existing) {
      services.push(
        await prisma.service.update({
          where: { id: existing.id },
          data: { price: s.price },
        }),
      );
    } else {
      services.push(await prisma.service.create({ data: s }));
    }
  }

  const categoriesData = [
    { name: "Cuidado capilar", description: "Shampoos, acondicionadores y tratamientos" },
    { name: "Barba", description: "Aceites, ceras y kits para barba" },
    { name: "Peinado y fijación", description: "Geles, sprays y peines" },
    { name: "Coloración", description: "Tintes y productos de color" },
    { name: "Accesorios", description: "Cepillos y herramientas de venta" },
  ];

  const categories: Array<{ id: number; name: string }> = [];
  for (const c of categoriesData) {
    const existing = await prisma.category.findFirst({ where: { name: c.name } });
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

  const categoryByName = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  // Stocks finales deseados (incluye alertas ≤5 y uno en 0)
  const productsData = [
    { name: "Shampoo profesional", price: 12000, stock: 45, category: "Cuidado capilar" },
    { name: "Acondicionador reparador", price: 14000, stock: 38, category: "Cuidado capilar" },
    { name: "Cera para barba", price: 9500, stock: 22, category: "Barba" },
    { name: "Gel fijador", price: 8000, stock: 15, category: "Peinado y fijación" },
    { name: "Mascarilla capilar", price: 18000, stock: 8, category: "Cuidado capilar" },
    { name: "Aceite para barba", price: 11000, stock: 30, category: "Barba" },
    { name: "Spray termoprotector", price: 13500, stock: 3, category: "Peinado y fijación" },
    { name: "Tinte retail", price: 22000, stock: 12, category: "Coloración" },
    { name: "Ampolla reparadora", price: 6500, stock: 55, category: "Cuidado capilar" },
    { name: "Cepillo desenredante", price: 15900, stock: 18, category: "Accesorios" },
    { name: "Tónico anticaída", price: 17500, stock: 5, category: "Cuidado capilar" },
    { name: "Kit barba (aceite + peine)", price: 24900, stock: 2, category: "Barba" },
    { name: "Cera mate texturizante", price: 9900, stock: 0, category: "Peinado y fijación" },
    { name: "Serum puntas abiertas", price: 14500, stock: 4, category: "Cuidado capilar" },
  ];

  const products: Array<{ id: number; name: string; price: number; stock: number }> = [];
  for (const p of productsData) {
    const payload = {
      name: p.name,
      price: p.price,
      stock: p.stock,
      categoryId: categoryByName[p.category] ?? null,
    };
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
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

  const subscriptionPayload = buildSubscriptionPayload(now);
  const existingEntitlement = await prisma.entitlement.findFirst({
    orderBy: { id: "desc" },
  });
  if (existingEntitlement) {
    await prisma.entitlement.update({
      where: { id: existingEntitlement.id },
      data: {
        payload: subscriptionPayload,
        source: "seed",
        status: "gestor_pull",
      },
    });
  } else {
    await prisma.entitlement.create({
      data: {
        payload: subscriptionPayload,
        source: "seed",
        status: "gestor_pull",
      },
    });
  }

  console.log("Refrescando turnos, pagos y notificaciones...");
  await refreshOperationalData(prisma);

  const appointmentTemplates = [
    { title: "Corte de cabello", description: "Corte moderno con degradado bajo.", serviceNames: ["Corte de cabello"] },
    { title: "Corte y barba", description: "Corte clásico + perfilado de barba.", serviceNames: ["Corte + Barba (combo)"] },
    { title: "Tinte completo", description: "Tinte castaño oscuro con gloss final.", serviceNames: ["Tinte completo"] },
    { title: "Mechas balayage", description: "Balayage rubio ceniza en medios y puntas.", serviceNames: ["Mechas balayage"] },
    { title: "Tratamiento capilar", description: "Hidratación profunda con keratina.", serviceNames: ["Tratamiento capilar", "Lavado + Blowout"] },
    { title: "Peinado matrimonio", description: "Peinado recogido con ondas suaves.", serviceNames: ["Peinado para eventos"] },
    { title: "Corte infantil", description: "Corte para niño, degrafilado.", serviceNames: ["Corte infantil"] },
    { title: "Lavado y secado", description: "Lavado profesional y blowout.", serviceNames: ["Lavado + Blowout"] },
    { title: "Alisado", description: "Alisado permanente con queratina.", serviceNames: ["Alisado permanente"] },
    { title: "Retoque de color", description: "Retoque de raíz y matización.", serviceNames: ["Retoque de raíz"] },
    { title: "Arreglo de barba", description: "Perfilado y hidratación de barba.", serviceNames: ["Arreglo de barba"] },
    { title: "Combo premium", description: "Corte, barba y tratamiento capilar.", serviceNames: ["Corte + Barba (combo)", "Hidratación profunda"] },
  ];

  const paymentMethods: PaymentMethod[] = ["cash", "card", "transfer"];
  const plans = buildAppointmentPlans(now);
  const appointments: Array<{ id: number; appointmentDate: Date; status: AppointmentStatus }> = [];

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const template = pick(appointmentTemplates, i);
    const customer = pick(customers, i);
    const user = pick(users, i);
    const appointmentDate = atTime(addDays(startOfDay(now), plan.dayOffset), plan.hour, plan.minute);
    const status = plan.status;

    const apt = await prisma.appointment.create({
      data: {
        title: template.title,
        description: template.description,
        customerId: customer.id,
        userId: user.id,
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
      await prisma.appointmentsServices
        .create({ data: { appointmentId: apt.id, serviceId: svc.id } })
        .catch(() => {});
    }

    const productLines: Array<{ productId: number; price: number; quantity: number }> = [];

    if (i % 2 === 0) {
      const product = pick(products, i);
      const quantity = 1 + (i % 3);
      productLines.push({ productId: product.id, price: product.price, quantity });
      await prisma.appointmentsProducts
        .create({ data: { appointmentId: apt.id, productId: product.id, quantity } })
        .catch(() => {});
    }

    if (i % 7 === 0) {
      const extra = pick(products, i + 3);
      const quantity = 1;
      if (!productLines.some((line) => line.productId === extra.id)) {
        productLines.push({ productId: extra.id, price: extra.price, quantity });
        await prisma.appointmentsProducts
          .create({ data: { appointmentId: apt.id, productId: extra.id, quantity } })
          .catch(() => {});
      }
    }

    const total = calcTotal(
      linkedServices.map((s) => s.price),
      productLines,
    );

    if (status === "completed") {
      const method = pick(paymentMethods, i);
      await prisma.payment.create({
        data: {
          appointmentId: apt.id,
          amount: total,
          method,
          paidAt: appointmentDate,
          notes: method === "transfer" ? "Transferencia confirmada" : "",
        },
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
    { title: "Nuevo turno agendado", message: "Se agendó un turno para {customer} el {date} a las {time}.", type: "info" },
    { title: "Recordatorio de turno", message: "Mañana a las {time} le toca a {customer}.", type: "warning" },
    { title: "Turno completado", message: "Se cerró el turno de {customer} con pago registrado.", type: "success" },
    { title: "Turno cancelado", message: "Se canceló el turno de {customer} del {date}.", type: "error" },
    { title: "Turno reagendado", message: "{customer} reagendó para el {date} a las {time}.", type: "warning" },
    { title: "Pago pendiente", message: "El turno de {customer} quedó pendiente de pago.", type: "info" },
    { title: "Cliente frecuente", message: "{customer} reservó nuevamente esta semana.", type: "success" },
    { title: "Cierre de caja", message: "Revisa el resumen de ingresos del día.", type: "info" },
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
        userId: adminId,
        title: tmpl.title,
        message: tmpl.message
          .replace("{customer}", `${customer.name} ${customer.lastnames}`)
          .replace("{date}", apt.appointmentDate.toLocaleDateString("es-CL"))
          .replace(
            "{time}",
            apt.appointmentDate.toLocaleTimeString("es-CL", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          ),
        type: tmpl.type,
        read: i > 5,
        createdAt,
      },
    });
    notificationsCreated++;
  }

  for (const [idx, p] of lowStockProducts.entries()) {
    const out = p.stock <= 0;
    await prisma.notification.create({
      data: {
        userId: adminId,
        title: out ? `Sin stock: ${p.name}` : `Stock bajo: ${p.name}`,
        message: out
          ? `"${p.name}" se quedó sin unidades. Reponer inventario.`
          : `"${p.name}" tiene solo ${p.stock} unidad(es) (mínimo 5).`,
        type: "warning",
        read: idx > 1,
        createdAt: addDays(now, -idx),
      },
    });
    notificationsCreated++;
  }

  // Algunas notificaciones para empleados
  for (const user of users) {
    for (let i = 0; i < 4; i++) {
      const tmpl = pick(notificationTemplates, i + user.id);
      const customer = pick(customers, i + user.id);
      const apt = pick(appointments, i + user.id);
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: tmpl.title,
          message: tmpl.message
            .replace("{customer}", `${customer.name} ${customer.lastnames}`)
            .replace("{date}", apt.appointmentDate.toLocaleDateString("es-CL"))
            .replace(
              "{time}",
              apt.appointmentDate.toLocaleTimeString("es-CL", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            ),
          type: tmpl.type,
          read: i > 1,
          createdAt: addDays(now, -(i % 5)),
        },
      });
      notificationsCreated++;
    }
  }

  const paymentsCount = await prisma.payment.count();

  // Tareas de ejemplo para el Kanban
  await prisma.task.deleteMany();
  const staffPool = [{ id: adminId }, ...users];
  const sampleTasks = [
    {
      title: "Reponer shampoo y acondicionador",
      description: "Estación 2 y 3 — stock bajo detectado.",
      status: "todo" as const,
      priority: "high" as const,
      assigneeId: staffPool[1]?.id ?? adminId,
      dueDate: addDays(now, 0),
      sortOrder: 1,
    },
    {
      title: "Confirmar turnos de mañana",
      description: "Llamar a clientes con turno entre 09:00 y 12:00.",
      status: "todo" as const,
      priority: "medium" as const,
      assigneeId: adminId,
      dueDate: addDays(now, 0),
      sortOrder: 2,
    },
    {
      title: "Limpiar esterilizadora",
      description: "Protocolo de higiene semanal.",
      status: "todo" as const,
      priority: "low" as const,
      assigneeId: staffPool[2]?.id ?? null,
      dueDate: addDays(now, 2),
      sortOrder: 3,
    },
    {
      title: "Actualizar lista de precios en vitrina",
      description: "Incluir nuevos servicios de coloración.",
      status: "in_progress" as const,
      priority: "medium" as const,
      assigneeId: adminId,
      dueDate: addDays(now, 1),
      sortOrder: 1,
    },
    {
      title: "Pedir guantes y toallas",
      description: "Proveedor habitual — pedido quincenal.",
      status: "in_progress" as const,
      priority: "high" as const,
      assigneeId: staffPool[1]?.id ?? adminId,
      dueDate: addDays(now, 0),
      sortOrder: 2,
    },
    {
      title: "Publicar promo del fin de semana",
      description: "Instagram + WhatsApp Business.",
      status: "done" as const,
      priority: "medium" as const,
      assigneeId: staffPool[3]?.id ?? adminId,
      dueDate: addDays(now, -1),
      sortOrder: 1,
    },
    {
      title: "Capacitación de corte fade",
      description: "Sesión interna con el equipo.",
      status: "done" as const,
      priority: "low" as const,
      assigneeId: adminId,
      dueDate: addDays(now, -3),
      sortOrder: 2,
    },
  ];

  for (const task of sampleTasks) {
    await prisma.task.create({ data: task });
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
  const futureCount = appointments.filter((a) => a.appointmentDate > now).length;
  const statusCounts = appointments.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log("Datos de prueba insertados correctamente:");
  console.log(`  - 1 admin + ${users.length} empleados`);
  console.log(`  - ${customers.length} clientes`);
  console.log(`  - ${services.length} servicios`);
  console.log(`  - ${categories.length} categorías`);
  console.log(`  - ${products.length} productos (${lowStockProducts.length} con stock bajo/cero)`);
  console.log(`  - ${appointments.length} turnos (refrescados)`);
  console.log(`      · hoy: ${todayCount}`);
  console.log(`      · últimos 7 días: ${weekCount}`);
  console.log(`      · mes en curso: ${monthCount}`);
  console.log(`      · futuros: ${futureCount}`);
  console.log(`      · estados: ${JSON.stringify(statusCounts)}`);
  console.log(`  - ${paymentsCount} pagos registrados`);
  console.log(`  - ${sampleTasks.length} tareas (Kanban)`);
  console.log(`  - ${notificationsCreated} notificaciones`);
  console.log(`  - entitlement: subscribed=true, maintenance=false`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
