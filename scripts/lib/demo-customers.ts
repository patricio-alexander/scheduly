/**
 * Datos demo para registrar clientes desde tours.
 */
import { nowStamp } from "./menu-ui";

const FIRST = [
  "Ana",
  "Luis",
  "Carla",
  "Pedro",
  "Sofía",
  "Diego",
  "Valeria",
  "Andrés",
  "Lucía",
  "Mateo",
  "Camila",
  "Jorge",
  "Elena",
  "Ricardo",
  "Paula",
  "Sebastián",
  "María",
  "Gabriel",
  "Isabel",
  "Fernando",
];

const LAST = [
  "Mora",
  "Castro",
  "Ríos",
  "Vega",
  "Paredes",
  "Salazar",
  "Guerrero",
  "Ordóñez",
  "Cueva",
  "Burneo",
  "Valdivieso",
  "Samaniego",
  "Palacios",
  "Jiménez",
  "Espinoza",
];

export function buildDemoCustomer(opts: {
  actorTag: string;
  index: number;
  branchHint?: string;
}) {
  const stamp = nowStamp().replace(/[: ]/g, "").slice(-6);
  const first = FIRST[(opts.index + opts.actorTag.length) % FIRST.length];
  const last = LAST[(opts.index * 3 + opts.actorTag.length) % LAST.length];
  const tag = opts.actorTag.replace(/[^a-z0-9_]/gi, "").slice(0, 12).toLowerCase();
  const phone = `09${String(80000000 + ((opts.index + 1) * 137 + tag.length * 11) % 19999999).padStart(8, "0")}`;
  const place = opts.branchHint ? ` · ${opts.branchHint}` : "";

  return {
    name: `${first} ${last}`,
    firstName: first,
    firstLastName: last,
    phone,
    email: `cli.${tag}.${opts.index}.${stamp}@andreaguerrero.ec`,
    address: `Loja${place} · registro tour`,
  };
}
