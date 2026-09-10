import type {
  BusinessFormData,
  ReportData,
  RoadmapStep,
  Mentor,
  Provider,
  CommunityMessage,
  HeatmapData,
  ZoneMetrics,
} from "../types";

export function generateMockReport(form: BusinessFormData): ReportData {
  return {
    sectorGrowthPercent: 8.4,
    sectorGrowthPeriod: "2023-2025",
    localBusinessCount: 342,
    avgMonthlyRevenue: Math.round(form.budget * 0.18),
    survivalRate5Years: 62,
    demandTrend: "creciendo",
    insights: [
      `El sector de "${form.businessType}" ha crecido de forma sostenida en ${form.location.city}, ${form.location.state}.`,
      "Los negocios similares con inversión inicial comparable a la tuya reportan punto de equilibrio entre los 8 y 14 meses.",
      "La densidad de competidores directos en tu zona es media, con oportunidad en horarios vespertinos.",
    ],
    sources: [
      {
        name: "Directorio Estadístico Nacional de Unidades Económicas (DENUE)",
        publisher: "INEGI",
        year: 2024,
        url: "https://www.inegi.org.mx/app/mapa/denue/",
      },
      {
        name: "Estudios de fomento a la micro y pequeña empresa",
        publisher: "Secretaría de Economía",
        year: 2024,
        url: "https://www.gob.mx/se",
      },
      {
        name: "Observatorio de la Micro, Pequeña y Mediana Empresa",
        publisher: "INADEM / Secretaría de Economía",
        year: 2023,
        url: "https://www.gob.mx/se",
      },
    ],
  };
}

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return (h % 1000) / 1000;
  };
}

const zoneNames = [
  ["Centro", "Norte", "Noreste"],
  ["Poniente", "Tu zona", "Oriente"],
  ["Suroeste", "Sur", "Sureste"],
];

export function generateMockHeatmap(form: BusinessFormData): HeatmapData {
  const rand = seededRandom(`${form.businessType}-${form.location.city}-${form.category}`);
  const zones: ZoneMetrics[] = [];

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const isCenter = row === 1 && col === 1;
      const supply = Math.round(20 + rand() * 70);
      const demand = Math.round(30 + rand() * 65);
      const cost = Math.round(25 + rand() * 65);
      const opportunityScore = Math.round(
        Math.max(0, Math.min(100, demand * 0.55 - supply * 0.35 - cost * 0.15 + 45))
      );
      zones.push({
        id: `${row}-${col}`,
        name: isCenter ? "Tu zona" : zoneNames[row][col],
        row,
        col,
        supply,
        demand,
        cost,
        opportunityScore,
      });
    }
  }

  return { centerLabel: `${form.location.city}, ${form.location.state}`, zones };
}

export const roadmapSteps: RoadmapStep[] = [
  {
    id: "legal-1",
    level: 1,
    title: "Registra tu negocio",
    description: "Da de alta tu actividad económica ante el SAT / autoridad fiscal local.",
    category: "legal",
    status: "available",
    xp: 100,
    detail: {
      summary:
        "Antes de operar necesitas estar registrado fiscalmente. Esto te permite emitir facturas y evitar multas.",
      instructions: [
        "Reúne tu identificación oficial y comprobante de domicilio.",
        "Ingresa al portal oficial del SAT y elige el régimen de Actividad Empresarial simplificado.",
        "Agenda tu cita (presencial o en línea) para la firma electrónica (e.firma).",
        "Completa tu alta y guarda tu constancia de situación fiscal.",
      ],
      officialLink: { label: "Portal oficial del SAT", url: "https://www.sat.gob.mx" },
      hasCost: false,
      canDoOnline: true,
      connectTo: ["mentores"],
    },
  },
  {
    id: "legal-2",
    level: 1,
    title: "Licencia de funcionamiento",
    description: "Trámite municipal para operar en tu ubicación física.",
    category: "legal",
    status: "locked",
    xp: 100,
    detail: {
      summary: "Cada municipio requiere una licencia de uso de suelo y funcionamiento antes de abrir al público.",
      instructions: [
        "Visita el portal de tu ayuntamiento o presidencia municipal.",
        "Verifica el uso de suelo permitido para tu ubicación.",
        "Presenta tu solicitud junto con el contrato de arrendamiento o escritura.",
        "Paga el derecho correspondiente y da seguimiento a tu folio.",
      ],
      hasCost: true,
      estimatedCost: "$800 - $3,500 MXN según municipio",
      canDoOnline: false,
      connectTo: [],
    },
  },
  {
    id: "mentoria-1",
    level: 1,
    title: "Conéctate con un mentor",
    description: "Habla con alguien que ya abrió un negocio como el tuyo.",
    category: "mentoria",
    status: "locked",
    xp: 150,
    detail: {
      summary: "Aprende de errores ajenos antes de cometerlos. Conectamos tu perfil con mentores validados en tu giro.",
      instructions: [
        "Revisa los mentores sugeridos para tu categoría de negocio.",
        "Agenda una primera llamada de diagnóstico (30 min).",
        "Define con tu mentor los 3 riesgos principales de tu arranque.",
      ],
      hasCost: false,
      canDoOnline: true,
      connectTo: ["mentores"],
    },
  },
  {
    id: "finanzas-1",
    level: 1,
    title: "Define tu presupuesto operativo",
    description: "Estructura cómo se va a repartir tu inversión inicial.",
    category: "finanzas",
    status: "locked",
    xp: 120,
    detail: {
      summary: "Un presupuesto claro evita quedarte sin efectivo en los primeros meses, el motivo más común de cierre temprano.",
      instructions: [
        "Divide tu presupuesto en: equipamiento, inventario inicial, renta/depósito, marketing y colchón de 3 meses.",
        "Usa la plantilla sugerida dentro de la app para simular tu flujo de efectivo.",
        "Ajusta según los datos de tu reporte de sector.",
      ],
      hasCost: false,
      canDoOnline: true,
      connectTo: ["proveedores"],
    },
  },
  {
    id: "marketing-1",
    level: 2,
    title: "Crea tus redes sociales",
    description: "Presencia digital básica para empezar a captar clientes.",
    category: "marketing",
    status: "locked",
    xp: 100,
    detail: {
      summary: "Tus primeros clientes muy probablemente te van a encontrar en redes antes que caminando por la calle.",
      instructions: [
        "Crea perfil de negocio en Instagram y Facebook / Google Business Profile.",
        "Publica tu ubicación, horarios y catálogo inicial.",
        "Planea tu primer mes de contenido (3 publicaciones por semana).",
      ],
      hasCost: false,
      canDoOnline: true,
      connectTo: [],
    },
  },
  {
    id: "operaciones-1",
    level: 2,
    title: "Consigue proveedores clave",
    description: "Asegura insumos y equipamiento con proveedores validados.",
    category: "operaciones",
    status: "locked",
    xp: 130,
    detail: {
      summary: "Comparamos proveedores por precio, tiempo de entrega y reputación dentro de nuestro marketplace.",
      instructions: [
        "Explora el marketplace filtrando por tu categoría de negocio.",
        "Solicita al menos 3 cotizaciones antes de decidir.",
        "Cierra tu primer pedido de inventario.",
      ],
      hasCost: true,
      estimatedCost: "Variable según proveedor",
      canDoOnline: true,
      connectTo: ["proveedores"],
    },
  },
  {
    id: "escalamiento-1",
    level: 3,
    title: "Automatiza flujos de trabajo",
    description: "Sistematiza ventas, inventario y atención para escalar sin ti presente todo el tiempo.",
    category: "escalamiento",
    status: "locked",
    xp: 200,
    detail: {
      summary: "Cuando tu negocio ya es estable, automatizar procesos es lo que te permite abrir una segunda sucursal.",
      instructions: [
        "Implementa un punto de venta (POS) con reportes automáticos.",
        "Define procesos escritos para tus primeros empleados.",
        "Evalúa métricas mensuales de margen y rotación de inventario.",
      ],
      hasCost: true,
      estimatedCost: "Depende de las herramientas elegidas",
      canDoOnline: true,
      connectTo: ["mentores"],
    },
  },
  {
    id: "escalamiento-2",
    level: 3,
    title: "Abre tu segunda sucursal",
    description: "Replica tu modelo validado en una nueva ubicación.",
    category: "escalamiento",
    status: "locked",
    xp: 250,
    detail: {
      summary: "Con datos de al menos 12 meses puedes evaluar si tu modelo es replicable en otra zona.",
      instructions: [
        "Analiza zonas con demanda similar usando tu reporte de sector.",
        "Valida el presupuesto de apertura con tu mentor.",
        "Contrata y capacita a tu primer gerente de sucursal.",
      ],
      hasCost: true,
      estimatedCost: "Similar a tu inversión inicial",
      canDoOnline: false,
      connectTo: ["mentores", "proveedores"],
    },
  },
];

export const mentors: Mentor[] = [
  { id: "m1", name: "Laura Jiménez", expertise: "Cafeterías y coffee shops", businessesOpened: 4, location: "CDMX, México", rating: 4.9, avatarColor: "#E0A96D" },
  { id: "m2", name: "Carlos Medina", expertise: "Restaurantes y food trucks", businessesOpened: 3, location: "Guadalajara, México", rating: 4.7, avatarColor: "#6D9EE0" },
  { id: "m3", name: "Ana Rodríguez", expertise: "Salones de belleza", businessesOpened: 6, location: "Monterrey, México", rating: 5.0, avatarColor: "#E06D9E" },
  { id: "m4", name: "Diego Torres", expertise: "Talleres mecánicos", businessesOpened: 2, location: "Bogotá, Colombia", rating: 4.6, avatarColor: "#6DE0A9" },
];

export const providers: Provider[] = [
  { id: "p1", name: "Café Altura Mayor", category: "cafeteria", type: "producto", location: "CDMX, México", rating: 4.8, description: "Proveedor de café en grano de origen, mínimo 10kg." },
  { id: "p2", name: "Muebles Industriales RM", category: "cafeteria", type: "producto", location: "Puebla, México", rating: 4.5, description: "Mobiliario para cafeterías y restaurantes, hecho a medida." },
  { id: "p3", name: "Plomería Express", category: "general", type: "servicio", location: "CDMX, México", rating: 4.7, description: "Instalación y mantenimiento para locales comerciales." },
  { id: "p4", name: "Distribuidora de Cubiertos GO", category: "restaurante", type: "producto", location: "Guadalajara, México", rating: 4.4, description: "Cubiertos, vajilla y desechables al mayoreo." },
  { id: "p5", name: "Electricistas del Valle", category: "general", type: "servicio", location: "Monterrey, México", rating: 4.9, description: "Instalaciones eléctricas certificadas para negocios." },
];

export const communityMessages: CommunityMessage[] = [
  { id: "c1", author: "Mariana G.", location: "CDMX, México", businessType: "Cafetería", message: "¿Alguien sabe si vale la pena comprar la máquina de espresso nueva o reacondicionada para arrancar?", timestamp: "hace 2 h" },
  { id: "c2", author: "Jorge P.", location: "Medellín, Colombia", businessType: "Plomería", message: "Cerré mi primer mes con 15 clientes recurrentes, el boca a boca funcionó mejor que las redes.", timestamp: "hace 5 h" },
  { id: "c3", author: "Sofía R.", location: "Lima, Perú", businessType: "Papelería", message: "Tip: negocien plazos de pago con proveedores desde el día 1, me salvó el flujo de caja.", timestamp: "hace 1 d" },
];
