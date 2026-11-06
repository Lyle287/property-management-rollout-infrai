import test from "node:test";
import assert from "node:assert/strict";
import { maintenanceRequest } from "./property_rollout.ts";

test("the request boundary keeps a complete maintenance record", () => {
  const result = maintenanceRequest.safeParse({
    propertyId: "building-17",
    tenantId: "tenant-204",
    summary: "Kitchen tap leaks",
    inspectionDueOn: "2027-01-15"
  });
  assert.equal(result.success, true);
  if (result.success) assert.deepEqual(result.data.documents, []);
});

test("an invalid inspection date is rejected before the rollout decision", () => {
  const result = maintenanceRequest.safeParse({
    propertyId: "building-17",
    tenantId: "tenant-204",
    summary: "Kitchen tap leaks",
    inspectionDueOn: "tomorrow"
  });
  assert.equal(result.success, false);
});
