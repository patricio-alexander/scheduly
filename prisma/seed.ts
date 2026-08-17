import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import type { AppointmentStatus, PaymentMethod, Prisma } from "@/generated/prisma/client";
import { hashPassword } from "../shared/utils/password";
import { calcAppointmentCommission } from "../shared/utils/commissions";

const TARGET_APPOINTMENTS_MIN = 120;
const TARGET_APPOINTMENTS_MAX = 140;
const TODAY_APPOINTMENTS_MIN = 12;
const TODAY_APPOINTMENTS_MAX = 20;
const LOCALE = "es-EC";

const STAFF_PER_BRANCH = 5;

/** ─── Datos demo: Estudio Norte · salón de estilistas · Quito, Ecuador ─── */
const DEMO = {
  business: {
    businessName: "Estudio Norte",
    address: "Av. Amazonas N34-451 y Av. República, Quito, Pichincha",
    accentColor: "#7DFF7A",
    successColor: "#5FD46A",
    warningColor: "#F0B429",
    dangerColor: "#F04438",
  },
  admin: {
    username: "admin",
    name: "Roberto Mendoza",
    email: "roberto.mendoza@estudionorte.ec",
    phone: "0991234567",
    bio: "Dueño y owner central del negocio.",
  },
  branchAdmins: [
    {
      username: "admin_cumbaya",
      name: "Patricia Vásquez",
      email: "patricia.vasquez@estudionorte.ec",
      phone: "0988112200",
      bio: "Encargado sucursal Cumbayá",
      branchCode: "cumbaya",
    },
    {
      username: "admin_carolina",
      name: "Miguel Sandoval",
      email: "miguel.sandoval@estudionorte.ec",
      phone: "0988223300",
      bio: "Encargado sucursal La Carolina",
      branchCode: "carolina",
    },
    {
      username: "admin_centro",
      name: "Gabriela Morales",
      email: "gabriela.morales@estudionorte.ec",
      phone: "0988334400",
      bio: "Encargado sucursal Centro",
      branchCode: "centro",
    },
    {
      username: "admin_valle",
      name: "Hernán Castillo",
      email: "hernan.castillo@estudionorte.ec",
      phone: "0988445500",
      bio: "Encargado sucursal Valle",
      branchCode: "valle",
    },
  ],
  staff: [
    // Cumbayá
    {
      username: "jperez",
      name: "Juan Pérez",
      email: "juan.perez@estudionorte.ec",
      role: "employee" as const,
      phone: "0987123456",
      bio: "Estilista senior. Especialista en cortes clásicos y acabados.",
    },
    {
      username: "mgarcia",
      name: "María García",
      email: "maria.garcia@estudionorte.ec",
      role: "employee" as const,
      phone: "0998765432",
      bio: "Estilista colorista. Mechas, balayage y tratamientos.",
    },
    {
      username: "crojas",
      name: "Camila Rojas",
      email: "camila.rojas@estudionorte.ec",
      role: "employee" as const,
      phone: "0976543210",
      bio: "Estilista junior. Peinados, blowout y cortes femeninos.",
    },
    {
      username: "flopez",
      name: "Felipe López",
      email: "felipe.lopez@estudionorte.ec",
      role: "employee" as const,
      phone: "0965432109",
      bio: "Estilista y recepción. Atiende combos y venta de productos.",
    },
    {
      username: "amunoz",
      name: "Andrés Muñoz",
      email: "andres.munoz@estudionorte.ec",
      role: "employee" as const,
      phone: "0988112233",
      bio: "Estilista en Cumbayá. Especialista en degradados y diseño.",
    },
    // La Carolina
    {
      username: "dsalinas",
      name: "Diego Salinas",
      email: "diego.salinas@estudionorte.ec",
      role: "employee" as const,
      phone: "0987223344",
      bio: "Estilista en La Carolina. Cortes modernos y blowout premium.",
    },
    {
      username: "pherrera",
      name: "Paola Herrera",
      email: "paola.herrera@estudionorte.ec",
      role: "employee" as const,
      phone: "0987334455",
      bio: "Estilista en La Carolina. Coloración y tratamientos.",
    },
    {
      username: "rvelez",
      name: "Ricardo Vélez",
      email: "ricardo.velez@estudionorte.ec",
      role: "employee" as const,
      phone: "0987445566",
      bio: "Estilista en La Carolina. Atiende walk-ins y citas online.",
    },
    {
      username: "nortiz",
      name: "Natalia Ortiz",
      email: "natalia.ortiz@estudionorte.ec",
      role: "employee" as const,
      phone: "0987556677",
      bio: "Estilista en La Carolina. Peinados y alisados.",
    },
    {
      username: "mespinosa",
      name: "Marco Espinosa",
      email: "marco.espinosa@estudionorte.ec",
      role: "employee" as const,
      phone: "0987667788",
      bio: "Estilista en La Carolina. Combos corte + blowout.",
    },
    // Centro
    {
      username: "lfernandez",
      name: "Lucía Fernández",
      email: "lucia.fernandez@estudionorte.ec",
      role: "employee" as const,
      phone: "0987778899",
      bio: "Estilista en Centro. Mechas y corte femenino.",
    },
    {
      username: "pcastillo",
      name: "Pablo Castillo",
      email: "pablo.castillo@estudionorte.ec",
      role: "employee" as const,
      phone: "0987889900",
      bio: "Estilista en Centro. Cortes ejecutivos y peinado.",
    },
    {
      username: "erivas",
      name: "Elena Rivas",
      email: "elena.rivas@estudionorte.ec",
      role: "employee" as const,
      phone: "0987990011",
      bio: "Estilista en Centro. Tratamientos capilares.",
    },
    {
      username: "jtamayo",
      name: "Jorge Tamayo",
      email: "jorge.tamayo@estudionorte.ec",
      role: "employee" as const,
      phone: "0988001122",
      bio: "Estilista en Centro. Especialista en color y acabados.",
    },
    {
      username: "facosta",
      name: "Fernanda Acosta",
      email: "fernanda.acosta@estudionorte.ec",
      role: "employee" as const,
      phone: "0988112234",
      bio: "Estilista en Centro. Blowout y peinados de evento.",
    },
    // Valle
    {
      username: "snunez",
      name: "Sebastián Núñez",
      email: "sebastian.nunez@estudionorte.ec",
      role: "employee" as const,
      phone: "0988223345",
      bio: "Estilista en Valle. Cortes clásicos y infantiles.",
    },
    {
      username: "vparedes",
      name: "Valeria Paredes",
      email: "valeria.paredes@estudionorte.ec",
      role: "employee" as const,
      phone: "0988334456",
      bio: "Estilista en Valle. Color y cuidado capilar.",
    },
    {
      username: "cduarte",
      name: "Cristian Duarte",
      email: "cristian.duarte@estudionorte.ec",
      role: "employee" as const,
      phone: "0988445567",
      bio: "Estilista en Valle. Degradados y diseño con navaja.",
    },
    {
      username: "dmolina",
      name: "Daniela Molina",
      email: "daniela.molina@estudionorte.ec",
      role: "employee" as const,
      phone: "0988556678",
      bio: "Estilista en Valle. Cortes y peinados.",
    },
    {
      username: "rovega",
      name: "Roberto Vega",
      email: "roberto.vega@estudionorte.ec",
      role: "employee" as const,
      phone: "0988667789",
      bio: "Estilista en Valle. Combos y venta de productos retail.",
    },
  ],
  customers: [
    { name: "María Fernanda", lastnames: "López Mendoza", phone: "0987654321", email: "maria.lopez@gmail.com" },
    { name: "Carlos Andrés", lastnames: "Vega Torres", phone: "0992345678", email: "carlos.vega@hotmail.com" },
    { name: "Pedro Javier", lastnames: "Ramírez Soto", phone: "0976543210", email: "pedro.ramirez@yahoo.com" },
    { name: "Laura Patricia", lastnames: "Torres Medina", phone: "0965432109", email: "laura.torres@gmail.com" },
    { name: "Diego Alejandro", lastnames: "Herrera Castro", phone: "0954321098", email: "diego.herrera@outlook.com" },
    { name: "Sofía Isabel", lastnames: "Reyes Vega", phone: "0943210987", email: "sofia.reyes@gmail.com" },
    { name: "Matías Sebastián", lastnames: "Ortiz Flores", phone: "0932109876", email: "matias.ortiz@hotmail.com" },
    { name: "Valentina", lastnames: "Morales Ruiz", phone: "0921098765", email: "valentina.morales@gmail.com" },
    { name: "Javiera", lastnames: "Silva Paredes", phone: "0910987654", email: "javiera.silva@icloud.com" },
    { name: "Tomás", lastnames: "Navarro Díaz", phone: "0990123456", email: "tomas.navarro@gmail.com" },
    { name: "Isidora", lastnames: "Campos Aguirre", phone: "0989012345", email: "isidora.campos@hotmail.com" },
    { name: "Benjamín", lastnames: "Vargas Núñez", phone: "0978901234", email: "benjamin.vargas@gmail.com" },
    { name: "Catalina", lastnames: "Méndez Soto", phone: "0967890123", email: "catalina.mendez@outlook.com" },
    { name: "Nicolás", lastnames: "Pizarro Leiva", phone: "0956789012", email: "nicolas.pizarro@gmail.com" },
    { name: "Francisca", lastnames: "Araya Contreras", phone: "0945678901", email: "francisca.araya@hotmail.com" },
    { name: "Sebastián", lastnames: "Bravo Fuentes", phone: "0934567890", email: "sebastian.bravo@gmail.com" },
    { name: "Antonia", lastnames: "Espinoza Riquelme", phone: "0923456789", email: "antonia.espinoza@yahoo.com" },
    { name: "Ignacio", lastnames: "Salazar Moya", phone: "0912345678", email: "ignacio.salazar@gmail.com" },
    { name: "Emilia", lastnames: "Cortés Valdés", phone: "0998761234", email: "emilia.cortes@hotmail.com" },
    { name: "Maximiliano", lastnames: "Henríquez Lagos", phone: "0987651234", email: "maximiliano.henriquez@gmail.com" },
    { name: "Constanza", lastnames: "Figueroa Palma", phone: "0976541234", email: "constanza.figueroa@outlook.com" },
    { name: "Vicente", lastnames: "Gutiérrez Arancibia", phone: "0965431234", email: "vicente.gutierrez@gmail.com" },
    { name: "Andrea", lastnames: "Cevallos Ponce", phone: "0954329876", email: "andrea.cevallos@gmail.com" },
    { name: "Gabriel", lastnames: "Alarcón Vera", phone: "0943218765", email: "gabriel.alarcon@hotmail.com" },
    { name: "Daniela", lastnames: "Pulla Chiriboga", phone: "0932107654", email: "daniela.pulla@outlook.com" },
  ],
  services: [
    { name: "Corte de cabello", price: 12, durationMinutes: 30, commissionPct: 40 },
    { name: "Corte infantil", price: 8, durationMinutes: 25, commissionPct: 40 },
    { name: "Brushing y acabado", price: 6, durationMinutes: 20, commissionPct: 45 },
    { name: "Tinte completo", price: 45, durationMinutes: 90, commissionPct: 30 },
    { name: "Mechas balayage", price: 65, durationMinutes: 120, commissionPct: 28 },
    { name: "Lavado + Blowout", price: 15, durationMinutes: 45, commissionPct: 35 },
    { name: "Tratamiento capilar", price: 25, durationMinutes: 60, commissionPct: 32 },
    { name: "Peinado para eventos", price: 30, durationMinutes: 60, commissionPct: 38 },
    { name: "Corte + Blowout (combo)", price: 18, durationMinutes: 45, commissionPct: 38 },
    { name: "Alisado permanente", price: 80, durationMinutes: 150, commissionPct: 25 },
    { name: "Retoque de raíz", price: 28, durationMinutes: 60, commissionPct: 30 },
    { name: "Hidratación profunda", price: 22, durationMinutes: 50, commissionPct: 32 },
    { name: "Perfilado de cejas", price: 5, durationMinutes: 15, commissionPct: 50 },
    { name: "Depilación facial", price: 6, durationMinutes: 20, commissionPct: 50 },
  ],
  categories: [
    { name: "Cuidado capilar", description: "Shampoos, acondicionadores y tratamientos" },
    { name: "Styling profesional", description: "Serums, ceras modeladoras y kits de acabado" },
    { name: "Peinado y fijación", description: "Geles, sprays y peines" },
    { name: "Coloración", description: "Tintes y productos de color" },
    { name: "Accesorios", description: "Cepillos y herramientas de venta" },
  ],
  products: [
    { name: "Shampoo profesional", price: 12, stock: 45, category: "Cuidado capilar" },
    { name: "Acondicionador reparador", price: 14, stock: 38, category: "Cuidado capilar" },
    { name: "Cera modeladora", price: 9.5, stock: 22, category: "Styling profesional" },
    { name: "Gel fijador", price: 8, stock: 15, category: "Peinado y fijación" },
    { name: "Mascarilla capilar", price: 18, stock: 8, category: "Cuidado capilar" },
    { name: "Serum reparador", price: 11, stock: 30, category: "Styling profesional" },
    { name: "Spray termoprotector", price: 13.5, stock: 3, category: "Peinado y fijación" },
    { name: "Tinte retail", price: 22, stock: 12, category: "Coloración" },
    { name: "Ampolla reparadora", price: 6.5, stock: 55, category: "Cuidado capilar" },
    { name: "Cepillo desenredante", price: 15.9, stock: 18, category: "Accesorios" },
    { name: "Tónico anticaída", price: 17.5, stock: 5, category: "Cuidado capilar" },
    { name: "Kit styling (serum + peine)", price: 24.9, stock: 2, category: "Styling profesional" },
    { name: "Cera mate texturizante", price: 9.9, stock: 0, category: "Peinado y fijación" },
    { name: "Serum puntas abiertas", price: 14.5, stock: 4, category: "Cuidado capilar" },
  ],
  suppliers: [
    {
      name: "Distribelle Ecuador",
      phone: "022345678",
      email: "ventas@distribelle.ec",
      taxId: "1790123456001",
      address: "Av. 6 de Diciembre, Quito",
    },
    {
      name: "Beauty Supply EC",
      phone: "023987654",
      email: "pedidos@beautysupply.ec",
      taxId: "1790987654001",
      address: "Cumbayá, Quito",
    },
  ],
  appointmentTemplates: [
    { title: "Corte de cabello", description: "Degradado bajo con perfilado en nuca.", serviceNames: ["Corte de cabello"] },
    { title: "Corte y blowout", description: "Corte clásico + brushing y acabado con plancha.", serviceNames: ["Corte + Blowout (combo)"] },
    { title: "Tinte completo", description: "Tinte castaño oscuro con gloss final.", serviceNames: ["Tinte completo"] },
    { title: "Mechas balayage", description: "Balayage rubio ceniza en medios y puntas.", serviceNames: ["Mechas balayage"] },
    { title: "Tratamiento capilar", description: "Hidratación profunda con keratina.", serviceNames: ["Tratamiento capilar", "Lavado + Blowout"] },
    { title: "Peinado matrimonio", description: "Peinado recogido con ondas suaves.", serviceNames: ["Peinado para eventos"] },
    { title: "Corte infantil", description: "Corte para niño, degrafilado.", serviceNames: ["Corte infantil"] },
    { title: "Lavado y secado", description: "Lavado profesional y blowout.", serviceNames: ["Lavado + Blowout"] },
    { title: "Alisado", description: "Alisado permanente con queratina.", serviceNames: ["Alisado permanente"] },
    { title: "Retoque de color", description: "Retoque de raíz y matización.", serviceNames: ["Retoque de raíz"] },
    { title: "Brushing y acabado", description: "Brushing express y serum hidratante.", serviceNames: ["Brushing y acabado"] },
    { title: "Combo premium", description: "Corte, blowout e hidratación capilar.", serviceNames: ["Corte + Blowout (combo)", "Hidratación profunda"] },
    { title: "Corte + productos", description: "Corte con venta de cera modeladora y serum.", serviceNames: ["Corte de cabello"], productNames: ["Cera modeladora"] },
    { title: "Color + tratamiento", description: "Retoque de raíz con mascarilla reparadora.", serviceNames: ["Retoque de raíz", "Hidratación profunda"] },
  ],
  /** Turnos visibles en «Mi día» (hoy + próximos 7 días) por empleado */
  employeeMyDay: [
    { dayOffset: 0, hour: 9, minute: 0, status: "completed" as const, templateIndex: 0, customerIndex: 0 },
    { dayOffset: 0, hour: 10, minute: 30, status: "completed" as const, templateIndex: 1, customerIndex: 1 },
    { dayOffset: 0, hour: 11, minute: 30, status: "completed" as const, templateIndex: 2, customerIndex: 2 },
    { dayOffset: 0, hour: 14, minute: 0, status: "scheduled" as const, templateIndex: 3, customerIndex: 3 },
    { dayOffset: 0, hour: 16, minute: 30, status: "scheduled" as const, templateIndex: 4, customerIndex: 4 },
    { dayOffset: 1, hour: 10, minute: 0, status: "scheduled" as const, templateIndex: 5, customerIndex: 5 },
    { dayOffset: 2, hour: 11, minute: 30, status: "paid_pending" as const, templateIndex: 6, customerIndex: 6 },
    { dayOffset: 4, hour: 15, minute: 0, status: "scheduled" as const, templateIndex: 7, customerIndex: 7 },
  ],
  paymentNotes: {
    cash: ["Pago en efectivo", "Cliente pagó en caja", ""],
    card: ["Datafast · Visa", "Datafast · Mastercard", "Débito aprobado"],
    transfer: ["Transferencia Banco Pichincha", "Depósito Produbanco confirmado", "Transferencia Deuna"],
  },
  tasks: [
    { title: "Reponer shampoo y acondicionador", description: "Estación 2 y 3 — stock bajo detectado.", status: "todo" as const, priority: "high" as const, assigneeIndex: 1, dueDays: 0, sortOrder: 1 },
    { title: "Confirmar turnos de mañana", description: "WhatsApp a clientes entre 09:00 y 12:00.", status: "todo" as const, priority: "medium" as const, assigneeIndex: 0, dueDays: 0, sortOrder: 2 },
    { title: "Limpiar esterilizadora", description: "Protocolo de higiene semanal.", status: "todo" as const, priority: "low" as const, assigneeIndex: 2, dueDays: 2, sortOrder: 3 },
    { title: "Actualizar precios en vitrina", description: "Incluir combo corte + blowout a $18.", status: "in_progress" as const, priority: "medium" as const, assigneeIndex: 0, dueDays: 1, sortOrder: 1 },
    { title: "Pedir guantes y toallas", description: "Proveedor Distribelle — pedido quincenal.", status: "in_progress" as const, priority: "high" as const, assigneeIndex: 1, dueDays: 0, sortOrder: 2 },
    { title: "Publicar promo fin de semana", description: "Instagram + WhatsApp Business.", status: "done" as const, priority: "medium" as const, assigneeIndex: 3, dueDays: -1, sortOrder: 1 },
    { title: "Capacitación técnicas de color", description: "Sesión interna con Juan Pérez.", status: "done" as const, priority: "low" as const, assigneeIndex: 0, dueDays: -3, sortOrder: 2 },
  ],
} as const;

async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter });

  const adminPassword = await hashPassword("123456");

  const admin = await prisma.user.upsert({
    where: { username: DEMO.admin.username },
    update: {
      password: adminPassword,
      name: DEMO.admin.name,
      email: DEMO.admin.email,
      phone: DEMO.admin.phone,
      bio: DEMO.admin.bio,
      role: "owner",
    },
    create: {
      username: DEMO.admin.username,
      name: DEMO.admin.name,
      email: DEMO.admin.email,
      password: adminPassword,
      role: "owner",
      phone: DEMO.admin.phone,
      bio: DEMO.admin.bio,
    },
  });

  console.log("Owner user created:", admin.username);

  for (const roleName of ["owner", "admin", "employee"] as const) {
    const existing = await prisma.role.findFirst({ where: { name: roleName } });
    if (!existing) {
      await prisma.role.create({ data: { name: roleName } });
    }
  }
  console.log("System roles ensured: owner, admin, employee");

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

  await prisma.payment.create({
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
  users: Array<{ id: number }>,
  customers: Array<{ id: number; name: string; lastnames: string }>,
  services: SeedService[],
  products: Array<{ id: number; name: string; price: number }>,
  branches: Array<{ id: number }>,
  appointmentTemplates: AppointmentTemplate[],
) {
  let paymentIndex = 5000;

  for (let employeeIndex = 0; employeeIndex < users.length; employeeIndex++) {
    const user = users[employeeIndex];
    const branch = branches[Math.floor(employeeIndex / STAFF_PER_BRANCH)] ?? branches[0];

    for (let planIndex = 0; planIndex < DEMO.employeeMyDay.length; planIndex++) {
      const plan = DEMO.employeeMyDay[planIndex];
      const template =
        appointmentTemplates[
          (plan.templateIndex + employeeIndex) % appointmentTemplates.length
        ];
      const customer =
        customers[(plan.customerIndex + employeeIndex + planIndex) % customers.length];
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
          userId: user.id,
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
        await prisma.appointmentsServices.create({
          data: { appointmentId: apt.id, serviceId: svc.id },
        });
      }

      const productLines: Array<{ price: number; quantity: number }> = [];
      for (const productName of template.productNames ?? []) {
        const product = products.find((p) => p.name === productName);
        if (!product) continue;
        productLines.push({ price: product.price, quantity: 1 });
        await prisma.appointmentsProducts.create({
          data: { appointmentId: apt.id, productId: product.id, quantity: 1 },
        });
      }

      if (plan.status === "completed") {
        await registerCompletedAppointmentPayment(prisma, {
          appointmentId: apt.id,
          userId: user.id,
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
              key: "/panel",
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
            {
              id: 4,
              key: "/administracion/sucursales",
              name: "Sucursales",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 5,
              key: "/finanzas/centro",
              name: "Centro financiero",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 7,
              key: "/finanzas/sueldos",
              name: "Sueldos",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 6,
              key: "/finanzas/gastos",
              name: "Gastos",
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
            {
              id: 4,
              key: "/operacion/promociones",
              name: "Promociones",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 6,
              key: "/operacion/fidelizacion",
              name: "Fidelización",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 5,
              key: "/empleado/mi-dia",
              name: "Mi día",
              status: "active",
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
              id: 5,
              key: "/ventas/registrar-venta",
              name: "Registrar venta",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 1,
              key: "/ventas/historial",
              name: "Ingresos por turnos",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 2,
              key: "/ventas/productos-vendidos",
              name: "Productos vendidos",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 3,
              key: "/ventas/clientes",
              name: "Clientes",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 5,
              key: "/novedades",
              name: "Novedades cliente",
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
            {
              id: 4,
              key: "/inventario/multistock",
              name: "Multistock",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
          ],
        },
        {
          id: 7,
          name: "Compras",
          key: "purchases",
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
              key: "/compras/registrar",
              name: "Registrar compra",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 2,
              key: "/compras/historial",
              name: "Historial de compras",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
            {
              id: 3,
              key: "/compras/proveedores",
              name: "Proveedores",
              status: "active",
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
              key: "/comprobantes-electronicos/emitidos",
              name: "Emitidos",
              status: "active",
              max_records_limit: null,
              usage_count: 0,
              capabilities: [],
            },
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
          { id: 1, key: "dashboard", name: "Dashboard", is_trial: false },
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
          { id: 1, key: "dashboard", name: "Dashboard", is_trial: false },
          { id: 2, key: "operacion", name: "Operación", is_trial: false },
          { id: 3, key: "ventas", name: "Ventas", is_trial: false },
          { id: 4, key: "inventario", name: "Inventario", is_trial: false },
          { id: 5, key: "admin", name: "Administración", is_trial: false },
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

function appointmentsForDay(dayOffset: number, now: Date, base: number): number {
  const day = addDays(startOfDay(now), dayOffset);
  return Math.max(1, Math.round(base * dayLoadFactor(day)));
}

function pickPaymentMethod(index: number): PaymentMethod {
  const roll = index % 20;
  if (roll < 10) return "cash";
  if (roll < 17) return "card";
  return "transfer";
}

function pickPaymentNote(method: PaymentMethod, index: number): string {
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
  await prisma.commissionRecord.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.appointmentsProducts.deleteMany({});
  await prisma.appointmentsServices.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.notification.deleteMany({});
}

async function seedBusinessSettings(prisma: PrismaClient) {
  await prisma.businessSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...DEMO.business, logoPath: null },
    update: { ...DEMO.business },
  });

  await prisma.sriSettings.upsert({
    where: { id: 1 },
    create: { id: 1, environment: "pruebas" },
    update: { environment: "pruebas" },
  });
}

async function seedUserRoles(
  prisma: PrismaClient,
  users: Array<{ id: number; role: string }>,
) {
  const roles = await prisma.role.findMany();
  const roleByName = Object.fromEntries(roles.map((r) => [r.name, r.id]));

  for (const user of users) {
    const roleId = roleByName[user.role];
    if (!roleId) continue;
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId } },
      create: { userId: user.id, roleId },
      update: {},
    });
  }
}

async function seedTestData(prisma: PrismaClient, adminId: number) {
  const password = await hashPassword("123456");
  const now = new Date();

  await seedBusinessSettings(prisma);

  const usersData = DEMO.staff.map((s) => ({
    ...s,
    password,
    photo: null as string | null,
  }));

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

  const branchAdminUsers = await Promise.all(
    DEMO.branchAdmins.map((adminUser) =>
      prisma.user.upsert({
        where: { username: adminUser.username },
        update: {
          name: adminUser.name,
          email: adminUser.email,
          password,
          role: "admin",
          phone: adminUser.phone,
          bio: adminUser.bio,
        },
        create: {
          username: adminUser.username,
          name: adminUser.name,
          email: adminUser.email,
          password,
          role: "admin",
          phone: adminUser.phone,
          bio: adminUser.bio,
        },
      }),
    ),
  );

  await seedUserRoles(prisma, [
    { id: adminId, role: "owner" },
    ...branchAdminUsers.map((u) => ({ id: u.id, role: "admin" as const })),
    ...users.map((u) => ({ id: u.id, role: u.role })),
  ]);

  const customersData = [...DEMO.customers];

  console.log("Refrescando turnos, pagos, notificaciones y clientes...");
  await refreshOperationalData(prisma);
  await prisma.customer.deleteMany({});

  const customers = await Promise.all(
    customersData.map((c) => prisma.customer.create({ data: c })),
  );

  const demoCustomerPassword = await hashPassword("123456");
  await prisma.customer.update({
    where: { id: customers[0].id },
    data: { password: demoCustomerPassword },
  });
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
    const existing = await prisma.service.findFirst({ where: { name: s.name } });
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
  const productsData = [...DEMO.products];

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

  const branchSeeds = [
    { name: "Estudio Norte · Cumbayá", code: "cumbaya", address: "Av. Interoceánica, Cumbayá", phone: "023987100", sortOrder: 1, isMain: false },
    { name: "Estudio Norte · La Carolina", code: "carolina", address: "Av. República, La Carolina", phone: "022456789", sortOrder: 2, isMain: false },
    { name: "Estudio Norte · Centro", code: "centro", address: "Av. Amazonas N34-451, Centro", phone: "022345678", sortOrder: 3, isMain: true },
    { name: "Estudio Norte · Valle", code: "valle", address: "Av. Diego de Almagro, Valle de los Chillos", phone: "023876543", sortOrder: 4, isMain: false },
  ];

  const branches: Array<{ id: number; name: string; code: string; isMain: boolean }> = [];
  for (const b of branchSeeds) {
    const existing = await prisma.branch.findUnique({ where: { code: b.code } });
    if (existing) {
      branches.push(await prisma.branch.update({ where: { id: existing.id }, data: b }));
    } else {
      branches.push(await prisma.branch.create({ data: b }));
    }
  }

  await prisma.branch.updateMany({
    where: { code: { not: "centro" } },
    data: { isMain: false },
  });
  const mainBranch =
    branches.find((b) => b.code === "centro") ??
    branches.find((b) => b.isMain) ??
    branches[0];

  await prisma.userBranch.deleteMany();
  await prisma.userBranch.create({
    data: { userId: adminId, branchId: mainBranch.id, isPrimary: true },
  });

  for (const branchAdmin of branchAdminUsers) {
    const seed = DEMO.branchAdmins.find((a) => a.username === branchAdmin.username);
    const branch = branches.find((b) => b.code === seed?.branchCode);
    if (!branch) continue;
    await prisma.userBranch.create({
      data: { userId: branchAdmin.id, branchId: branch.id, isPrimary: true },
    });
  }

  for (let branchIndex = 0; branchIndex < branches.length; branchIndex++) {
    const branch = branches[branchIndex];
    for (let slot = 0; slot < STAFF_PER_BRANCH; slot++) {
      const user = users[branchIndex * STAFF_PER_BRANCH + slot];
      if (!user) continue;
      await prisma.userBranch.create({
        data: { userId: user.id, branchId: branch.id, isPrimary: true },
      });
    }
  }

  for (const product of products) {
    for (const branch of branches) {
      const portion = Math.max(0, Math.floor(product.stock / branches.length));
      await prisma.branchStock.upsert({
        where: { branchId_productId: { branchId: branch.id, productId: product.id } },
        create: { branchId: branch.id, productId: product.id, stock: portion, minStock: 5 },
        update: { stock: portion },
      });
    }
  }

  for (const service of services) {
    for (const branch of branches) {
      await prisma.serviceBranch.upsert({
        where: { serviceId_branchId: { serviceId: service.id, branchId: branch.id } },
        create: { serviceId: service.id, branchId: branch.id, isActive: true },
        update: { isActive: true },
      });
    }
  }

  await prisma.expense.deleteMany();
  await prisma.expenseCategory.deleteMany();
  const expenseCategories = await Promise.all(
    [
      { name: "Insumos", type: "supplies" },
      { name: "Alquiler", type: "rent" },
      { name: "Servicios básicos", type: "utilities" },
      { name: "Otros", type: "other" },
    ].map((c) => prisma.expenseCategory.create({ data: c })),
  );

  await prisma.expense.createMany({
    data: [
      { branchId: branches[0].id, categoryId: expenseCategories[0].id, userId: adminId, amount: 120, description: "Reposición insumos Cumbayá", method: "transfer" },
      { branchId: branches[1].id, categoryId: expenseCategories[1].id, userId: adminId, amount: 850, description: "Alquiler La Carolina", method: "transfer" },
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
    products.find((p) => p.name.toLowerCase().includes("shampoo")) ?? products[0];
  const blowoutService =
    services.find((s) => s.name.toLowerCase().includes("blowout")) ?? services[1];

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
      description: "Brushing y acabado 2x1 todos los martes en sucursales participantes",
      discountPct: 50,
      comboLabel: "2x1",
      startsAt: addDays(now, -14),
      endsAt: addDays(now, 45),
      serviceIds: services.filter((s) => s.name.toLowerCase().includes("blowout")).map((s) => s.id),
      branchIds: branches.map((b) => b.id),
    },
  });

  await prisma.feedPost.deleteMany();
  await prisma.feedPost.createMany({
    data: [
      { title: "Promo verano", body: "Hasta 20% en tratamientos capilares durante febrero.", type: "promotion", sortOrder: 1 },
      { title: "Nuevo servicio", body: "Ya disponible: alisado permanente en todas las sucursales.", type: "service", sortOrder: 2 },
      { title: "Canjea tus puntos", body: "Revisa premios disponibles en tu perfil de fidelización.", type: "reward", sortOrder: 3 },
    ],
  });

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

  type AppointmentTemplate = {
    title: string;
    description: string;
    serviceNames: readonly string[];
    productNames?: readonly string[];
  };

  const appointmentTemplates: AppointmentTemplate[] = DEMO.appointmentTemplates.map(
    (t) => ({ ...t }),
  );
  const plans = buildAppointmentPlans(now);
  const appointments: Array<{ id: number; appointmentDate: Date; status: AppointmentStatus }> = [];

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const template = pick(appointmentTemplates, i);
    const customer = pick(customers, i);
    const user = pick(users, i);
    const appointmentDate = atTime(addDays(startOfDay(now), plan.dayOffset), plan.hour, plan.minute);
    const status = plan.status;

    const branch = branches[i % branches.length];
    const apt = await prisma.appointment.create({
      data: {
        title: template.title,
        description: template.description,
        customerId: customer.id,
        userId: user.id,
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
      await prisma.appointmentsServices
        .create({ data: { appointmentId: apt.id, serviceId: svc.id } })
        .catch(() => {});
    }

    const productLines: Array<{ productId: number; price: number; quantity: number }> = [];

    const templateProducts = template.productNames ?? [];
    for (const productName of templateProducts) {
      const product = products.find((p) => p.name === productName);
      if (!product) continue;
      const quantity = 1;
      productLines.push({ productId: product.id, price: product.price, quantity });
      await prisma.appointmentsProducts
        .create({ data: { appointmentId: apt.id, productId: product.id, quantity } })
        .catch(() => {});
    }

    if (templateProducts.length === 0 && i % 2 === 0) {
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

    if (status === "completed") {
      await registerCompletedAppointmentPayment(prisma, {
        appointmentId: apt.id,
        userId: user.id,
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
          .replace("{date}", apt.appointmentDate.toLocaleDateString(LOCALE))
          .replace(
            "{time}",
            apt.appointmentDate.toLocaleTimeString(LOCALE, {
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
            .replace("{date}", apt.appointmentDate.toLocaleDateString(LOCALE))
            .replace(
              "{time}",
              apt.appointmentDate.toLocaleTimeString(LOCALE, {
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

  // Proveedores y compras de ejemplo
  await prisma.purchaseLine.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.supplier.deleteMany();

  const suppliers: Array<{ id: number; name: string }> = [];
  for (const s of DEMO.suppliers) {
    suppliers.push(await prisma.supplier.create({ data: s }));
  }

  const productByName = Object.fromEntries(products.map((p) => [p.name, p]));
  const shampoo = productByName["Shampoo profesional"];
  const gel = productByName["Gel fijador"];
  const cera = productByName["Cera modeladora"];

  if (suppliers[0] && shampoo && gel) {
    await prisma.purchase.create({
      data: {
        supplierId: suppliers[0].id,
        userId: adminId,
        purchasedAt: addDays(now, -5),
        notes: "Factura #1042 · reposición mensual",
        totalAmount: shampoo.price * 10 + gel.price * 8,
        method: "transfer",
        lines: {
          create: [
            { productId: shampoo.id, quantity: 10, unitCost: 7.2 },
            { productId: gel.id, quantity: 8, unitCost: 4.5 },
          ],
        },
      },
    });
  }

  if (suppliers[1] && cera && productByName["Serum reparador"]) {
    const aceite = productByName["Serum reparador"];
    await prisma.purchase.create({
      data: {
        supplierId: suppliers[1].id,
        userId: adminId,
        purchasedAt: addDays(now, -2),
        notes: "Compra mostrador · efectivo",
        totalAmount: cera.price * 6 + aceite.price * 4,
        method: "cash",
        lines: {
          create: [
            { productId: cera.id, quantity: 6, unitCost: 5.8 },
            { productId: aceite.id, quantity: 4, unitCost: 6.5 },
          ],
        },
      },
    });
  }

  const purchasesCount = await prisma.purchase.count();

  // Tareas de ejemplo para el Kanban
  await prisma.task.deleteMany();
  const staffPool = [{ id: adminId }, ...users];
  const sampleTasks = DEMO.tasks.map((task) => ({
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeId: staffPool[task.assigneeIndex]?.id ?? adminId,
    dueDate: addDays(now, task.dueDays),
    sortOrder: task.sortOrder,
  }));

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
  console.log(`  - ${DEMO.business.businessName} · ${DEMO.business.address}`);
  console.log("  - SRI ambiente pruebas");
  console.log(`  - Owner: ${DEMO.admin.username} / 123456 (${DEMO.admin.email})`);
  console.log(`  - ${branchAdminUsers.length} admins de sucursal (contraseña: 123456)`);
  DEMO.branchAdmins.forEach((a) => {
    console.log(`      · ${a.username} → ${a.branchCode}`);
  });
  console.log(`  - ${users.length} empleados (${STAFF_PER_BRANCH} por sucursal · contraseña: 123456)`);
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
  console.log(`  - ${suppliers.length} proveedores · ${purchasesCount} compras`);
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
