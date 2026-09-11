import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const services = [
  ["market", "server"],
  ["users", "services/user-service"],
  ["catalog", "services/catalog-service"],
  ["web", "web"],
];

const children = services.map(([name, cwd]) => {
  const child = spawn("npm", ["run", "dev"], { cwd: resolve(root, cwd), stdio: ["inherit", "pipe", "pipe"] });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  }
  child.on("exit", (code) => {
    if (code && code !== 0) console.error(`[${name}] stopped with ${code}`);
  });
  return child;
});

function stop() {
  for (const child of children) child.kill("SIGTERM");
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
