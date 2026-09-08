import { c } from "./menu-ui";

export function renderProgress(done: number, total: number, width = 28) {
  const pct = total <= 0 ? 100 : Math.round((done / total) * 100);
  const filled = total <= 0 ? width : Math.round((done / total) * width);
  const bar =
    `${c.brightGreen}${"█".repeat(filled)}${c.reset}` +
    `${c.dim}${"░".repeat(Math.max(0, width - filled))}${c.reset}`;
  return `${bar} ${c.bold}${String(pct).padStart(3, " ")}%${c.reset}  ${done}/${total}`;
}

export type StepResult = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  status: number;
};

export function logStep(index: number, total: number, result: StepResult) {
  const mark = result.ok
    ? `${c.green}OK${c.reset}`
    : `${c.red}FAIL${c.reset}`;
  console.log(
    `  [${String(index).padStart(2, "0")}/${String(total).padStart(2, "0")}] ${mark}  ${result.label}`,
  );
  console.log(`         ${c.dim}${result.detail}${c.reset}`);
  console.log(`         ${renderProgress(index, total)}`);
}
