// /info: what Cloudflare knows about this visit, the path it took, and the visit log
import { register, mount } from 'https://cdn.jsdelivr.net/npm/pele@1.12.0/core/+esm';
import flowchart from 'https://cdn.jsdelivr.net/npm/pele@1.12.0/diagrams/flowchart/+esm';
import xychart from 'https://cdn.jsdelivr.net/npm/pele@1.12.0/diagrams/xychart/+esm';
import { MASK } from './map-mask.js';
import { bars, country, esc, getJson, rows, utc, ago } from './pages.js';

register(flowchart, xychart);

// Cloudflare names its data centres by the nearest airport code. The common ones; the rest show the code alone.
const COLOS = {
	SYD: 'Sydney', MEL: 'Melbourne', BNE: 'Brisbane', PER: 'Perth', ADL: 'Adelaide', CBR: 'Canberra',
	AKL: 'Auckland', SIN: 'Singapore', HKG: 'Hong Kong', NRT: 'Tokyo', KIX: 'Osaka', ICN: 'Seoul',
	TPE: 'Taipei', MNL: 'Manila', BKK: 'Bangkok', KUL: 'Kuala Lumpur', CGK: 'Jakarta', BOM: 'Mumbai',
	DEL: 'Delhi', BLR: 'Bangalore', MAA: 'Chennai', KHI: 'Karachi', LHE: 'Lahore', ISB: 'Islamabad',
	DXB: 'Dubai', DOH: 'Doha', JNB: 'Johannesburg', CPT: 'Cape Town', NBO: 'Nairobi', LOS: 'Lagos',
	CAI: 'Cairo', LHR: 'London', MAN: 'Manchester', DUB: 'Dublin', AMS: 'Amsterdam', FRA: 'Frankfurt',
	CDG: 'Paris', MAD: 'Madrid', MXP: 'Milan', ZRH: 'Zurich', VIE: 'Vienna', ARN: 'Stockholm',
	CPH: 'Copenhagen', WAW: 'Warsaw', IST: 'Istanbul', IAD: 'Ashburn', EWR: 'Newark', BOS: 'Boston',
	ORD: 'Chicago', ATL: 'Atlanta', MIA: 'Miami', DFW: 'Dallas', DEN: 'Denver', SEA: 'Seattle',
	SJC: 'San Jose', LAX: 'Los Angeles', YYZ: 'Toronto', YVR: 'Vancouver', GRU: 'São Paulo',
	EZE: 'Buenos Aires', SCL: 'Santiago', BOG: 'Bogotá', MEX: 'Mexico City'
};
const coloName = (code) => (code ? `${code}${COLOS[code] ? ` · ${COLOS[code]}` : ''}` : '');

// Mermaid labels: keep it to plain words so a network name can't break the syntax
const label = (s) => String(s ?? '').replace(/[^\p{L}\p{N} .,·/-]/gu, '').slice(0, 40);

function drawMap(points, you) {
	const w = MASK.rows[0].length, h = MASK.rows.length;
	const xy = (lat, lon) => [((lon + 180) / 360) * w, (MASK.top - lat) / MASK.step];
	let svg = '';
	MASK.rows.forEach((row, r) => {
		for (let c = 0; c < w; c++) if (row[c] === '#') svg += `<circle class="land" cx="${c + 0.5}" cy="${r + 0.5}" r="0.32"/>`;
	});
	const max = Math.max(1, ...points.map((p) => p.n));
	for (const p of points) {
		const [x, y] = xy(p.lat, p.lon);
		svg += `<circle class="seen" cx="${x}" cy="${y}" r="${(0.45 + 0.9 * Math.sqrt(p.n / max)).toFixed(2)}"/>`;
	}
	if (you?.lat != null) {
		const [x, y] = xy(you.lat, you.lon);
		svg += `<circle class="you-ring" cx="${x}" cy="${y}" r="0.6"/><circle class="you" cx="${x}" cy="${y}" r="0.6"/>`;
	}
	const map = document.getElementById('map');
	map.setAttribute('viewBox', `0 0 ${w} ${h}`);
	map.innerHTML = svg;
}

function showHere(me) {
	const place = [me.city, me.region, country(me.country)].filter(Boolean).join(', ');
	document.getElementById('you').innerHTML = rows([
		['location', place],
		['timezone', me.timezone],
		['network', me.asn ? `AS${me.asn}${me.asOrganization ? ` · ${me.asOrganization}` : ''}` : ''],
		['protocol', [me.httpProtocol, me.tlsVersion].filter(Boolean).join(' · ')],
		['cipher', me.tlsCipher],
		['tcp rtt', me.rttMs ? `${me.rttMs} ms` : ''],
		['ray id', me.ray]
	]);
	document.getElementById('machine').innerHTML = rows([
		['edge', coloName(me.colo)],
		['runtime', `${me.runtime} · a V8 isolate, not a VM`],
		['isolate', me.isolate?.bornAt ? `woke ${ago(me.isolate.bornAt)} · you're request ${me.isolate.served}` : ''],
		['storage', 'D1, SQLite at the edge'],
		['cron', 'every 2 hours, see /cron']
	]);
	const from = label([me.city, me.asOrganization].filter(Boolean).join(' · ')) || 'somewhere';
	const wire = label([me.httpProtocol, me.tlsVersion].filter(Boolean).join(' · ')) || 'https';
	mount(
		document.getElementById('path'),
		`flowchart LR
  you["you<br/>${from}"] -- "${wire}" --> edge["Cloudflare ${label(me.colo) || 'edge'}"]
  edge --> worker["spritestory Worker"]
  worker --> files[("story files")]
  worker --> db[("D1: visits")]`,
		{ zoom: false }
	);
}

function showStats(s, me) {
	document.getElementById('numbers').innerHTML = [
		[s.day, 'last 24 h'],
		[s.week, 'last 7 days'],
		[s.total, 'since the move']
	]
		.map(([n, l]) => `<div><div class="n">${n.toLocaleString()}</div><div class="l">${l}</div></div>`)
		.join('');
	drawMap(s.points, me);
	// Every day of the last 14, zero where nobody came
	const counts = Object.fromEntries(s.byDay.map((d) => [d.day, d.n]));
	const days = Array.from({ length: 14 }, (_, i) =>
		new Date(s.at - (13 - i) * 86_400_000).toISOString().slice(0, 10)
	);
	mount(
		document.getElementById('days'),
		`xychart-beta
  x-axis [${days.map((d) => `"${d.slice(5)}"`).join(', ')}]
  y-axis "visits"
  bar [${days.map((d) => counts[d] ?? 0).join(', ')}]`,
		{ height: 220, zoom: false }
	);
	const width = innerWidth < 600 ? 10 : 24;
	document.getElementById('countries').innerHTML = bars(
		s.countries.map((c) => ({ label: country(c.country), n: c.n })),
		width
	);
	document.getElementById('colos').innerHTML = bars(
		s.colos.map((c) => ({ label: coloName(c.colo), n: c.n })),
		width
	);
	document.getElementById('rolled').innerHTML = `Counts as of ${esc(utc(s.at))} (${esc(ago(s.at))}), from the last <a href="/cron">cron</a> rollup.`;
}

const me = await getJson('/api/here?visit').catch(() => null);
if (me) showHere(me);
else document.getElementById('you').innerHTML = rows([['error', "couldn't reach the edge"]]);
getJson('/api/stats')
	.then((s) => showStats(s, me))
	.catch(() => (document.getElementById('rolled').textContent = "Couldn't load the visit log."));
