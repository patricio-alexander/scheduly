import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter });

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      name: "Administrador",
      email: "admin@scheduly.cl",
      password: "123456",
      role: "admin",
    },
  });

  console.log("Admin user created:", admin.username);

  // Comentar este método si no se desea datos de prueba
  await seedTestData(prisma);
}

async function seedTestData(prisma: PrismaClient) {
  // --- Usuarios de prueba ---
  const usersData = [
    {
      username: "jperez",
      name: "Juan Pérez",
      email: "juan.perez@example.com",
      password: "123456",
      role: "employee",
      phone: "+56 9 1234 5678",
      bio: "Recepcionista principal, encargado de agendar citas.",
      photo: null,
    },
    {
      username: "mgarcia",
      name: "María García",
      email: "maria.garcia@example.com",
      password: "123456",
      role: "employee",
      phone: "+56 9 8765 4321",
      bio: "Asistente administrativa, maneja la agenda de servicios.",
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

  // --- Clientes de prueba ---
  const customersData = [
    {
      name: "Carlos",
      lastnames: "Muñoz López",
      phone: "+56 9 1111 1111",
      email: "carlos.munoz@example.com",
    },
    {
      name: "Ana",
      lastnames: "Fernández Rojas",
      phone: "+56 9 2222 2222",
      email: "ana.fernandez@example.com",
    },
    {
      name: "Pedro",
      lastnames: "Ramírez Soto",
      phone: "+56 9 3333 3333",
      email: "pedro.ramirez@example.com",
    },
    {
      name: "Laura",
      lastnames: "Torres Medina",
      phone: "+56 9 4444 4444",
      email: "laura.torres@example.com",
    },
    {
      name: "Diego",
      lastnames: "Herrera Castro",
      phone: "+56 9 5555 5555",
      email: "diego.herrera@example.com",
    },
    {
      name: "Sofía",
      lastnames: "Reyes Vega",
      phone: "+56 9 6666 6666",
      email: "sofia.reyes@example.com",
    },
    {
      name: "Matías",
      lastnames: "Ortiz Flores",
      phone: "+56 9 7777 7777",
      email: "matias.ortiz@example.com",
    },
    {
      name: "Valentina",
      lastnames: "Morales Ruiz",
      phone: "+56 9 8888 8888",
      email: "valentina.morales@example.com",
    },
  ];

  const customers = await Promise.all(
    customersData.map((c) =>
      prisma.customer.upsert({
        where: { email: c.email },
        update: {
          email: c.email,
          lastnames: c.lastnames,
          name: c.name,
          phone: c.phone,
        },
        create: {
          email: c.email,
          lastnames: c.lastnames,
          name: c.name,
          phone: c.phone,
        },
      }),
    ),
  );

  // --- Servicios de prueba ---
  const servicesData = [
    { name: "Corte de cabello", price: 15000 },
    { name: "Corte infantil", price: 10000 },
    { name: "Arreglo de barba", price: 8000 },
    { name: "Tinte completo", price: 35000 },
    { name: "Mechas", price: 45000 },
    { name: "Lavado + Blowout", price: 18000 },
    { name: "Tratamiento capilar", price: 25000 },
    { name: "Peinado para eventos", price: 30000 },
    { name: "Corte + Barba (combo)", price: 20000 },
    { name: "Alisado permanente", price: 55000 },
  ];

  const services = await Promise.all(
    servicesData.map(async (s) =>
      prisma.service
        .upsert({
          where: {
            id: (await prisma.service.count()) + 1,
            name: s.name,
          },
          update: {},
          create: { name: s.name, price: s.price },
        })
        .catch(() =>
          prisma.service.create({ data: { name: s.name, price: s.price } }),
        ),
    ),
  );

  // --- Turnos de prueba (últimos 30 días) ---
  const now = new Date();
  const statuses = [
    "scheduled",
    "completed",
    "cancelled",
    "rescheduled",
  ] as const;

  const appointmentTemplates = [
    { title: "Corte de cabello", description: "Corte moderno con degradado" },
    { title: "Corte y barba", description: "Corte clásico + arreglo de barba" },
    { title: "Tinte completo", description: "Tinte color castaño oscuro" },
    { title: "Mechas balayage", description: "Mechas balayage rubio ceniza" },
    {
      title: "Tratamiento capilar",
      description: "Hidratación profunda con keratina",
    },
    {
      title: "Peinado evento",
      description: "Peinado recogido para matrimonio",
    },
    { title: "Corte infantil", description: "Corte para niño, degrafilado" },
    {
      title: "Lavado + Blowout",
      description: "Lavado con shampoo profesional y secado",
    },
    {
      title: "Corte + Barba combo",
      description: "Combo corte y barba completo",
    },
    { title: "Alisado permanente", description: "Alisado con queratina" },
  ];

  const appointments = [];

  for (let i = 0; i < 25; i++) {
    const template = appointmentTemplates[i % appointmentTemplates.length];
    const customer = customers[i % customers.length];
    const user = users[i % users.length];
    const dayOffset = Math.floor(Math.random() * 30);
    const d = new Date(now);
    d.setDate(d.getDate() - dayOffset);
    d.setHours(10 + (i % 8), (i * 13) % 60, 0, 0);

    const statusIdx = i < 10 ? 1 : i < 18 ? 0 : i < 22 ? 2 : 3;
    const status = statuses[statusIdx];

    const apt = await prisma.appointment.create({
      data: {
        title: template.title,
        description: template.description,
        customerId: customer.id,
        userId: user.id,
        appointmentDate: d,
        status,
        reminderSent: "no",
      },
    });

    // Assign 1-2 random services per appointment
    const numServices = 1 + (i % 2);
    for (let j = 0; j < numServices; j++) {
      const svc = services[(i + j) % services.length];
      await prisma.appointmentsServices
        .create({
          data: {
            appointmentId: apt.id,
            serviceId: svc.id,
          },
        })
        .catch(() => {});
    }

    appointments.push(apt);
  }

  // --- Notificaciones de prueba ---
  const notificationTemplates = [
    {
      title: "Nuevo turno agendado",
      message: "Se ha registrado un nuevo turno para {customer} el día {date}.",
      type: "info",
    },
    {
      title: "Recordatorio de turno",
      message: "El turno de {customer} está próximo (mañana a las {time}).",
      type: "warning",
    },
    {
      title: "Turno completado",
      message: "El turno de {customer} ha sido marcado como completado.",
      type: "success",
    },
    {
      title: "Turno cancelado",
      message:
        "El turno de {customer} programado para {date} ha sido cancelado.",
      type: "error",
    },
    {
      title: "Turno reagendado",
      message: "El turno de {customer} ha sido reagendado para el {date}.",
      type: "warning",
    },
    {
      title: "Cliente nuevo registrado",
      message: "Se ha registrado un nuevo cliente: {customer}.",
      type: "info",
    },
  ];

  for (const user of users) {
    for (let i = 0; i < 6; i++) {
      const tmpl = notificationTemplates[i % notificationTemplates.length];
      const customer = customers[i % customers.length];
      const apt = appointments[i % appointments.length];

      const d = new Date(now);
      d.setDate(d.getDate() - (5 - i));

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
          read: i > 2,
          createdAt: d,
        },
      });
    }
  }

  console.log("Datos de prueba insertados correctamente:");
  console.log(`  - ${users.length} usuarios (empleados)`);
  console.log(`  - ${customers.length} clientes`);
  console.log(`  - ${services.length} servicios`);
  console.log(`  - ${appointments.length} turnos`);
  console.log(`  - ${users.length * 6} notificaciones`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
