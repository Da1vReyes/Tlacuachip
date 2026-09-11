import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { IconLeaf, IconRoute, IconChart, IconUsers, IconMap, IconCheck } from "../components/icons";

const programSteps = [
  { icon: IconChart, title: "Cuéntanos tu punto de partida", body: "El giro, presupuesto, ciudad y experiencia nos ayudan a preparar una lectura que sí corresponde a tu contexto." },
  { icon: IconMap, title: "Comprueba quién ya opera cerca", body: "Lee negocios similares mapeados y visita las zonas que quieras validar. Las otras capas se publican solo cuando tienen fuente verificable." },
  { icon: IconRoute, title: "Construye el siguiente paso", body: "Obtén un camino de apertura, recursos oficiales y conexiones con mentores o proveedores cuando te hagan falta." },
];

const lenses = [
  { id: "offer", index: "01", title: "Oferta", short: "Negocios similares mapeados", proof: "Dato real", detail: "Comienza viendo establecimientos similares y su concentración. Es una lectura de oferta; no te dice qué abrir ni garantiza que una zona funcione.", source: "DENUE/INEGI para el piloto de cafeterías en CDMX; OpenStreetMap como fuente complementaria." },
  { id: "formal", index: "02", title: "Ruta formal", short: "Fuentes oficiales y evidencia por paso", proof: "México", detail: "La ruta ordena requisitos para abrir y operar formalmente. Cada paso explica qué validar, dónde hacerlo y cuándo una persona experta puede ayudarte.", source: "La decisión sigue siendo tuya; Tlacuachic enlaza fuentes oficiales y no sustituye asesoría profesional." },
  { id: "network", index: "03", title: "Red humana", short: "Contacta a quien resuelve el siguiente paso", proof: "Tu control", detail: "Cuando una tarea requiere experiencia, puedes solicitar contacto con un profesional. Solo se vuelve parte de tu equipo si ambas personas aceptan colaborar.", source: "Tú eliges qué información compartir, puedes revocar visibilidad y eliminar tu cuenta." },
] as const;

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [activeLens, setActiveLens] = useState<(typeof lenses)[number]["id"]>("offer");
  const start = () => navigate(user ? "/formulario" : "/auth");
  const lens = lenses.find((item) => item.id === activeLens) ?? lenses[0];
  const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <button className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Ir al inicio">
          <span className="sidebar-logo-mark"><IconLeaf size={17} /></span><span>Tlacuachic</span>
        </button>
        <nav aria-label="Navegación principal"><button type="button" onClick={() => scrollToSection("como-funciona")}>Cómo funciona</button><button type="button" onClick={() => scrollToSection("datos")}>Tus datos</button><button type="button" onClick={() => scrollToSection("red")}>Para proveedores</button></nav>
        <button className="landing-login" onClick={() => navigate(user ? "/dashboard" : "/auth")}>{user ? "Ir a mi negocio" : "Iniciar sesión"}</button>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy landing-enter">
            <span className="landing-eyebrow">Para quien quiere emprender en México</span>
            <h1>De una idea a un negocio que puede operar.</h1>
            <p className="landing-lede">Evalúa tu zona, entiende qué necesitas para formalizarte y construye un equipo para ejecutar. Todo en un solo lugar y bajo tu control.</p>
            <div className="landing-actions"><button className="btn btn-primary landing-cta" onClick={start}>Crear mi plan de negocio</button><button className="btn btn-secondary landing-cta" onClick={() => scrollToSection("como-funciona")}>Ver cómo funciona</button><span>Primer recorrido: cerca de 4 minutos</span></div>
            <div className="landing-proof-line"><span>Datos con fuente</span><span>Ruta formal guiada</span><span>Privacidad primero</span></div>
          </div>
          <aside className="landing-preview landing-enter" aria-label="Vista previa del análisis">
            <div className="landing-preview-head"><span>Una decisión, evidencia primero</span><span>Explora cada parte</span></div>
            <div className="landing-preview-options" role="tablist" aria-label="Qué hace Tlacuachic">
              {lenses.map((item) => <button key={item.id} type="button" role="tab" aria-selected={activeLens === item.id} className={`landing-preview-reading${activeLens === item.id ? " active" : ""}`} onClick={() => setActiveLens(item.id)}><span className="preview-index">{item.index}</span><span><strong>{item.title}</strong><small>{item.short}</small></span><b>{item.proof}</b></button>)}
            </div>
            <div className="landing-preview-detail" aria-live="polite"><strong>{lens.title}</strong><p>{lens.detail}</p><small>{lens.source}</small></div>
            <p>La herramienta informa, conecta y organiza. La decisión y el control siempre son tuyos.</p>
          </aside>
        </section>

        <section className="landing-section landing-problem">
          <div className="landing-problem-title"><h2>El problema no es falta de ganas. Es falta de contexto.</h2></div>
          <div className="landing-problem-copy">
            <p>Muchos negocios arrancan sin conocer la competencia cercana, los trámites que les aplican o a quién acudir cuando surge una duda. Cuando ese descubrimiento llega tarde, se vuelve caro.</p>
            <p>Tlacuachic convierte esas dudas en una ruta concreta: qué validar primero, dónde encontrar información oficial y a quién pedir ayuda cuando una decisión necesita experiencia.</p>
          </div>
        </section>

        <section id="como-funciona" className="landing-section landing-program">
          <div className="landing-section-intro"><h2>Un programa corto para llegar a algo útil.</h2><p>No es un curso ni una promesa de éxito. Es una forma simple de pasar de una idea a una decisión con más contexto.</p></div>
          <ol className="landing-steps">{programSteps.map((step, index) => <li key={step.title}><div className="landing-step-number">{String(index + 1).padStart(2, "0")}</div><step.icon size={20} /><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}</ol>
        </section>

        <section id="datos" className="landing-section landing-data">
          <div className="landing-data-statement"><h2>Datos claros. Decisiones tuyas.</h2><p>Distinguimos qué viene de una fuente abierta, qué es una estimación del prototipo y qué depende de tu propio negocio.</p></div>
          <div className="landing-data-list">
            <div><IconCheck size={17} /><p><strong>Oferta:</strong> conteos de negocios similares consultados en OpenStreetMap.</p></div>
            <div><IconCheck size={17} /><p><strong>Capas futuras:</strong> demanda y costos solo se publicarán por zona cuando tengan fuente pública verificable.</p></div>
            <div><IconCheck size={17} /><p><strong>Tu perfil:</strong> eliges si compartes datos clave, tu perfil completo o nada con la red.</p></div>
            <div><IconCheck size={17} /><p><strong>Tu control:</strong> puedes modificar visibilidad o eliminar tu registro desde Configuración.</p></div>
          </div>
        </section>

        <section id="red" className="landing-section landing-network">
          <div><h2>Cuando haga falta, no avances solo.</h2><p>Cada paso de la ruta te muestra qué abogado, contador, asesor financiero, agencia de marketing (humana o de IA) o gestoría se registró para atender exactamente ese paso, en tu ciudad. La IA arma la lista; tú decides a quién contactar.</p><button className="btn btn-secondary landing-provider-cta" onClick={() => navigate("/auth?role=provider")}>Ofrezco servicios o productos</button></div>
          <div className="landing-network-list"><span><IconUsers size={18} /> Profesionales sugeridos por paso, no por anuncio</span><span><IconRoute size={18} /> Trámites y pasos explicados sin tecnicismos</span><span><IconChart size={18} /> Presupuesto y señales para revisar antes de invertir</span><small>Los proveedores crean un perfil y aparecen solo cuando su servicio es relevante para el paso en que está un negocio. Siempre verás si hablas con una persona o con un agente de IA.</small></div>
        </section>

        <section className="landing-section landing-model">
          <div><h2>Cómo nos sostenemos, sin vender tus datos.</h2><p>Dos fuentes de ingreso y ninguna es tu información. Lo escribimos aquí para que puedas exigírnoslo.</p></div>
          <div className="landing-model-list">
            <div><b>01</b><div><strong>Suscripción de proveedores</strong><p>Quien ofrece servicios paga por aparecer en la red frente a emprendedores que ya están en el paso donde lo necesitan.</p></div></div>
            <div><b>02</b><div><strong>Comisión por acuerdos cerrados</strong><p>Solo cuando un emprendedor y un proveedor cierran un trato dentro de la plataforma. Si no hay trato, no hay cobro.</p></div></div>
            <div><b>03</b><div><strong>Cero venta de datos</strong><p>Tu perfil no es una mercancía: no se vende, no alimenta publicidad y la IA solo recibe lo que tú elegiste compartir. Lo puedes ver y borrar cuando quieras.</p></div></div>
          </div>
        </section>

        <section className="landing-final"><h2>Empieza por conocer tu zona.</h2><p>Después conviertes esa lectura en un camino para abrir, validar y hacer crecer tu negocio.</p><button className="btn btn-primary landing-cta" onClick={start}>Comenzar ahora</button></section>
      </main>
    </div>
  );
}
