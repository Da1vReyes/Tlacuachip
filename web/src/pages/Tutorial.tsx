import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  IconForm,
  IconMap,
  IconChart,
  IconRoute,
  IconUsers,
  IconLock,
  IconCheck,
  IconGrid,
} from "../components/icons";

const flowSteps = [
  {
    icon: IconForm,
    title: "1. Cuéntanos tu idea",
    body: "Un formulario corto, una pregunta a la vez: qué quieres emprender, categoría, presupuesto, dónde, tu experiencia y — el paso que más vale la pena llenar — una descripción libre de tu negocio.",
    detail: "Esa descripción es lo que hace que el reporte y las recomendaciones hablen de TU negocio, no solo de tu categoría. Es opcional, pero entre más contexto des, mejor lee la IA tu situación.",
  },
  {
    icon: IconGrid,
    title: "2. Generamos tu reporte con datos reales",
    body: "Contamos negocios similares reales cerca de tu ciudad (OpenStreetMap) y le pedimos a la IA que razone un panorama con eso, tu presupuesto y tu descripción — no un número inventado al azar.",
    detail: "Siempre verás si un dato es real, una estimación razonada por IA, o un cálculo local (cuando la IA no está disponible en ese momento). Nunca se presenta una estimación como si fuera oficial.",
  },
  {
    icon: IconMap,
    title: "3. Decides tu zona",
    body: "Antes del dashboard, comparas tres señales por zona — oferta (real), demanda (estimada) y costo (estimado) — y eliges si estás explorando o ya tienes un local en mente.",
    detail: null,
  },
  {
    icon: IconRoute,
    title: "4. Tu camino",
    body: "Una ruta de formalización paso a paso para México: qué es un requisito base, cuál depende de tu giro o municipio, qué autoridad lo resuelve, y qué evidencia conservas. Nada se marca como completado sin que confirmes esa evidencia.",
    detail: null,
  },
  {
    icon: IconUsers,
    title: "5. Tu equipo",
    body: "Ver abajo — es la parte que más confunde la primera vez.",
    detail: null,
  },
  {
    icon: IconChart,
    title: "6. Dashboard",
    body: "Todo junto: KPIs de tu reporte, proyección de ingresos, tu progreso en la ruta, tu equipo recomendado para el siguiente paso, y el pulso de la comunidad.",
    detail: null,
  },
];

export default function Tutorial() {
  const navigate = useNavigate();
  const { user, businessForm, savePreferences } = useApp();

  const finish = () => {
    savePreferences({ tutorialSeen: true });
    navigate(businessForm ? "/dashboard" : user ? "/formulario" : "/auth");
  };

  return (
    <div className="stack" style={{ gap: 28, maxWidth: 800 }}>
      <div className="stack" style={{ gap: 4 }}>
        <span className="pill">Cómo funciona Tlacuachic</span>
        <h1>De una idea a una decisión informada, en seis partes.</h1>
        <p>Esto es lo que pasa en cada pantalla y por qué existe. Vuelve aquí cuando quieras — el enlace está siempre en el menú.</p>
      </div>

      <div className="stack" style={{ gap: 14 }}>
        {flowSteps.map((s) => (
          <div key={s.title} className="card row" style={{ gap: 16, alignItems: "flex-start" }}>
            <div className="sidebar-logo-mark" style={{ flexShrink: 0 }}>
              <s.icon size={18} />
            </div>
            <div className="stack" style={{ gap: 4 }}>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
              {s.detail && <p className="muted" style={{ fontSize: 12.5 }}>{s.detail}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="card stack" style={{ gap: 14, borderColor: "var(--accentBlue)" }}>
        <div className="row" style={{ alignItems: "center", gap: 8 }}>
          <IconUsers size={18} />
          <h2 style={{ fontSize: 18 }}>Tu equipo, explicado a fondo</h2>
        </div>
        <p>
          Tu ruta de formalización tiene pasos que a veces necesitan a alguien que ya sabe del tema: un contador para
          tu RFC, un abogado para uso de suelo, un asesor para tu presupuesto. Los proveedores en Tlacuachic se
          registran diciendo exactamente en qué pasos ayudan.
        </p>

        <div className="grid-2" style={{ gap: 14 }}>
          <div className="stack" style={{ gap: 6 }}>
            <div className="row" style={{ gap: 6, alignItems: "center" }}>
              <IconRoute size={15} />
              <strong style={{ fontSize: 13.5 }}>Se ordenan por tu siguiente paso</strong>
            </div>
            <p className="muted" style={{ fontSize: 12.5 }}>
              No es una lista fija de anuncios. La IA (o, sin ella, un cálculo local con las mismas reglas) prioriza a
              quien resuelve el paso en el que estás ahora mismo, y después a quien te sirve más adelante en tu ruta.
            </p>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <div className="row" style={{ gap: 6, alignItems: "center" }}>
              <IconLock size={15} />
              <strong style={{ fontSize: 13.5 }}>Ves exactamente qué recibe la IA</strong>
            </div>
            <p className="muted" style={{ fontSize: 12.5 }}>
              En "Tu equipo" hay un botón "Ver exactamente qué se envía": el payload real, no una promesa. Tu correo,
              nombre, presupuesto exacto y dirección nunca se incluyen, sin importar tu configuración de privacidad.
            </p>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <div className="row" style={{ gap: 6, alignItems: "center" }}>
              <IconCheck size={15} />
              <strong style={{ fontSize: 13.5 }}>Tú decides, no la IA</strong>
            </div>
            <p className="muted" style={{ fontSize: 12.5 }}>
              Cada recomendación explica por qué, en tono informativo ("un contador normalmente revisa…"), nunca
              como una orden. Guardar en tu equipo no contacta a nadie automáticamente — la decisión y el contacto son tuyos.
            </p>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <div className="row" style={{ gap: 6, alignItems: "center" }}>
              <IconUsers size={15} />
              <strong style={{ fontSize: 13.5 }}>También puedes ser el proveedor</strong>
            </div>
            <p className="muted" style={{ fontSize: 12.5 }}>
              Si ofreces servicios, te registras del otro lado ("Ofrezco servicios"), publicas tu perfil y eliges en
              qué pasos ayudas. Apareces solo cuando eso es relevante, nunca como un anuncio genérico.
            </p>
          </div>
        </div>
      </div>

      <div className="row" style={{ flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={finish}>
          {businessForm ? "Ir a mi dashboard" : "Empezar"}
        </button>
        {businessForm && (
          <button className="btn btn-secondary" onClick={() => navigate("/equipo")}>
            Ver mi equipo ahora
          </button>
        )}
      </div>
    </div>
  );
}
