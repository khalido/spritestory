// Shared by info.js and cron.js
export const esc = (s) =>
	String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const getJson = (path) => fetch(path).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${path}: ${r.status}`))));

const regions = new Intl.DisplayNames(['en'], { type: 'region' });
export const country = (code) => {
	try {
		return code ? regions.of(code) : '';
	} catch {
		return code;
	}
};

/** Label/value pairs as a two-column grid; empty values are left out */
export const rows = (pairs) =>
	pairs
		.filter(([, v]) => v !== null && v !== undefined && v !== '')
		.map(([k, v]) => `<span class="k">${esc(k)}</span><span class="v">${esc(v)}</span>`)
		.join('');

/** Terminal bars: label, a bar scaled to the largest count, the count */
export function bars(items, width = 24, unit = '') {
	const max = Math.max(1, ...items.map((i) => i.n));
	const pad = Math.max(...items.map((i) => i.label.length), 4);
	return items
		.map(({ label, n }) => {
			const filled = Math.max(1, Math.round((n / max) * width));
			return `${esc(label.padEnd(pad))}  <span class="f">${'█'.repeat(filled)}</span><span class="e">${'·'.repeat(width - filled)}</span>  ${n}${unit}`;
		})
		.join('\n');
}

export const utc = (ms) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

export function ago(ms) {
	const m = Math.round((Date.now() - ms) / 60000);
	return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ${m % 60} min ago`;
}
