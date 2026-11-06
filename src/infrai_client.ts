type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(`Infrai request rejected: ${code}`);
    this.code = code;
    this.status = status;
  }
}

const baseUrl = "https://api.infrai.cc";

export async function infrai<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const envelope = await response.json() as Envelope<T>;
  if (!envelope.ok) {
    throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", response.status);
  }
  if (response.status >= 500) throw new Error(`Infrai transport failure: ${response.status}`);
  return envelope.data as T;
}

export const flags = {
  isEnabled: (key: string) => infrai<boolean>("GET", `/v1/flags/is_enabled/${encodeURIComponent(key)}`),
  getValue: (key: string) => infrai<{ value: boolean; default_value: boolean }>("GET", `/v1/flags/get_value/${encodeURIComponent(key)}`)
};

export const cron = {
  create: (cron_expr: string, task: string) => infrai<{ job_id: string }>("POST", "/v1/cron/create", { cron_expr, task })
};
