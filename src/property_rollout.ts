import { z } from "zod";
import { cron, flags } from "./infrai_client.ts";

export const maintenanceRequest = z.object({
  propertyId: z.string().min(1),
  tenantId: z.string().min(1),
  summary: z.string().min(1),
  documents: z.array(z.string()).default([]),
  inspectionDueOn: z.string().date()
});

export type MaintenanceRequest = z.infer<typeof maintenanceRequest>;
export type MaintenanceDecision = { path: "new" | "incumbent"; request: MaintenanceRequest };

export async function routeMaintenance(input: unknown, flagKey = "property-management-v1"): Promise<MaintenanceDecision> {
  const request = maintenanceRequest.parse(input);
  const enabled = await flags.isEnabled(flagKey);
  return { path: enabled ? "new" : "incumbent", request };
}

export async function scheduleInspectionReminder(taskUrl: string): Promise<string> {
  const job = await cron.create("0 8 * * *", taskUrl);
  return job.job_id;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = {
    propertyId: "building-17",
    tenantId: "tenant-204",
    summary: "Kitchen tap leaks",
    documents: ["lease-204.pdf"],
    inspectionDueOn: "2027-01-15"
  };
  const decision = await routeMaintenance(input);
  console.log(JSON.stringify({ decision: decision.path, propertyId: decision.request.propertyId }));
}
