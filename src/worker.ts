// spritestory: the story and its pages are static files in ./public. This Worker adds
// a small API. /api/here shows what Cloudflare knows about a visit, and logs it. A Cron
// Trigger rolls the visits up and pings each continent every 2 hours; /api/stats serves the rollup and its runs.

// Just the bits of the Workers types we use; wrangler bundles this without type-checking
interface Stmt {
	bind(...values: unknown[]): Stmt;
	run(): Promise<unknown>;
	first<T>(): Promise<T | null>;
	all<T>(): Promise<{ results: T[] }>;
}
interface Env {
	ASSETS: { fetch(request: Request): Promise<Response> };
	DB: { prepare(sql: string): Stmt; batch(statements: Stmt[]): Promise<{ results: unknown[] }[]> };
	VISIT_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}
interface Ctx {
	waitUntil(promise: Promise<unknown>): void;
}
type Cf = Record<string, string | number | undefined>;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// Module scope lives as long as the isolate: a few minutes to hours, then Cloudflare recycles
// it. The clock reads 0 at startup, so the first request stamps the birth.
let born = 0;
let served = 0;

// Nine fixed points on six continents. AWS's regional DynamoDB endpoints answer /ping, so the
// distance is real geography, not the nearest anycast edge (google.com would be next door).
const PROBES = [
	['us-west-2', 'Oregon'],
	['us-east-1', 'Virginia'],
	['sa-east-1', 'São Paulo'],
	['eu-west-2', 'London'],
	['af-south-1', 'Cape Town'],
	['me-central-1', 'UAE'],
	['ap-south-1', 'Mumbai'],
	['ap-northeast-1', 'Tokyo'],
	['ap-southeast-2', 'Sydney']
] as const;

const json = (data: unknown, maxAge = 0) =>
	new Response(JSON.stringify(data), {
		headers: {
			'content-type': 'application/json',
			'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store'
		}
	});

// About 10 km: enough for a dot on a world map, not enough to find anyone
const coarse = (v: string | number | undefined) =>
	v === undefined || v === '' ? null : Math.round(Number(v) * 10) / 10;

// A few page loads a minute per IP count; past that, a script is padding the numbers
async function shouldLog(request: Request, env: Env) {
	if (!new URL(request.url).searchParams.has('visit')) return false;
	if (!env.VISIT_LIMIT) return true;
	const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
	return (await env.VISIT_LIMIT.limit({ key: ip })).success;
}

async function here(request: Request, env: Env, ctx: Ctx) {
	const cf = ((request as Request & { cf?: Cf }).cf ?? {}) as Cf;
	const visit = {
		country: cf.country ?? null,
		city: cf.city ?? null,
		colo: cf.colo ?? null,
		lat: coarse(cf.latitude),
		lon: coarse(cf.longitude)
	};
	// Only the story and its pages ask with ?visit, once per page load
	if (await shouldLog(request, env)) {
		ctx.waitUntil(
			env.DB.prepare('INSERT INTO visits (at, country, city, colo, lat, lon) VALUES (?, ?, ?, ?, ?, ?)')
				.bind(Date.now(), visit.country, visit.city, visit.colo, visit.lat, visit.lon)
				.run()
		);
	}
	return json({
		...visit,
		region: cf.region ?? null,
		continent: cf.continent ?? null,
		timezone: cf.timezone ?? null,
		asn: cf.asn ?? null,
		asOrganization: cf.asOrganization ?? null,
		httpProtocol: cf.httpProtocol ?? null,
		tlsVersion: cf.tlsVersion ?? null,
		tlsCipher: cf.tlsCipher ?? null,
		// TCP only: 0 or missing over HTTP/3
		rttMs: cf.clientTcpRtt || null,
		ray: request.headers.get('cf-ray'),
		runtime: navigator.userAgent,
		isolate: { bornAt: born, served }
	});
}

// Date.now() stands still while a Worker computes and moves on after I/O, so it can time a fetch
async function timed(url: string) {
	const t = Date.now();
	const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
	await r.arrayBuffer();
	return Date.now() - t;
}

/** Where this run woke, and an HTTPS round trip from there to each probe: best of two,
 *  so a fresh TLS handshake doesn't count against the far ones */
async function probeWorld() {
	const trace = await fetch('https://cloudflare.com/cdn-cgi/trace')
		.then((r) => r.text())
		.catch(() => '');
	const colo = /^colo=(\w+)/m.exec(trace)?.[1] ?? null;
	const pings = await Promise.all(
		PROBES.map(async ([region, place]) => {
			const url = `https://dynamodb.${region}.amazonaws.com/ping`;
			const first = await timed(url).catch(() => null);
			const second = await timed(url).catch(() => null);
			const ok = [first, second].filter((ms) => ms !== null);
			return { region, place, ms: ok.length ? Math.min(...ok) : null };
		})
	);
	return { colo, pings };
}

/** Count everything into one snapshot row and log the run */
async function rollup(env: Env, via: string, probe: unknown = null) {
	const started = Date.now();
	const q = (sql: string, ...values: unknown[]) => env.DB.prepare(sql).bind(...values);
	const [totals, byDay, countries, colos, points] = await env.DB.batch([
		q('SELECT COUNT(*) AS total, SUM(at > ?) AS day, SUM(at > ?) AS week FROM visits', started - DAY, started - 7 * DAY),
		q(
			"SELECT date(at / 1000, 'unixepoch') AS day, COUNT(*) AS n FROM visits WHERE at > ? GROUP BY day ORDER BY day",
			started - 14 * DAY
		),
		q('SELECT country, COUNT(*) AS n FROM visits WHERE country IS NOT NULL GROUP BY country ORDER BY n DESC LIMIT 8'),
		q('SELECT colo, COUNT(*) AS n FROM visits WHERE colo IS NOT NULL GROUP BY colo ORDER BY n DESC LIMIT 8'),
		// One degree cells: a map dot is about two degrees wide
		q('SELECT ROUND(lat) AS lat, ROUND(lon) AS lon, COUNT(*) AS n FROM visits WHERE lat IS NOT NULL GROUP BY 1, 2')
	]);
	const t = totals.results[0] as { total: number; day: number | null; week: number | null };
	const stats = {
		at: started,
		total: t.total,
		day: t.day ?? 0,
		week: t.week ?? 0,
		byDay: byDay.results,
		countries: countries.results,
		colos: colos.results,
		points: points.results
	};
	const ms = Date.now() - started;
	await env.DB.batch([
		q('INSERT OR REPLACE INTO snapshot (id, at, json) VALUES (1, ?, ?)', started, JSON.stringify(stats)),
		q('INSERT INTO cron_runs (at, ms, visits, via, probe) VALUES (?, ?, ?, ?, ?)', started, ms, t.total, via, probe && JSON.stringify(probe)),
		q('DELETE FROM cron_runs WHERE id NOT IN (SELECT id FROM cron_runs ORDER BY id DESC LIMIT 200)')
	]);
	return stats;
}

async function stats(env: Env) {
	const row = await env.DB.prepare('SELECT json FROM snapshot WHERE id = 1').first<{ json: string }>();
	const snapshot = row ? JSON.parse(row.json) : await rollup(env, 'first visit');
	const runs = await env.DB.prepare('SELECT at, ms, visits, via, probe FROM cron_runs ORDER BY id DESC LIMIT 30').all<{
		probe: string | null;
	}>();
	return json({ ...snapshot, runs: runs.results.map((r) => ({ ...r, probe: r.probe && JSON.parse(r.probe) })) }, 60);
}

export default {
	async fetch(request: Request, env: Env, ctx: Ctx) {
		born ||= Date.now();
		served++;
		const { pathname } = new URL(request.url);
		if (pathname === '/api/here') return here(request, env, ctx);
		if (pathname === '/api/stats') return stats(env);
		return env.ASSETS.fetch(request);
	},
	async scheduled(_event: unknown, env: Env, ctx: Ctx) {
		ctx.waitUntil(probeWorld().then((probe) => rollup(env, 'cron', probe)));
	}
};
