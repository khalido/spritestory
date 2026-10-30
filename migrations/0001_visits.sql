-- One row per page view. No IPs: country, city, the Cloudflare colo that served it,
-- and coordinates rounded to 0.1° (about 10 km).
CREATE TABLE visits (
	id INTEGER PRIMARY KEY,
	at INTEGER NOT NULL, -- unix ms
	country TEXT,
	city TEXT,
	colo TEXT,
	lat REAL,
	lon REAL
);
CREATE INDEX visits_at ON visits (at);

-- Each rollup: the Cron Trigger every 2 hours, or the first /api/stats call with no snapshot
CREATE TABLE cron_runs (
	id INTEGER PRIMARY KEY,
	at INTEGER NOT NULL,
	ms INTEGER NOT NULL,
	visits INTEGER NOT NULL,
	via TEXT NOT NULL
);

-- The latest rollup, as the JSON /api/stats returns
CREATE TABLE snapshot (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	at INTEGER NOT NULL,
	json TEXT NOT NULL
);
