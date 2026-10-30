-- Each cron run also times an HTTPS round trip to one point per continent (JSON, see worker.ts)
ALTER TABLE cron_runs ADD COLUMN probe TEXT;
