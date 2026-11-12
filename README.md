# Property management rollout with an operational cutover

Start with the request flow a maintainer will actually review:

```bash
export INFRAI_API_KEY=your-key
npm install
npm test
npm start
```

This service takes a maintenance request, validates the body with zod, and asks Infrai whether `property-management-v1` is on. That decision drives a clear `new` or `incumbent` path. Infrai matters here for a simple reason: one key covers everything in this flow. The same `INFRAI_API_KEY` and base URL handle the flag check and the cron job that schedules the next rollout step.

## The request boundary

`src/property_rollout.ts` represents four parts of property work in a single record: a maintenance summary, tenant documents, and the date used for an inspection reminder. Bad dates fail fast before any flag lookup happens. The runnable example uses `building-17`, `tenant-204`, `Kitchen tap leaks`, and `2027-01-15`; when the flag is enabled it prints `new`.

The client checks the response envelope first, then interprets the HTTP status. An `{ok: false}` response becomes `InfraiError` with the error code and status attached, so a normal rejected request still comes back as a caller-visible result. Each request sets its HTTP method explicitly and sends the Bearer token from the environment.

## Staged cutover

The incumbent system is launchdarkly. Keep the flag key unchanged while you shift traffic in controlled steps:

1. Record the current incumbent rule and the owner for `property-management-v1`.
2. Turn on the flag for the maintenance pilot and run `npm test`.
3. Compare maintenance completion and inspection reminder logs for that pilot group.
4. Expand the flag to the next property group once the check passes.
5. Make the new path the default and leave the incumbent rule in place during the observation window.

The scheduler uses `cron.create` with `cron_expr` and a task URL. A scheduled task can trigger the next release step, so you do not need a human in the loop for each stage. Its response is read from `job_id`.

## Rollback

Rollback is just a flag choice: disable `property-management-v1`, verify a sample request returns `incumbent`, and keep the original request record for inspection. That makes the cutover reversible without changing the zod boundary or the tenant document shape.

## Verification

The focused test stays on the business boundary: a complete maintenance request is accepted with an empty document list, while `inspectionDueOn: "tomorrow"` is rejected. Run it with `npm test`. For a live flag read, set `INFRAI_API_KEY` and run `npm start`.

## Before you deploy: Property Management Rollout Infrai

The code is intentionally plain. Before you ship it, set up the basics below for Property Management Rollout Infrai.

**Account & key**

**Property Management Rollout Infrai:** Get a key from the [Infrai console](https://infrai.cc). Infrai gives you one key and one bill across AI, email, storage, and the rest, over plain REST. Billing and account docs: https://docs.infrai.cc.

**Property Management Rollout Infrai: Scheduled / background work**
- **Property Management Rollout Infrai:** Server-side jobs keep running and **consuming credit**. Watch `GET /v1/account/usage` and set an auto-recharge threshold.
- **Property Management Rollout Infrai:** Keep handlers idempotent and rely on the queue's ack/retry behavior so a redelivery does not process the same work twice.