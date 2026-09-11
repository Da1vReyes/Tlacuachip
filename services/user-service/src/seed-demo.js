import { hashPassword } from "./auth.js";
import { createUser, findUserByEmail, replaceUserPassword, upsertBusinessProfile, updatePreferences, completeStep } from "./repository.js";

const email = process.env.DEMO_ACCOUNT_EMAIL || "demo@tlacuachic.local";
const password = process.env.DEMO_ACCOUNT_PASSWORD || "TlacuachicDemo2026!";

let user = await findUserByEmail(email);
if (!user) {
  user = await createUser({ email, passwordHash: await hashPassword(password), name: "Ana Demo", role: "entrepreneur" });
} else {
  await replaceUserPassword(user.id, await hashPassword(password));
}

await upsertBusinessProfile(user.id, {
  businessType: "Cafetería de barrio",
  category: "cafeteria",
  budget: 120000,
  country: "Mexico",
  state: "Ciudad de México",
  city: "Ciudad de México",
  experience: "poca",
  description: "Café de especialidad para personas que trabajan y viven cerca de la Roma Norte.",
});
await updatePreferences(user.id, { visibility: "business", locationPrecision: "city", onboardingComplete: true, locationMode: "explore", tutorialSeen: false });
await completeStep(user.id, "local-viability", 100);

console.log(`Demo account ready: ${email}`);
console.log(`Demo password: ${password}`);
