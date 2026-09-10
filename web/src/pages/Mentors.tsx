import { mentors } from "../data/mockData";

export default function Mentors() {
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="stack" style={{ gap: 4 }}>
        <h1>Mentores para ti</h1>
        <p>Personas que ya recorrieron este camino y pueden guiarte.</p>
      </div>

      <div className="grid-2">
        {mentors.map((m) => (
          <div key={m.id} className="card row" style={{ alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: m.avatarColor,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              {m.name.charAt(0)}
            </div>
            <div className="stack" style={{ gap: 2, flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</span>
              <span className="muted">{m.expertise}</span>
              <span className="muted">
                {m.location} · {m.businessesOpened} negocios · ★ {m.rating}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
