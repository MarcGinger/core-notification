# Runbook: GsnestMicroserviceStarter

## Service Description

---

## Startup/Shutdown Procedures

- **Start:**
  - `npm run start:prod` or `docker-compose up --build`
- **Shutdown:**
  - Use standard process signals (SIGINT/SIGTERM). The service will gracefully unsubscribe from all streams and clean up resources.

---

## Monitoring & Alerts

- Monitor logs for `error` and `warn` entries with context (stream, method, etc.).
- Set up alerts for repeated projection failures or missed checkpoints.
- Integrate logs with your observability platform (e.g., ELK, Datadog).

---

## Troubleshooting

- **Redis Unavailable:**
  - Check Redis connection and restart the service if needed.
- **EventStoreDB Errors:**
  - Check EventStoreDB health and logs. Service will retry on transient errors.
- **Projection Not Updating:**
  - Check logs for errors. Use `resetProjectionStream` to force a resync.
- **Missed Events:**
  - Use catchup logic or reset projections to reprocess events.

---

## Backup & Restore

- **Backup:**
  - Regularly back up Redis data (RDB or AOF files).
- **Restore:**
  - Restore Redis from backup and restart the service. Projections will resume from last checkpoint.

---

## Contact & Escalation

- For support, contact the platform engineering team or service owner listed in your internal documentation.

---

For further details, see inline code documentation and comments in the service implementation.
