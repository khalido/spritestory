// /cron: the real Cron Trigger's schedule and its last runs, from /api/stats
import { bars, esc, getJson, rows, utc, ago } from './pages.js';

// "0 */2 * * *": the next even UTC hour
function nextRun(now = new Date()) {
	const next = new Date(now);
	next.setUTCMinutes(0, 0, 0);
	next.setUTCHours(now.getUTCHours() + (now.getUTCHours() % 2 === 0 ? 2 : 1));
	return next;
}

function tick() {
	const next = nextRun();
	const mins = Math.ceil((next - Date.now()) / 60000);
	document.getElementById('next').innerHTML = rows([
		['next run', `${utc(next.getTime())} · in ${Math.floor(mins / 60)} h ${mins % 60} min`]
	]);
}
tick();
setInterval(tick, 30_000);

getJson('/api/here?visit').catch(() => {});
// The latest run that probed: an HTTPS round trip from wherever Cloudflare ran it
function showProbe(run) {
	if (!run) {
		document.getElementById('probe').innerHTML = '<span class="t">no probe yet: the next run does one</span>';
		return;
	}
	const { colo, pings } = run.probe;
	const lost = pings.filter((p) => p.ms === null).map((p) => p.place);
	document.getElementById('probe').innerHTML =
		bars(
			pings.filter((p) => p.ms !== null).map((p) => ({ label: `${colo ?? '?'} → ${p.place}`, n: p.ms })),
			innerWidth < 600 ? 10 : 24,
			' ms'
		) + (lost.length ? `\n<span class="t">no answer: ${esc(lost.join(', '))}</span>` : '');
	document.getElementById('probe-note').innerHTML =
		`HTTPS round trips from Cloudflare ${esc(colo ?? 'somewhere')} to AWS in each region, best of two, ${esc(ago(run.at))}. ` +
		'Cloudflare picks a quiet data centre for each cron run, so the starting point moves.';
}

getJson('/api/stats')
	.then(({ runs }) => {
		showProbe(runs.find((r) => r.probe));
		document.getElementById('log').innerHTML = runs.length
			? runs
					.map(
						(r) =>
							`<span class="t">[${esc(utc(r.at))}]</span> rollup <span class="ok">ok</span> · ${r.ms} ms · ${r.visits.toLocaleString()} visits · ${esc(r.via)}${r.probe?.colo ? ` from ${esc(r.probe.colo)}` : ''} <span class="t">(${esc(ago(r.at))})</span>`
					)
					.join('\n')
			: '<span class="t">no runs yet</span>';
	})
	.catch(() => (document.getElementById('log').textContent = "Couldn't read the log."));
