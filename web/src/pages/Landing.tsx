import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { IconLeaf, IconRoute, IconChart, IconUsers, IconMap, IconCheck } from "../components/icons";

const programSteps = [
  { icon: IconChart, title: "Cuéntanos tu punto de partida", body: "El giro, presupuesto, ciudad y experiencia nos ayudan a preparar una lectura que sí corresponde a tu contexto." },
  { icon: IconMap, title: "Compara tu zona con tres señales", body: "Lee oferta, demanda estimada y costo operativo. Puedes explorar zonas o validar un local que ya tienes." },
  { icon: IconRoute, title: "Construye el siguiente paso", body: "Obtén un camino de apertura, recursos oficiales y conexiones con mentores o proveedores cuando te hagan falta." },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useApp();
  const start = () => navigate(user ? "/formulario" : "/auth");

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <button className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Ir al inicio">
          <span className="sidebar-logo-mark"><IconLeaf size={17} /></span><span>Tlacuachip</span>
        </button>
        <nav aria-label="Navegación principal"><a href="#como-funciona">Cómo funciona</a><a href="#datos">Tus datos</a><a href="#red">Para proveedores</a></nav>
        <button className="landing-login" onClick={() => navigate(user ? "/dashboard" : "/auth")}>{user ? "Ir a mi negocio" : "Iniciar sesión"}</button>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy landing-enter">
            <h1>No tienes que saberlo todo para empezar bien.</h1>
            <p className="landing-lede">Una idea y ganas de emprender deberían ser suficientes para dar el primer paso. Tlacuachip te ayuda a descubrir qué necesitas revisar antes de invertir tu dinero.</p>
            <div className="landing-actions"><button className="btn btn-primary landing-cta" onClick={start}>Quiero emprender</button><span>Sin costo en este prototipo · toma cerca de 4 minutos</span></div>
          </div>
          <aside className="landing-preview landing-enter" aria-label="Vista previa del análisis">
            <div className="landing-preview-head"><span>Una decisión, tres lecturas</span><span>Tu ciudad</span></div>
            <div className="landing-preview-reading"><span className="preview-index">01</span><div><strong>Oferta</strong><small>Negocios similares mapeados</small></div><b>Dato real</b></div>
            <div className="landing-preview-reading"><span className="preview-index">02</span><div><strong>Demanda</strong><small>Oportunidad de consumo estimada</small></div><b>Estimación</b></div>
            <div className="landing-preview-reading"><span className="preview-index">03</span><div><strong>Costos</strong><small>Presión operativa relativa</small></div><b>Estimación</b></div>
            <p>El análisis no decide por ti. Te da las preguntas y señales para decidir mejor.</p>
          </aside>
        </section>

        <section className="landing-section landing-problem">
          <div className="landing-problem-title"><h2>El problema no es falta de ganas. Es falta de contexto.</h2></div>
          <div className="landing-problem-copy">
            <p>Muchos negocios arrancan sin conocer la competencia cercana, el costo real de operar o los trámites que deben resolver. Cuando ese descubrimiento llega tarde, se vuelve caro.</p>
            <p>Tlacuachip convierte esas dudas en una ruta concreta: qué validar primero, dónde encontrar información oficial y a quién pedir ayuda cuando una decisión necesita experiencia.</p>
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
            <div><IconCheck size={17} /><p><strong>Demanda y costos:</strong> estimaciones señaladas como tales, no consejos financieros.</p></div>
            <div><IconCheck size={17} /><p><strong>Tu perfil:</strong> eliges si compartes datos clave, tu perfil completo o nada con la red.</p></div>
            <div><IconCheck size={17} /><p><strong>Tu control:</strong> puedes modificar visibilidad o eliminar tu registro desde Configuración.</p></div>
          </div>
        </section>

        <section id="red" className="landing-section landing-network">
          <div><h2>Cuando haga falta, no avances solo.</h2><p>El camino conecta cada necesidad con recursos oficiales, personas que ya abrieron negocios parecidos y proveedores que entienden el giro.</p><button className="btn btn-secondary landing-provider-cta" onClick={() => navigate("/proveedor/nuevo")}>Ofrezco servicios o productos</button></div>
          <div className="landing-network-list"><span><IconUsers size={18} /> Mentores con experiencia práctica</span><span><IconRoute size={18} /> Trámites y pasos explicados sin tecnicismos</span><span><IconChart size={18} /> Presupuesto y señales para revisar antes de invertir</span><small>Los proveedores pueden crear un perfil para aparecer cuando su servicio sea relevante para un negocio.</small></div>
        </section>

        <section className="landing-final"><h2>Empieza por conocer tu zona.</h2><p>Después conviertes esa lectura en un camino para abrir, validar y hacer crecer tu negocio.</p><button className="btn btn-primary landing-cta" onClick={start}>Comenzar ahora</button></section>
      </main>
    </div>
  );
}
