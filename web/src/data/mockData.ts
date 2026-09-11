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
    id: "local-viability",
    level: 1,
    title: "Valida tu local y giro",
    description: "Antes de firmar o invertir, confirma que tu actividad puede operar en esa ubicación.",
    category: "legal",
    status: "available",
    xp: 100,
    detail: {
      summary:
        "El uso de suelo, la licencia de funcionamiento y los requisitos de apertura cambian por municipio. Primero confirma la viabilidad de tu giro en el domicilio exacto.",
      instructions: [
        "Define el giro concreto, el domicilio y si atenderás público, venderás alimentos, usarás gas o harás modificaciones al local.",
        "Consulta en la ventanilla o portal de tu ayuntamiento si el uso de suelo permite ese giro y qué licencia de funcionamiento corresponde.",
        "No firmes un contrato largo ni compres obra o equipo crítico antes de recibir esa orientación por escrito o mediante folio.",
        "Guarda el folio, correo o documento de la consulta junto con la ficha de requisitos municipales.",
      ],
      applicability: "base",
      authority: "Ayuntamiento o alcaldía del domicilio del negocio",
      evidence: ["Domicilio y giro definidos", "Folio, correo o respuesta municipal guardada", "Lista local de requisitos revisada"],
      officialLinks: [{ label: "Buscador oficial de trámites", url: "https://www.gob.mx/tramites" }],
      caution: "No existe una licencia municipal única para todo México. El costo, plazo y documentos dependen de tu municipio y actividad.",
      hasCost: true,
      estimatedCost: "Por confirmar con tu municipio",
      canDoOnline: false,
      connectTo: ["mentores"],
    },
  },
  {
    id: "sat-rfc",
    level: 1,
    title: "Obtén tu RFC",
    description: "Inscribe tu actividad ante el SAT y conserva tu constancia fiscal.",
    category: "legal",
    status: "locked",
    xp: 100,
    detail: {
      summary: "El RFC te identifica ante el SAT. La inscripción correcta depende de tu situación personal y de cómo operarás; no asumas un régimen sin revisarlo.",
      instructions: [
        "Revisa el trámite de inscripción al RFC en el portal del SAT y prepara los documentos que te solicite.",
        "Realiza la inscripción o agenda la cita indicada por el SAT para tu caso.",
        "Descarga y guarda tu Constancia de Situación Fiscal cuando el trámite concluya.",
        "Si ya tienes RFC, verifica que tu actividad y obligaciones sean coherentes con el negocio que abrirás.",
      ],
      applicability: "base",
      authority: "Servicio de Administración Tributaria (SAT)",
      evidence: ["RFC inscrito o actualizado", "Constancia de Situación Fiscal resguardada"],
      officialLinks: [{ label: "Inscripción y avisos al RFC · SAT", url: "https://www.sat.gob.mx/portal/public/tramites/inscripcion-y-aviso-al-rfc" }],
      hasCost: false,
      canDoOnline: true,
      connectTo: ["mentores"],
    },
  },
  {
    id: "fiscal-setup",
    level: 1,
    title: "Prepara tu operación fiscal",
    description: "Define obligaciones, habilita tu e.firma y deja lista la facturación.",
    category: "legal",
    status: "locked",
    xp: 150,
    detail: {
      summary: "Tener RFC no basta: necesitas conocer tus obligaciones, conservar acceso a tus credenciales y estar listo para facturar de acuerdo con tu régimen.",
      instructions: [
        "Tramita o renueva tu e.firma cuando corresponda y resguarda sus archivos y contraseña de forma segura.",
        "Confirma con SAT o con una persona contadora cuál régimen y cuáles declaraciones aplican a tu caso; no selecciones uno solo por conveniencia aparente.",
        "Configura el medio de facturación que corresponda y realiza una prueba antes de vender.",
        "Anota tus fechas de declaraciones y el responsable de revisar tus obligaciones periódicas.",
      ],
      applicability: "base",
      authority: "SAT; contador o contadora para acompañamiento profesional",
      evidence: ["e.firma vigente o cita registrada", "Régimen y obligaciones confirmados", "Prueba de facturación o plan de facturación documentado", "Calendario fiscal guardado"],
      officialLinks: [
        { label: "Obtén tu e.firma · SAT", url: "https://www.sat.gob.mx/gobmx/Paginas/ficha_105_cff.html" },
        { label: "Portal del SAT", url: "https://www.sat.gob.mx/home" },
      ],
      hasCost: false,
      canDoOnline: true,
      connectTo: ["mentores"],
    },
  },
  {
    id: "municipal-opening",
    level: 1,
    title: "Gestiona apertura municipal",
    description: "Integra licencias locales y confirma Protección Civil antes de abrir al público.",
    category: "legal",
    status: "locked",
    xp: 120,
    detail: {
      summary: "Con la viabilidad del local validada, integra los trámites municipales que te indicaron. Protección Civil también se revisa con la autoridad local según el inmueble y actividad.",
      instructions: [
        "Reúne los documentos y planos que el municipio haya solicitado para licencia de funcionamiento o apertura.",
        "Presenta la solicitud municipal y guarda el acuse o folio de seguimiento.",
        "Consulta a Protección Civil municipal si tu local requiere programa, visto bueno, capacitación, señalización o inspección.",
        "No abras al público hasta cumplir lo que determine tu municipio para tu actividad y local.",
      ],
      applicability: "base",
      authority: "Ayuntamiento o alcaldía y Protección Civil municipal",
      evidence: ["Solicitud o licencia municipal resguardada", "Requisitos de Protección Civil confirmados", "Acuse, dictamen o evidencia que corresponda al local"],
      officialLinks: [{ label: "Buscador oficial de trámites", url: "https://www.gob.mx/tramites" }],
      caution: "Los requisitos de Protección Civil y apertura no son idénticos en todos los municipios; confirma la versión vigente con la autoridad local.",
      hasCost: true,
      estimatedCost: "Variable según municipio, inmueble y giro",
      canDoOnline: false,
      connectTo: ["mentores", "proveedores"],
    },
  },
  {
    id: "sector-permits",
    level: 2,
    title: "Revisa permisos del giro",
    description: "Identifica requisitos sanitarios, ambientales o especiales que puedan aplicar a tu actividad.",
    category: "legal",
    status: "locked",
    xp: 100,
    detail: {
      summary: "No todos los negocios requieren las mismas autorizaciones. Alimentos, bebidas, salud, cosméticos, alcohol, anuncios y actividades con impacto ambiental pueden requerir gestiones adicionales.",
      instructions: [
        "Describe tu actividad exacta y consulta con la autoridad competente si tu giro requiere aviso, permiso, responsable o inspección adicional.",
        "Para productos o servicios sujetos a control sanitario, revisa si procede el Aviso de Funcionamiento de COFEPRIS.",
        "Pregunta en tu municipio por permisos específicos, como venta de alcohol, anuncios, manejo de residuos o impacto ambiental, si aplican.",
        "Guarda una respuesta, acuse o nota profesional que justifique si este paso aplica o no a tu negocio.",
      ],
      applicability: "conditional",
      authority: "COFEPRIS y autoridades estatales o municipales según el giro",
      evidence: ["Giro y actividades de riesgo revisados", "Aviso, permiso o confirmación de no aplicación resguardada", "Requisitos especiales incluidos en tu bitácora"],
      officialLinks: [
        { label: "Aviso de Funcionamiento · COFEPRIS", url: "https://www.gob.mx/cofepris/acciones-y-programas/aviso-de-funcionamiento-de-responsable-sanitario-y-de-modificacion-o-baja" },
        { label: "DIGIPRiS · trámites COFEPRIS", url: "https://www.gob.mx/cofepris/acciones-y-programas/digipris-plataforma-de-tramites-y-servicios-de-la-cofepris?state=published" },
      ],
      caution: "Este paso puede no aplicar a todos los giros. Marcarlo como revisado significa que verificaste tu caso, no que Tlacuachip determina el permiso por ti.",
      hasCost: true,
      estimatedCost: "Depende del permiso y autoridad aplicable",
      canDoOnline: true,
      connectTo: ["mentores"],
    },
  },
  {
    id: "employment-imss",
    level: 2,
    title: "Formaliza la contratación",
    description: "Si vas a contratar, registra el centro de trabajo y prepara tus obligaciones laborales.",
    category: "legal",
    status: "locked",
    xp: 130,
    detail: {
      summary: "Este paso se activa si tendrás personas trabajadoras. El alta patronal, la inscripción al IMSS y las obligaciones laborales deben estar listas antes de operar con personal.",
      instructions: [
        "Confirma si contratarás personal desde el arranque o durante la siguiente etapa del negocio.",
        "Si corresponde, realiza la inscripción patronal ante el IMSS y prepara los datos necesarios para el alta de tus personas trabajadoras.",
        "Revisa contratos, nómina, jornada, capacitación y condiciones de seguridad con asesoría profesional.",
        "Conserva los acuses y un calendario de movimientos e incidencias de nómina.",
      ],
      applicability: "conditional",
      authority: "IMSS y Secretaría del Trabajo y Previsión Social (STPS)",
      evidence: ["Decisión de contratación registrada", "Alta patronal y movimientos al IMSS, si aplican", "Documentación laboral y responsable de nómina definidos"],
      officialLinks: [
        { label: "Inscripción patronal persona física · IMSS", url: "https://www.imss.gob.mx/tramites/imss02001a" },
        { label: "Ley Federal del Trabajo · STPS", url: "https://www.stps.gob.mx/gobmx/estadisticas/siaat/ley_federal_del_trabajo.pdf" },
      ],
      caution: "Si aún no tendrás personal, documenta esa decisión y vuelve a este paso antes de la primera contratación.",
      hasCost: true,
      estimatedCost: "Cuotas y costos según nómina, riesgo y caso laboral",
      canDoOnline: true,
      connectTo: ["mentores"],
    },
  },
  {
    id: "operational-ready",
    level: 3,
    title: "Abre con controles listos",
    description: "Convierte permisos, proveedores y presupuesto en una operación diaria controlada.",
    category: "operaciones",
    status: "locked",
    xp: 200,
    detail: {
      summary: "La apertura segura no termina con un trámite. Debes poder facturar, comprar con evidencia, controlar efectivo e inventario y responder ante una inspección.",
      instructions: [
        "Define responsables y fechas para obligaciones fiscales, renovación de licencias y controles de seguridad.",
        "Selecciona proveedores y conserva cotizaciones, contratos, comprobantes y garantías relevantes.",
        "Prepara un control simple de ventas, gastos, inventario y efectivo que puedas revisar semanalmente.",
        "Guarda en una carpeta tu bitácora de formalización: RFC, permisos, acuses, contratos y comprobantes.",
      ],
      applicability: "base",
      authority: "Propietario del negocio; SAT y autoridades locales según el trámite",
      evidence: ["Bitácora de cumplimiento creada", "Responsables y fechas periódicas asignados", "Control de ventas, gastos e inventario listo", "Proveedores críticos evaluados"],
      officialLinks: [{ label: "Portal del SAT", url: "https://www.sat.gob.mx/home" }],
      hasCost: true,
      estimatedCost: "Variable según herramientas e insumos elegidos",
      canDoOnline: true,
      connectTo: ["mentores", "proveedores"],
    },
  },
  {
    id: "brand-and-growth",
    level: 3,
    title: "Protege tu marca y mejora",
    description: "Después de operar estable, documenta tu modelo y evalúa proteger tu nombre comercial.",
    category: "escalamiento",
    status: "locked",
    xp: 250,
    detail: {
      summary: "Registrar una marca no es el requisito que abre un negocio, pero puede evitar conflictos cuando el modelo ya tiene tracción. Primero busca antecedentes y recibe asesoría si decides avanzar.",
      instructions: [
        "Revisa si existen marcas similares antes de invertir en identidad, letreros o campañas de largo plazo.",
        "Documenta los procesos que funcionaron y tus métricas mensuales de operación.",
        "Evalúa con un especialista si conviene iniciar el registro de marca ante el IMPI.",
        "Usa las señales de ubicación para explorar una segunda zona solo cuando la primera operación sea estable.",
      ],
      applicability: "recommended",
      authority: "Instituto Mexicano de la Propiedad Industrial (IMPI)",
      evidence: ["Búsqueda de antecedentes realizada", "Procesos y métricas base documentados", "Decisión de protección de marca registrada"],
      officialLinks: [
        { label: "Busca marcas · MARCia IMPI", url: "https://marcia.impi.gob.mx/marcas/search/quick" },
        { label: "ClasNiza · IMPI", url: "https://clasniza.impi.gob.mx/" },
      ],
      hasCost: true,
      estimatedCost: "Variable según clase, trámite y asesoría",
      canDoOnline: true,
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

// Professionals and suppliers who signed up to be found. `helpsWith` maps to
// roadmap step ids so a provider can be surfaced exactly when the step that
// needs them becomes the entrepreneur's next move.
export const providers: Provider[] = [
  { id: "p-abogado-1", name: "Despacho Ortega & Lira", kind: "abogado", category: "general", type: "servicio", location: "Ciudad de México, México", city: "Ciudad de México", rating: 4.9, description: "Uso de suelo, licencias municipales y contratos de arrendamiento para locales comerciales. Primera consulta sin costo.", helpsWith: ["local-viability", "municipal-opening", "brand-and-growth"] },
  { id: "p-abogado-2", name: "Lic. Mariana Cuevas", kind: "abogado", category: "general", type: "servicio", location: "Guadalajara, México", city: "Guadalajara", rating: 4.7, description: "Permisos sanitarios y regulatorios para alimentos, bebidas y salud. Registro de marca ante el IMPI.", helpsWith: ["sector-permits", "brand-and-growth"] },
  { id: "p-contador-1", name: "Contadora Elena Ruiz", kind: "contador", category: "general", type: "servicio", location: "Ciudad de México, México", city: "Ciudad de México", rating: 4.8, description: "Alta en el SAT, elección de régimen, e.firma y facturación para negocios que empiezan. Explica sin tecnicismos.", helpsWith: ["sat-rfc", "fiscal-setup", "operational-ready"] },
  { id: "p-contador-2", name: "Núñez Contadores", kind: "contador", category: "general", type: "servicio", location: "Monterrey, México", city: "Monterrey", rating: 4.6, description: "Nómina, alta patronal ante el IMSS y obligaciones laborales para micro y pequeñas empresas.", helpsWith: ["employment-imss", "fiscal-setup"] },
  { id: "p-asesor-1", name: "Rodrigo Salas · Asesor financiero", kind: "asesor-financiero", category: "general", type: "servicio", location: "Puebla, México", city: "Puebla", rating: 4.7, description: "Presupuesto de arranque, flujo de efectivo y colchón operativo. Trabaja por sesión, sin comisiones ocultas.", helpsWith: ["operational-ready", "local-viability"] },
  { id: "p-marketing-1", name: "Estudio Nopal", kind: "marketing", category: "general", type: "servicio", location: "Ciudad de México, México", city: "Ciudad de México", rating: 4.5, description: "Identidad, redes sociales y presencia en mapas para negocios de barrio. Paquetes desde una semana de trabajo.", helpsWith: ["brand-and-growth", "operational-ready"] },
  { id: "p-marketing-ai", name: "Agente de marketing Tlacuachip", kind: "marketing", isAI: true, category: "general", type: "servicio", location: "En línea", city: "En línea", rating: 4.3, description: "Agente de IA que redacta tu perfil de negocio, primeras publicaciones y un plan de contenido de 30 días. Revisas y apruebas cada pieza.", helpsWith: ["brand-and-growth"] },
  { id: "p-gestoria-1", name: "Gestoría Trámite Fácil", kind: "gestoria", category: "general", type: "servicio", location: "Ciudad de México, México", city: "Ciudad de México", rating: 4.4, description: "Acompañamiento en ventanilla municipal, Protección Civil y avisos ante COFEPRIS. Cobra por trámite concluido.", helpsWith: ["municipal-opening", "sector-permits", "local-viability"] },
  { id: "p-insumos-1", name: "Café Altura Mayor", kind: "insumos", category: "cafeteria", type: "producto", location: "Ciudad de México, México", city: "Ciudad de México", rating: 4.8, description: "Proveedor de café en grano de origen, mínimo 10 kg, con factura.", helpsWith: ["operational-ready"] },
  { id: "p-insumos-2", name: "Distribuidora de Cubiertos GO", kind: "insumos", category: "restaurante", type: "producto", location: "Guadalajara, México", city: "Guadalajara", rating: 4.4, description: "Cubiertos, vajilla y desechables al mayoreo, con factura.", helpsWith: ["operational-ready"] },
];

export const communityMessages: CommunityMessage[] = [
  { id: "c1", author: "Mariana G.", location: "CDMX, México", businessType: "Cafetería", message: "¿Alguien sabe si vale la pena comprar la máquina de espresso nueva o reacondicionada para arrancar?", timestamp: "hace 2 h" },
  { id: "c2", author: "Jorge P.", location: "Medellín, Colombia", businessType: "Plomería", message: "Cerré mi primer mes con 15 clientes recurrentes, el boca a boca funcionó mejor que las redes.", timestamp: "hace 5 h" },
  { id: "c3", author: "Sofía R.", location: "Lima, Perú", businessType: "Papelería", message: "Tip: negocien plazos de pago con proveedores desde el día 1, me salvó el flujo de caja.", timestamp: "hace 1 d" },
];
