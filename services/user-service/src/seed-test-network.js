import { hashPassword } from "./auth.js";
import { pool } from "./db.js";
import { createUser, findUserByEmail, replaceUserPassword, upsertProviderProfile } from "./repository.js";

// Accounts intentionally made for the hackathon demo. They are public only
// as "Cuenta demo" and never imply verification, ratings, or real services.
const password = process.env.DEMO_NETWORK_PASSWORD || "TlacuachicDemo2026!";
const providers = [
  { email: "demo.legal@tlacuachic.local", name: "Lucía Ramos · demo", kind: "abogado", city: "Ciudad de México", country: "Mexico", description: "Cuenta de demostración para probar orientación sobre apertura, permisos y contratos de una cafetería.", helpsWith: ["local-viability", "sat-rfc", "municipal-opening"] },
  { email: "demo.contable@tlacuachic.local", name: "Mateo Cruz · demo", kind: "contador", city: "Ciudad de México", country: "Mexico", description: "Cuenta de demostración para probar dudas de RFC, régimen fiscal y control básico de caja.", helpsWith: ["sat-rfc", "fiscal-setup", "operational-ready"] },
  { email: "demo.cafe@tlacuachic.local", name: "Sofía Herrera · demo", kind: "asesor-financiero", city: "Ciudad de México", country: "Mexico", description: "Cuenta de demostración para explorar presupuesto, punto de equilibrio y compras iniciales de cafetería.", helpsWith: ["local-viability", "fiscal-setup", "operational-ready"] },
  { email: "demo.proveedor.cafe@tlacuachic.local", name: "Origen Café · demo", kind: "insumos", city: "Ciudad de México", country: "Mexico", description: "Cuenta de demostración para simular contacto con un proveedor de café, leche y consumibles.", helpsWith: ["operational-ready", "brand-and-growth"] },
  { email: "demo.mentor.laura@tlacuachic.local", name: "Laura Jiménez", kind: "asesor-financiero", city: "Ciudad de México", country: "Mexico", description: "Perfil de prueba para mentoría de cafeterías y coffee shops.", helpsWith: ["local-viability", "operational-ready"] },
  { email: "demo.mentor.carlos@tlacuachic.local", name: "Carlos Medina", kind: "marketing", city: "Guadalajara", country: "Mexico", description: "Perfil de prueba para mentoría de restaurantes y food trucks.", helpsWith: ["brand-and-growth", "operational-ready"] },
  { email: "demo.mentor.ana@tlacuachic.local", name: "Ana Rodríguez", kind: "marketing", city: "Monterrey", country: "Mexico", description: "Perfil de prueba para mentoría de salones de belleza.", helpsWith: ["brand-and-growth", "operational-ready"] },
  { email: "demo.mentor.diego@tlacuachic.local", name: "Diego Torres", kind: "asesor-financiero", city: "Bogotá", country: "Colombia", description: "Perfil de prueba para mentoría de talleres mecánicos.", helpsWith: ["local-viability", "operational-ready"] },
];

for (const profile of providers) {
  let user = await findUserByEmail(profile.email);
  if (!user) user = await createUser({ email: profile.email, passwordHash: await hashPassword(password), name: profile.name, role: "provider" });
  else await replaceUserPassword(user.id, await hashPassword(password));

  await upsertProviderProfile(user.id, profile);
  // Seed through the shared development database instead of relying on a
  // second local process being reachable. The runtime product still uses the
  // authenticated internal catalog endpoint for normal provider signups.
  await pool.query(
    `INSERT INTO tlacuachic_providers
       (id, user_id, name, kind, is_ai, category, type, location, city, country, rating, description, helps_with, is_demo, updated_at)
     VALUES ($1,$2,$3,$4,false,'general','servicio',$5,$6,$7,5,$8,$9,true,now())
     ON CONFLICT (user_id) DO UPDATE SET
       name = EXCLUDED.name, kind = EXCLUDED.kind, location = EXCLUDED.location,
       city = EXCLUDED.city, country = EXCLUDED.country, description = EXCLUDED.description,
       helps_with = EXCLUDED.helps_with, is_demo = true, updated_at = now()`,
    [`u-${user.id}`, user.id, profile.name, profile.kind, `${profile.city}, ${profile.country}`, profile.city, profile.country, profile.description, JSON.stringify(profile.helpsWith)]
  );
  console.log(`${profile.name} — ${profile.email}`);
}

// Clean up the one-off manual connectivity probe if it exists. It has no
// backing user and must not be exposed as a provider.
await pool.query("DELETE FROM tlacuachic_providers WHERE id = $1", ["u-11111111-1111-4111-8111-111111111111"]);

await pool.end();
console.log(`Demo network ready. Shared password: ${password}`);
