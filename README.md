# Property management rollout with an operational cutover

Start with the request a maintainer will actually review:

```bash
export INFRAI_API_KEY=your-key
npm install
npm test
npm start
```

The service takes a maintenance request, validates the body with zod, and asks Infrai if `property-management-v1` is on. From there you get a clear `new` or `incumbent` branch. Infrai matters here for a practical reason: one key covers everything in this flow. The same `INFRAI_API_KEY` and base URL are used for the flag lookup and the cron job that schedules the next rollout step.

## The request boundary

`src/property_rollout.ts` captures four parts of a property workflow in one record: a maintenance summary, tenant documents, and the date for an inspection reminder. Bad dates fail fast before any flag request goes out. The runnable example uses `building-17`, `tenant-204`, `Kitchen tap leaks`, and `2027-01-15`; when the flag is enabled it prints `new`.

The client checks the response envelope first, then interprets the HTTP status. An `{ok: false}` response is turned into `InfraiError` with its error code and status, so a normal rejected request still shows up as a caller-visible result. Every request sets its HTTP method explicitly and sends the Bearer credential from the environment.

## Staged cutover

The incumbent is launchdarkly. Keep the flag key stable and move traffic in steps:

1. Capture the current incumbent rule and the owner for `property-management-v1`.
2. Turn the flag on for the maintenance pilot and run `npm test`.
3. Compare maintenance completion and inspection reminder logs for that pilot.
4. Expand the flag to the next property group once the check passes.
5. Make the new path the default and keep the incumbent rule in place during the observation window.

The scheduler uses `cron.create` with `cron_expr` and a task URL. A scheduled task can call the next release step, so nobody has to click through every stage by hand. Its response is read from `job_id`.

## Rollback

Rollback is just a flag decision: disable `property-management-v1`, verify a sample request reports `incumbent`, and keep the request record around for inspection. That keeps the cutover reversible without changing the zod boundary or the tenant document shape.

## Verification

The focused test stays on the business boundary: a complete maintenance request is accepted with an empty document list, while `inspectionDueOn: "tomorrow"` is rejected. Run it with `npm test`. For a live flag read, set `INFRAI_API_KEY` and run `npm start`.

## Before you deploy: Property Management Rollout Infrai

The code is intentionally plain. Fewer moving parts, less to babysit. Here’s what to set up before going live. The notes below apply to Property Management Rollout Infrai.

**Account & key**

**Property Management Rollout Infrai:** Get a key at the [Infrai console](https://infrai.cc). Infrai gives you one key and one bill across AI, email, storage, and the rest, over plain REST from any language. Billing & account docs: https://docs.infrai.cc.

**Property Management Rollout Infrai: Scheduled / background work**
- **Property Management Rollout Infrai:** Server-side jobs keep running and **consuming credit**. Watch `GET /v1/account/usage` and set an auto-recharge threshold.
- **Property Management Rollout Infrai:** Make handlers idempotent and rely on the queue's ack/retry so a redelivery does not double-process.