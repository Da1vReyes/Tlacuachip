import { db } from "./db.js";

// Mirrors web/src/data/mockData.ts (roadmapSteps, mentors, providers) so
// this service's catalog and the frontend's built-in fallback agree until
// the web app is switched over to fetch from here.
const roadmapSteps = [
  {
    id: "legal-1",
    level: 1,
    title: "Registra tu negocio",
    description: "Da de alta tu actividad económica ante el SAT / autoridad fiscal local.",
    category: "legal",
    xp: 100,
    summary: "Antes de operar necesitas estar registrado fiscalmente. Esto te permite emitir facturas y evitar multas.",
    instructions: [
      "Reúne tu identificación oficial y comprobante de domicilio.",
      "Ingresa al portal oficial del SAT y elige el régimen de Actividad Empresarial simplificado.",
      "Agenda tu cita (presencial o en línea) para la firma electrónica (e.firma).",
      "Completa tu alta y guarda tu constancia de situación fiscal.",
    ],
    officialLabel: "Portal oficial del SAT",
    officialUrl: "https://www.sat.gob.mx",
    hasCost: false,
    estimatedCost: null,
    canDoOnline: true,
    connectTo: ["mentores"],
  },
  {
    id: "legal-2",
    level: 1,
    title: "Licencia de funcionamiento",
    description: "Trámite municipal para operar en tu ubicación física.",
    category: "legal",
    xp: 100,
    summary: "Cada municipio requiere una licencia de uso de suelo y funcionamiento antes de abrir al público.",
    instructions: [
      "Visita el portal de tu ayuntamiento o presidencia municipal.",
      "Verifica el uso de suelo permitido para tu ubicación.",
      "Presenta tu solicitud junto con el contrato de arrendamiento o escritura.",
      "Paga el derecho correspondiente y da seguimiento a tu folio.",
    ],
    officialLabel: null,
    officialUrl: null,
    hasCost: true,
    estimatedCost: "$800 - $3,500 MXN según municipio",
    canDoOnline: false,
    connectTo: [],
  },
  {
    id: "mentoria-1",
    level: 1,
    title: "Conéctate con un mentor",
    description: "Habla con alguien que ya abrió un negocio como el tuyo.",
    category: "mentoria",
    xp: 150,
    summary: "Aprende de errores ajenos antes de cometerlos. Conectamos tu perfil con mentores validados en tu giro.",
    instructions: [
      "Revisa los mentores sugeridos para tu categoría de negocio.",
      "Agenda una primera llamada de diagnóstico (30 min).",
      "Define con tu mentor los 3 riesgos principales de tu arranque.",
    ],
    officialLabel: null,
    officialUrl: null,
    hasCost: false,
    estimatedCost: null,
    canDoOnline: true,
    connectTo: ["mentores"],
  },
  {
    id: "finanzas-1",
    level: 1,
    title: "Define tu presupuesto operativo",
    description: "Estructura cómo se va a repartir tu inversión inicial.",
    category: "finanzas",
    xp: 120,
    summary: "Un presupuesto claro evita quedarte sin efectivo en los primeros meses, el motivo más común de cierre temprano.",
    instructions: [
      "Divide tu presupuesto en: equipamiento, inventario inicial, renta/depósito, marketing y colchón de 3 meses.",
      "Usa la plantilla sugerida dentro de la app para simular tu flujo de efectivo.",
      "Ajusta según los datos de tu reporte de sector.",
    ],
    officialLabel: null,
    officialUrl: null,
    hasCost: false,
    estimatedCost: null,
    canDoOnline: true,
    connectTo: ["proveedores"],
  },
  {
    id: "marketing-1",
    level: 2,
    title: "Crea tus redes sociales",
    description: "Presencia digital básica para empezar a captar clientes.",
    category: "marketing",
    xp: 100,
    summary: "Tus primeros clientes muy probablemente te van a encontrar en redes antes que caminando por la calle.",
    instructions: [
      "Crea perfil de negocio en Instagram y Facebook / Google Business Profile.",
      "Publica tu ubicación, horarios y catálogo inicial.",
      "Planea tu primer mes de contenido (3 publicaciones por semana).",
    ],
    officialLabel: null,
    officialUrl: null,
    hasCost: false,
    estimatedCost: null,
    canDoOnline: true,
    connectTo: [],
  },
  {
    id: "operaciones-1",
    level: 2,
    title: "Consigue proveedores clave",
    description: "Asegura insumos y equipamiento con proveedores validados.",
    category: "operaciones",
    xp: 130,
    summary: "Comparamos proveedores por precio, tiempo de entrega y reputación dentro de nuestro marketplace.",
    instructions: [
      "Explora el marketplace filtrando por tu categoría de negocio.",
      "Solicita al menos 3 cotizaciones antes de decidir.",
      "Cierra tu primer pedido de inventario.",
    ],
    officialLabel: null,
    officialUrl: null,
    hasCost: true,
    estimatedCost: "Variable según proveedor",
    canDoOnline: true,
    connectTo: ["proveedores"],
  },
  {
    id: "escalamiento-1",
    level: 3,
    title: "Automatiza flujos de trabajo",
    description: "Sistematiza ventas, inventario y atención para escalar sin ti presente todo el tiempo.",
    category: "escalamiento",
    xp: 200,
    summary: "Cuando tu negocio ya es estable, automatizar procesos es lo que te permite abrir una segunda sucursal.",
    instructions: [
      "Implementa un punto de venta (POS) con reportes automáticos.",
      "Define procesos escritos para tus primeros empleados.",
      "Evalúa métricas mensuales de margen y rotación de inventario.",
    ],
    officialLabel: null,
    officialUrl: null,
    hasCost: true,
    estimatedCost: "Depende de las herramientas elegidas",
    canDoOnline: true,
    connectTo: ["mentores"],
  },
  {
    id: "escalamiento-2",
    level: 3,
    title: "Abre tu segunda sucursal",
    description: "Replica tu modelo validado en una nueva ubicación.",
    category: "escalamiento",
    xp: 250,
    summary: "Con datos de al menos 12 meses puedes evaluar si tu modelo es replicable en otra zona.",
    instructions: [
      "Analiza zonas con demanda similar usando tu reporte de sector.",
      "Valida el presupuesto de apertura con tu mentor.",
      "Contrata y capacita a tu primer gerente de sucursal.",
    ],
    officialLabel: null,
    officialUrl: null,
    hasCost: true,
    estimatedCost: "Similar a tu inversión inicial",
    canDoOnline: false,
    connectTo: ["mentores", "proveedores"],
  },
];

const mentors = [
  { id: "m1", name: "Laura Jiménez", expertise: "Cafeterías y coffee shops", businessesOpened: 4, location: "CDMX, México", rating: 4.9, avatarColor: "#E0A96D" },
  { id: "m2", name: "Carlos Medina", expertise: "Restaurantes y food trucks", businessesOpened: 3, location: "Guadalajara, México", rating: 4.7, avatarColor: "#6D9EE0" },
  { id: "m3", name: "Ana Rodríguez", expertise: "Salones de belleza", businessesOpened: 6, location: "Monterrey, México", rating: 5.0, avatarColor: "#E06D9E" },
  { id: "m4", name: "Diego Torres", expertise: "Talleres mecánicos", businessesOpened: 2, location: "Bogotá, Colombia", rating: 4.6, avatarColor: "#6DE0A9" },
];

const providers = [
  { id: "p1", name: "Café Altura Mayor", category: "cafeteria", type: "producto", location: "CDMX, México", rating: 4.8, description: "Proveedor de café en grano de origen, mínimo 10kg." },
  { id: "p2", name: "Muebles Industriales RM", category: "cafeteria", type: "producto", location: "Puebla, México", rating: 4.5, description: "Mobiliario para cafeterías y restaurantes, hecho a medida." },
  { id: "p3", name: "Plomería Express", category: "general", type: "servicio", location: "CDMX, México", rating: 4.7, description: "Instalación y mantenimiento para locales comerciales." },
  { id: "p4", name: "Distribuidora de Cubiertos GO", category: "restaurante", type: "producto", location: "Guadalajara, México", rating: 4.4, description: "Cubiertos, vajilla y desechables al mayoreo." },
  { id: "p5", name: "Electricistas del Valle", category: "general", type: "servicio", location: "Monterrey, México", rating: 4.9, description: "Instalaciones eléctricas certificadas para negocios." },
];

export function seedIfEmpty() {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM roadmap_steps").get();
  if (count > 0) return;

  const insertStep = db.prepare(`
    INSERT INTO roadmap_steps
      (id, level, title, description, category, xp, summary, instructions, official_label, official_url, has_cost, estimated_cost, can_do_online, connect_to)
    VALUES (@id, @level, @title, @description, @category, @xp, @summary, @instructions, @officialLabel, @officialUrl, @hasCost, @estimatedCost, @canDoOnline, @connectTo)
  `);
  const insertMentor = db.prepare(`
    INSERT INTO mentors (id, name, expertise, businesses_opened, location, rating, avatar_color)
    VALUES (@id, @name, @expertise, @businessesOpened, @location, @rating, @avatarColor)
  `);
  const insertProvider = db.prepare(`
    INSERT INTO providers (id, name, category, type, location, rating, description)
    VALUES (@id, @name, @category, @type, @location, @rating, @description)
  `);

  const seedAll = db.transaction(() => {
    for (const s of roadmapSteps) {
      insertStep.run({
        ...s,
        instructions: JSON.stringify(s.instructions),
        connectTo: JSON.stringify(s.connectTo),
        hasCost: s.hasCost ? 1 : 0,
        canDoOnline: s.canDoOnline ? 1 : 0,
      });
    }
    for (const m of mentors) insertMentor.run(m);
    for (const p of providers) insertProvider.run(p);
  });

  seedAll();
  console.log(`[catalog-service] seeded ${roadmapSteps.length} steps, ${mentors.length} mentors, ${providers.length} providers`);
}
