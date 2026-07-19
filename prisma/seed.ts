import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import type { AppointmentStatus, PaymentMethod } from "@/generated/prisma/client";
import { hashPassword } from "../shared/utils/password";

const TARGET_APPOINTMENTS = 90;

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

  await seedTestData(prisma);
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

async function seedTestData(prisma: PrismaClient) {
  const password = await hashPassword("123456");

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
        update: {},
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
      services.push(existing);
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

  const productsData = [
    { name: "Shampoo profesional", price: 12000, stock: 45, category: "Cuidado capilar" },
    { name: "Acondicionador reparador", price: 14000, stock: 38, category: "Cuidado capilar" },
    { name: "Cera para barba", price: 9500, stock: 22, category: "Barba" },
    { name: "Gel fijador", price: 8000, stock: 15, category: "Peinado y fijación" },
    { name: "Mascarilla capilar", price: 18000, stock: 8, category: "Cuidado capilar" },
    { name: "Aceite para barba", price: 11000, stock: 30, category: "Barba" },
    { name: "Spray termoprotector", price: 13500, stock: 4, category: "Peinado y fijación" },
    { name: "Tinte retail", price: 22000, stock: 12, category: "Coloración" },
    { name: "Ampolla reparadora", price: 6500, stock: 55, category: "Cuidado capilar" },
    { name: "Cepillo desenredante", price: 15900, stock: 18, category: "Accesorios" },
    { name: "Tónico anticaída", price: 17500, stock: 10, category: "Cuidado capilar" },
    { name: "Kit barba (aceite + peine)", price: 24900, stock: 7, category: "Barba" },
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

  const existingAppointments = await prisma.appointment.count();

  const subscriptionPayload = {
    maintenance: false,
    subscribed: false,
    subscription: {},
  };

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

  if (existingAppointments >= TARGET_APPOINTMENTS) {
    console.log(`Ya existen ${existingAppointments} turnos. Omitiendo generación masiva.`);
    console.log("Datos de prueba actualizados (catálogo, usuarios y entitlement).");
    return;
  }

  const now = new Date();
  const appointments: Array<{ id: number; appointmentDate: Date; status: AppointmentStatus }> = [];

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

  const statusPlan: AppointmentStatus[] = [
    ...Array(32).fill("completed" as const),
    ...Array(18).fill("scheduled" as const),
    ...Array(10).fill("pending_payment" as const),
    ...Array(8).fill("paid_pending" as const),
    ...Array(8).fill("cancelled" as const),
    ...Array(6).fill("rescheduled" as const),
    ...Array(8).fill("scheduled" as const),
  ];

  const paymentMethods: PaymentMethod[] = ["cash", "card", "transfer"];
  const timeSlots = [
    [9, 0], [9, 30], [10, 0], [10, 30], [11, 0], [11, 30],
    [12, 0], [14, 0], [14, 30], [15, 0], [15, 30], [16, 0],
    [16, 30], [17, 0], [17, 30], [18, 0], [18, 30], [19, 0],
  ];

  const toCreate = TARGET_APPOINTMENTS - existingAppointments;

  for (let i = 0; i < toCreate; i++) {
    const template = pick(appointmentTemplates, i);
    const customer = pick(customers, i);
    const user = pick(users, i);
    const status = pick(statusPlan, i);

    let dayOffset: number;
    if (status === "scheduled" || status === "rescheduled" || status === "paid_pending") {
      dayOffset = 1 + (i % 14);
    } else if (status === "pending_payment") {
      dayOffset = -(i % 3);
    } else {
      dayOffset = -(1 + (i % 55));
    }

    const [hour, minute] = pick(timeSlots, i);
    const appointmentDate = atTime(addDays(now, dayOffset), hour, minute);

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
          paidAt: addDays(appointmentDate, i % 2),
          notes: method === "transfer" ? "Transferencia confirmada" : "",
        },
      });

      if (productLines.length > 0) {
        await prisma.appointment.update({
          where: { id: apt.id },
          data: { stockDeducted: true },
        });
        for (const line of productLines) {
          await prisma.product
            .update({
              where: { id: line.productId },
              data: { stock: { decrement: line.quantity } },
            })
            .catch(() => {});
        }
      }
    }

    appointments.push({ id: apt.id, appointmentDate, status });
  }

  const notificationTemplates = [
    { title: "Nuevo turno agendado", message: "Se agendó un turno para {customer} el {date} a las {time}.", type: "info" },
    { title: "Recordatorio de turno", message: "Mañana a las {time} le toca a {customer}.", type: "warning" },
    { title: "Turno completado", message: "Se cerró el turno de {customer} con pago registrado.", type: "success" },
    { title: "Turno cancelado", message: "Se canceló el turno de {customer} del {date}.", type: "error" },
    { title: "Turno reagendado", message: "{customer} reagendó para el {date} a las {time}.", type: "warning" },
    { title: "Stock bajo", message: "Quedan pocas unidades de productos de venta. Revisar inventario.", type: "warning" },
    { title: "Pago pendiente", message: "El turno de {customer} quedó pendiente de pago.", type: "info" },
    { title: "Cliente frecuente", message: "{customer} reservó nuevamente esta semana.", type: "success" },
  ];

  for (const user of users) {
    for (let i = 0; i < 10; i++) {
      const tmpl = pick(notificationTemplates, i);
      const customer = pick(customers, i);
      const apt = pick(appointments, i);
      const createdAt = addDays(now, -(i % 12));

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
          read: i > 4,
          createdAt,
        },
      });
    }
  }

  const paymentsCount = await prisma.payment.count();

  console.log("Datos de prueba insertados correctamente:");
  console.log(`  - ${users.length} usuarios (empleados)`);
  console.log(`  - ${customers.length} clientes`);
  console.log(`  - ${services.length} servicios`);
  console.log(`  - ${categories.length} categorías`);
  console.log(`  - ${products.length} productos`);
  console.log(`  - ${appointments.length} turnos nuevos (${existingAppointments + appointments.length} total)`);
  console.log(`  - ${paymentsCount} pagos registrados`);
  console.log(`  - ${users.length * 10} notificaciones nuevas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
