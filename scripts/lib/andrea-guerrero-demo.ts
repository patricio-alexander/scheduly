/**
 * Catálogo demo · Andrea Guerrero Estética y Peluquería (Loja).
 * Direcciones reales: 18 de Noviembre entre Colón y José Antonio Eguiguren.
 * Precios orientativos mercado Loja (USD).
 */

/** Password común admins / empleados / programador */
export const AG_PASSWORD = "12345678";

/** Dueña · credenciales propias (no usa Administrador) */
export const AG_OWNER = {
  username: "andrea",
  password: "Andrea2026",
  firstName: "Andrea",
  firstLastName: "Guerrero",
  email: "andrea@andreaguerrero.ec",
  phone: "0994960155",
} as const;

/** Programador · solo logs + menú tester live */
export const AG_PROGRAMMER = {
  username: "edgar",
  password: AG_PASSWORD,
  firstName: "Edgar",
  firstLastName: "PC",
  email: "edgar@andreaguerrero.ec",
  phone: "0994000000",
} as const;

export const AG_BUSINESS = {
  name: "Andrea Guerrero Estética y Peluquería",
  alias: "andrea-guerrero",
  description:
    "Centro de belleza en Loja: peluquería, tratamientos capilares, spa de uñas, depilación y maquillaje. Lun–sáb 8:00–20:00. Tel. 099 496 0155.",
  phone: "0994960155",
  email: "andrea@andreaguerrero.ec",
  whatsapp: "https://wa.me/593994960155",
  facebook: "https://www.facebook.com/andreaguerreropeluqueriayspa1/",
  instagram: "https://www.instagram.com/andreaguerrero_peluqueriayspa/",
  accentColor: "#D4AF37",
  successColor: "#22C55E",
  warningColor: "#F0B429",
  dangerColor: "#F04438",
  matrixAddress: "18 de Noviembre entre Colón y José Antonio Eguiguren, Loja, Ecuador",
} as const;

export const AG_BRANCHES = [
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
    emissionPointCode: "001",
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
    emissionPointCode: "001",
  },
] as const;

/** Encargadas de local · rol Administrador */
export const AG_ADMINS = [
  {
    username: "admin_colon",
    firstName: "Karla",
    firstLastName: "Espinoza",
    email: "colon@andreaguerrero.ec",
    phone: "0995112233",
    branchKey: "colon",
  },
  {
    username: "admin_eguiguren",
    firstName: "Paola",
    firstLastName: "Jiménez",
    email: "eguiguren@andreaguerrero.ec",
    phone: "0995223344",
    branchKey: "eguiguren",
  },
  {
    username: "admin_loja",
    firstName: "Verónica",
    firstLastName: "Cueva",
    email: "admin@andreaguerrero.ec",
    phone: "0995334455",
    branchKey: "colon",
  },
] as const;

/** Equipo · rol Empleado */
export const AG_EMPLOYEES = [
  {
    username: "estilista_maria",
    firstName: "María",
    firstLastName: "García",
    email: "maria.garcia@andreaguerrero.ec",
    phone: "0987112233",
  },
  {
    username: "estilista_juan",
    firstName: "Juan",
    firstLastName: "Pérez",
    email: "juan.perez@andreaguerrero.ec",
    phone: "0987223344",
  },
  {
    username: "colorista_camila",
    firstName: "Camila",
    firstLastName: "Rojas",
    email: "camila.rojas@andreaguerrero.ec",
    phone: "0987334455",
  },
  {
    username: "unas_natalia",
    firstName: "Natalia",
    firstLastName: "Ortiz",
    email: "natalia.ortiz@andreaguerrero.ec",
    phone: "0987445566",
  },
  {
    username: "makeup_andres",
    firstName: "Andrés",
    firstLastName: "Muñoz",
    email: "andres.munoz@andreaguerrero.ec",
    phone: "0987556677",
  },
  {
    username: "estilista_diego",
    firstName: "Diego",
    firstLastName: "Salinas",
    email: "diego.salinas@andreaguerrero.ec",
    phone: "0987667788",
  },
  {
    username: "tratamientos_paola",
    firstName: "Paola",
    firstLastName: "Herrera",
    email: "paola.herrera@andreaguerrero.ec",
    phone: "0987778899",
  },
  {
    username: "depilacion_ricardo",
    firstName: "Ricardo",
    firstLastName: "Vélez",
    email: "ricardo.velez@andreaguerrero.ec",
    phone: "0987889900",
  },
  {
    username: "recepcion_felipe",
    firstName: "Felipe",
    firstLastName: "López",
    email: "felipe.lopez@andreaguerrero.ec",
    phone: "0987990011",
  },
  {
    username: "estilista_marco",
    firstName: "Marco",
    firstLastName: "Espinosa",
    email: "marco.espinosa@andreaguerrero.ec",
    phone: "0987001122",
  },
] as const;

/** Servicios del salón (precios USD Loja). */
export const AG_SERVICES = [
  // Cabello · cortes
  { name: "Corte damas", price: 12, durationMinutes: 35, commissionPct: 40 },
  { name: "Corte caballeros", price: 10, durationMinutes: 25, commissionPct: 40 },
  { name: "Corte infantil", price: 8, durationMinutes: 25, commissionPct: 40 },
  { name: "Corte + brushing", price: 18, durationMinutes: 50, commissionPct: 38 },
  { name: "Flequillo / retoque", price: 5, durationMinutes: 15, commissionPct: 45 },
  // Cabello · lavado y styling
  { name: "Lavado + blowout", price: 15, durationMinutes: 40, commissionPct: 35 },
  { name: "Brushing y acabado", price: 8, durationMinutes: 25, commissionPct: 45 },
  { name: "Peinado recogido", price: 28, durationMinutes: 55, commissionPct: 38 },
  { name: "Peinado para eventos", price: 35, durationMinutes: 70, commissionPct: 38 },
  { name: "Ondas / planchado", price: 12, durationMinutes: 35, commissionPct: 40 },
  // Color
  { name: "Tinte raíces", price: 22, durationMinutes: 60, commissionPct: 30 },
  { name: "Tinte completo", price: 40, durationMinutes: 90, commissionPct: 30 },
  { name: "Mechas clásicas", price: 45, durationMinutes: 100, commissionPct: 28 },
  { name: "Mechas balayage", price: 65, durationMinutes: 130, commissionPct: 28 },
  { name: "Babylights", price: 70, durationMinutes: 140, commissionPct: 28 },
  { name: "Decoloración + tono", price: 55, durationMinutes: 120, commissionPct: 28 },
  { name: "Matizado / gloss", price: 18, durationMinutes: 40, commissionPct: 32 },
  { name: "Retoque de color", price: 25, durationMinutes: 50, commissionPct: 30 },
  // Tratamientos
  { name: "Hidratación profunda", price: 22, durationMinutes: 50, commissionPct: 32 },
  { name: "Tratamiento keratina express", price: 45, durationMinutes: 90, commissionPct: 28 },
  { name: "Alisado permanente", price: 85, durationMinutes: 150, commissionPct: 25 },
  { name: "Botox capilar", price: 55, durationMinutes: 100, commissionPct: 28 },
  { name: "Ampolla reparadora (sesión)", price: 15, durationMinutes: 35, commissionPct: 35 },
  { name: "Tratamiento anticaída", price: 28, durationMinutes: 55, commissionPct: 32 },
  // Uñas / spa
  { name: "Manicura clásica", price: 10, durationMinutes: 40, commissionPct: 45 },
  { name: "Manicura semipermanente", price: 16, durationMinutes: 55, commissionPct: 42 },
  { name: "Pedicura clásica", price: 14, durationMinutes: 50, commissionPct: 45 },
  { name: "Pedicura spa", price: 20, durationMinutes: 65, commissionPct: 42 },
  { name: "Spa de uñas completo", price: 28, durationMinutes: 80, commissionPct: 40 },
  { name: "Retiro de gel / acrílico", price: 8, durationMinutes: 25, commissionPct: 45 },
  // Estética
  { name: "Perfilado de cejas", price: 5, durationMinutes: 15, commissionPct: 50 },
  { name: "Diseño de cejas + henna", price: 12, durationMinutes: 30, commissionPct: 45 },
  { name: "Depilación facial", price: 8, durationMinutes: 25, commissionPct: 50 },
  { name: "Depilación axilas", price: 8, durationMinutes: 20, commissionPct: 48 },
  { name: "Depilación piernas completas", price: 18, durationMinutes: 40, commissionPct: 45 },
  { name: "Depilación media pierna", price: 12, durationMinutes: 30, commissionPct: 45 },
  { name: "Maquillaje social", price: 25, durationMinutes: 45, commissionPct: 40 },
  { name: "Maquillaje profesional evento", price: 40, durationMinutes: 70, commissionPct: 40 },
  { name: "Lifting de pestañas", price: 22, durationMinutes: 50, commissionPct: 42 },
  // Combos
  { name: "Combo corte + blowout + hidratación", price: 38, durationMinutes: 90, commissionPct: 35 },
  { name: "Combo novia (peinado + maquillaje)", price: 70, durationMinutes: 120, commissionPct: 35 },
  { name: "Combo mamá (corte + manicura)", price: 20, durationMinutes: 70, commissionPct: 38 },
] as const;

export const AG_CATEGORIES = [
  { name: "Cuidado capilar", description: "Shampoos, acondicionadores y mascarillas" },
  { name: "Tratamientos profesionales", description: "Ampollas, keratina y reconstrucción" },
  { name: "Styling y acabado", description: "Serums, sprays, ceras y protectores" },
  { name: "Coloración", description: "Tintes y oxidantes de venta" },
  { name: "Uñas y spa", description: "Esmaltes, kits y cuidado de uñas" },
  { name: "Estética facial", description: "Cejas, labiales y cuidado de piel" },
  { name: "Accesorios", description: "Cepillos, pinzas y herramientas" },
] as const;

export const AG_PRODUCTS = [
  // Cuidado capilar
  { name: "Shampoo profesional 300ml", price: 12.5, stock: 48, minStock: 8, cost: 7, category: "Cuidado capilar" },
  { name: "Shampoo anticaspa 300ml", price: 13.9, stock: 22, minStock: 6, cost: 8, category: "Cuidado capilar" },
  { name: "Shampoo matizador violeta", price: 15.5, stock: 18, minStock: 5, cost: 9, category: "Cuidado capilar" },
  { name: "Acondicionador reparador 300ml", price: 14.5, stock: 40, minStock: 8, cost: 8.5, category: "Cuidado capilar" },
  { name: "Acondicionador leave-in", price: 11.9, stock: 26, minStock: 6, cost: 7, category: "Cuidado capilar" },
  { name: "Mascarilla hidratación intensa", price: 18.9, stock: 15, minStock: 5, cost: 11, category: "Cuidado capilar" },
  { name: "Mascarilla reconstrucción", price: 21.5, stock: 12, minStock: 4, cost: 13, category: "Cuidado capilar" },
  { name: "Serum puntas abiertas", price: 14.5, stock: 20, minStock: 5, cost: 8.5, category: "Cuidado capilar" },
  { name: "Aceite de argán 50ml", price: 16.9, stock: 14, minStock: 4, cost: 10, category: "Cuidado capilar" },
  // Tratamientos
  { name: "Ampolla reparadora (caja x12)", price: 24.0, stock: 10, minStock: 3, cost: 14, category: "Tratamientos profesionales" },
  { name: "Ampolla individual", price: 3.5, stock: 60, minStock: 15, cost: 1.8, category: "Tratamientos profesionales" },
  { name: "Keratina kit casa", price: 32.0, stock: 8, minStock: 2, cost: 20, category: "Tratamientos profesionales" },
  { name: "Botox capilar kit", price: 28.5, stock: 7, minStock: 2, cost: 17, category: "Tratamientos profesionales" },
  { name: "Tratamiento anticaída 100ml", price: 19.9, stock: 11, minStock: 3, cost: 12, category: "Tratamientos profesionales" },
  // Styling
  { name: "Spray termoprotector", price: 13.5, stock: 25, minStock: 6, cost: 8, category: "Styling y acabado" },
  { name: "Laca fijación media", price: 10.5, stock: 30, minStock: 8, cost: 6, category: "Styling y acabado" },
  { name: "Laca fijación fuerte", price: 11.5, stock: 18, minStock: 5, cost: 6.5, category: "Styling y acabado" },
  { name: "Cera modeladora", price: 9.5, stock: 22, minStock: 6, cost: 5.5, category: "Styling y acabado" },
  { name: "Gel fijador", price: 8.9, stock: 20, minStock: 5, cost: 5, category: "Styling y acabado" },
  { name: "Mousse volumizador", price: 12.9, stock: 16, minStock: 4, cost: 7.5, category: "Styling y acabado" },
  { name: "Serum brillo instantáneo", price: 15.9, stock: 14, minStock: 4, cost: 9, category: "Styling y acabado" },
  { name: "Crema para peinar rizado", price: 13.9, stock: 12, minStock: 4, cost: 8, category: "Styling y acabado" },
  // Coloración
  { name: "Tinte retail castaño", price: 9.9, stock: 20, minStock: 5, cost: 5.5, category: "Coloración" },
  { name: "Tinte retail negro", price: 9.9, stock: 18, minStock: 5, cost: 5.5, category: "Coloración" },
  { name: "Tinte retail rubio", price: 10.5, stock: 14, minStock: 4, cost: 6, category: "Coloración" },
  { name: "Tinte retail rojo", price: 10.5, stock: 10, minStock: 3, cost: 6, category: "Coloración" },
  { name: "Oxidante 20 vol 1L", price: 8.5, stock: 12, minStock: 3, cost: 4.5, category: "Coloración" },
  { name: "Oxidante 30 vol 1L", price: 8.9, stock: 10, minStock: 3, cost: 4.8, category: "Coloración" },
  { name: "Decolorante polvo 500g", price: 18.0, stock: 8, minStock: 2, cost: 11, category: "Coloración" },
  // Uñas
  { name: "Esmalte premium rojo", price: 6.5, stock: 35, minStock: 8, cost: 3.2, category: "Uñas y spa" },
  { name: "Esmalte premium nude", price: 6.5, stock: 32, minStock: 8, cost: 3.2, category: "Uñas y spa" },
  { name: "Esmalte semipermanente", price: 9.9, stock: 24, minStock: 6, cost: 5, category: "Uñas y spa" },
  { name: "Base coat + top coat", price: 11.5, stock: 18, minStock: 5, cost: 6, category: "Uñas y spa" },
  { name: "Kit manicura casa", price: 16.9, stock: 12, minStock: 3, cost: 10, category: "Uñas y spa" },
  { name: "Aceite cutículas", price: 5.5, stock: 28, minStock: 6, cost: 2.8, category: "Uñas y spa" },
  { name: "Lima profesional pack", price: 4.5, stock: 40, minStock: 10, cost: 2, category: "Uñas y spa" },
  // Estética
  { name: "Henna cejas kit", price: 14.9, stock: 10, minStock: 3, cost: 8, category: "Estética facial" },
  { name: "Gel depilatorio facial", price: 7.9, stock: 16, minStock: 4, cost: 4, category: "Estética facial" },
  { name: "Labial mate", price: 8.5, stock: 22, minStock: 5, cost: 4.5, category: "Estética facial" },
  { name: "Máscara de pestañas", price: 9.9, stock: 18, minStock: 5, cost: 5.5, category: "Estética facial" },
  { name: "Desmaquillante bifásico", price: 11.5, stock: 14, minStock: 4, cost: 6.5, category: "Estética facial" },
  // Accesorios
  { name: "Cepillo desenredante", price: 12.9, stock: 20, minStock: 5, cost: 7, category: "Accesorios" },
  { name: "Cepillo redondo térmico", price: 18.5, stock: 10, minStock: 3, cost: 11, category: "Accesorios" },
  { name: "Pinzas de sección pack", price: 5.9, stock: 25, minStock: 6, cost: 2.5, category: "Accesorios" },
  { name: "Gorro térmico", price: 9.5, stock: 8, minStock: 2, cost: 5, category: "Accesorios" },
  { name: "Capa de corte profesional", price: 14.0, stock: 6, minStock: 2, cost: 8, category: "Accesorios" },
  { name: "Guantes nitrilo caja", price: 7.5, stock: 15, minStock: 4, cost: 4, category: "Accesorios" },
] as const;

export const AG_CUSTOMERS = [
  { name: "María Fernanda López Mendoza", firstName: "María Fernanda", firstLastName: "López", secondLastName: "Mendoza", phone: "0987654321", email: "maria.lopez@gmail.com" },
  { name: "Carla Andrea Vega Torres", firstName: "Carla Andrea", firstLastName: "Vega", secondLastName: "Torres", phone: "0992345678", email: "carla.vega@hotmail.com" },
  { name: "Laura Patricia Torres Medina", firstName: "Laura Patricia", firstLastName: "Torres", secondLastName: "Medina", phone: "0965432109", email: "laura.torres@gmail.com" },
  { name: "Sofía Isabel Reyes Vega", firstName: "Sofía Isabel", firstLastName: "Reyes", secondLastName: "Vega", phone: "0943210987", email: "sofia.reyes@gmail.com" },
  { name: "Valentina Morales Ruiz", firstName: "Valentina", firstLastName: "Morales", secondLastName: "Ruiz", phone: "0921098765", email: "valentina.morales@gmail.com" },
  { name: "Andrea Cevallos Ponce", firstName: "Andrea", firstLastName: "Cevallos", secondLastName: "Ponce", phone: "0954329876", email: "andrea.cevallos@gmail.com" },
  { name: "Daniela Pulla Chiriboga", firstName: "Daniela", firstLastName: "Pulla", secondLastName: "Chiriboga", phone: "0932107654", email: "daniela.pulla@outlook.com" },
  { name: "Camila Ordóñez Castillo", firstName: "Camila", firstLastName: "Ordóñez", secondLastName: "Castillo", phone: "0989012345", email: "camila.ordonez@gmail.com" },
  { name: "Fernanda Ávila Samaniego", firstName: "Fernanda", firstLastName: "Ávila", secondLastName: "Samaniego", phone: "0978901234", email: "fernanda.avila@hotmail.com" },
  { name: "Gabriela Jaramillo Peña", firstName: "Gabriela", firstLastName: "Jaramillo", secondLastName: "Peña", phone: "0967890123", email: "gabriela.jaramillo@outlook.com" },
  { name: "Lucía Maldonado Ríos", firstName: "Lucía", firstLastName: "Maldonado", secondLastName: "Ríos", phone: "0956789012", email: "lucia.maldonado@gmail.com" },
  { name: "Patricia Burneo León", firstName: "Patricia", firstLastName: "Burneo", secondLastName: "León", phone: "0945678901", email: "patricia.burneo@hotmail.com" },
  { name: "Diana Aguirre Celi", firstName: "Diana", firstLastName: "Aguirre", secondLastName: "Celi", phone: "0934567890", email: "diana.aguirre@gmail.com" },
  { name: "Katherine Romero Valdivieso", firstName: "Katherine", firstLastName: "Romero", secondLastName: "Valdivieso", phone: "0923456789", email: "katherine.romero@yahoo.com" },
  { name: "Michelle Salinas Quizhpe", firstName: "Michelle", firstLastName: "Salinas", secondLastName: "Quizhpe", phone: "0912345678", email: "michelle.salinas@gmail.com" },
  { name: "Johanna Piedra Armijos", firstName: "Johanna", firstLastName: "Piedra", secondLastName: "Armijos", phone: "0998761234", email: "johanna.piedra@hotmail.com" },
  { name: "Carolina Ochoa Vivanco", firstName: "Carolina", firstLastName: "Ochoa", secondLastName: "Vivanco", phone: "0987651234", email: "carolina.ochoa@gmail.com" },
  { name: "Elizabeth Guerrero Mora", firstName: "Elizabeth", firstLastName: "Guerrero", secondLastName: "Mora", phone: "0965431234", email: "elizabeth.guerrero@gmail.com" },
  { name: "Pedro Javier Ramírez Soto", firstName: "Pedro Javier", firstLastName: "Ramírez", secondLastName: "Soto", phone: "0976543210", email: "pedro.ramirez@yahoo.com" },
  { name: "Ana Lucía Castillo Bravo", firstName: "Ana Lucía", firstLastName: "Castillo", secondLastName: "Bravo", phone: "0955112233", email: "ana.castillo@gmail.com" },
] as const;

export const AG_SUPPLIERS = [
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
  {
    name: "Cosméticos del Austro",
    phone: "072112233",
    email: "loja@cosmeticosdelaustro.ec",
    taxId: "1100556677001",
    address: "Av. Isidro Ayora, Loja",
  },
] as const;
