import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const inputs = process.argv.slice(2).length ? process.argv.slice(2) : [
  "/Users/daiv/Downloads/denue_00_72_1_csv.zip",
  "/Users/daiv/Downloads/denue_00_72_2_csv.zip",
  "/Users/daiv/Downloads/denue_00_81_1_csv.zip",
  "/Users/daiv/Downloads/denue_00_81_2_csv.zip",
];
const stateCode = process.env.DENUE_STATE_CODE || "09"; // CDMX pilot

// SCIAN groups mapped to the business categories supported by Tlacuachic.
// Prefix matching is intentional: the latest DENUE releases may add a more
// specific six-digit child class without breaking the importer.
const categoryFor = (code) => {
  if (code.startsWith("722515")) return "cafeteria";
  if (code.startsWith("72251") || code.startsWith("72252")) return "restaurante";
  if (code.startsWith("812110")) return "salon-belleza";
  if (code.startsWith("81111") || code.startsWith("81112")) return "taller-mecanico";
  return null;
};

function csv(line) {
  const values = []; let value = ""; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') { if (quoted && line[i + 1] === '"') { value += char; i += 1; } else quoted = !quoted; }
    else if (char === "," && !quoted) { values.push(value); value = ""; }
    else value += char;
  }
  values.push(value); return values;
}

async function importZip(path, output) {
  if (!existsSync(path)) throw new Error(`No existe: ${path}`);
  const child = spawn("unzip", ["-p", path, "conjunto_de_datos/*.csv"], { stdio: ["ignore", "pipe", "inherit"] });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  let index = null; let count = 0;
  for await (const line of lines) {
    if (!index) { index = Object.fromEntries(csv(line).map((key, position) => [key, position])); continue; }
    const values = csv(line);
    if (values[index.cve_ent] !== stateCode) continue;
    const category = categoryFor(values[index.codigo_act] ?? "");
    const lat = Number(values[index.latitud]); const lng = Number(values[index.longitud]);
    if (!category || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    output.push({ id: values[index.id], category, name: values[index.nom_estab] || values[index.nombre_act], kind: values[index.nombre_act], lat, lng, stateCode, municipality: values[index.municipio], updatedAt: values[index.fecha_alta] });
    count += 1;
  }
  await new Promise((resolvePromise, reject) => child.on("close", (code) => code === 0 ? resolvePromise() : reject(new Error(`${path} terminó con ${code}`))));
  return count;
}

const points = [];
for (const input of inputs) console.log(`Importando ${input}: ${await importZip(input, points)} registros útiles`);
mkdirSync(resolve(root, "server/data"), { recursive: true });
writeFileSync(resolve(root, "server/data/denue-snapshot.json"), JSON.stringify({ source: "INEGI DENUE descarga masiva", importedAt: new Date().toISOString(), points }));
console.log(`Snapshot ${stateCode} listo: ${points.length} establecimientos en server/data/denue-snapshot.json`);
