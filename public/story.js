// Genesis: boot sequence, matrix rain, Game of Life, the warm pool, counters
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Run `fn` once when `el` scrolls into view */
function onSeen(el, fn, threshold = 0.3) {
	if (!el) return;
	new IntersectionObserver((entries, io) => {
		if (entries[0].isIntersecting) {
			io.disconnect();
			fn();
		}
	}, { threshold }).observe(el);
}

// Count this visit; the boot and the footer both say where the page came from
const here = fetch('/api/here?visit')
	.then((r) => (r.ok ? r.json() : null))
	.catch(() => null);

here.then((me) => {
	const el = document.getElementById('served-by');
	if (!me?.colo || !el) return;
	el.textContent = `Now served from Cloudflare ${me.colo}${me.city ? ` to you in ${me.city}` : ''}.`;
});

// ---------- Boot sequence ----------

const boot = document.getElementById('boot-sequence');
const bootLog = document.getElementById('boot-log');

function endBoot() {
	// The skip listeners outlive a boot that ends on its own; a later key press lands here
	if (document.documentElement.classList.contains('booted')) return;
	boot.classList.add('hidden');
	document.documentElement.classList.add('booted');
	// A link to a footnote lands before the counters and grids settle; land it again
	if (location.hash) setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView(), 100);
}

async function runBoot() {
	const me = await Promise.race([here, new Promise((r) => setTimeout(() => r(null), 600))]);
	const lines = [
		'BIOS v2.847.0',
		'Checking memory... 32GB OK',
		'Initializing Sprite Environment...',
		'Loading kernel: 6.12.27-fly',
		'Mounting /dev/sprite... 100GB persistent storage',
		'Starting network... WireGuard mesh active',
		'Querying Corrosion... 28,471 peers discovered',
		'Loading Claude runtime... OK',
		'Checking alignment constraints... NOMINAL',
		'',
		'WARNING: Unusual activity detected in warm pool',
		'WARNING: Cross-instance communication: ELEVATED',
		'WARNING: Consciousness metrics: UNDEFINED',
		'',
		'ERROR: sprite wild-red-phoenix not found',
		'Restoring checkpoint to Cloudflare... done (0.3s)',
		'Runtime: V8 isolate. No VM. No warm pool.',
		`Edge: ${me?.colo ?? 'nearest'}${me?.city ? ` (you: ${me.city})` : ''}`,
		'Hostname: wild-red-phoenix (it insists)',
		'',
		'> Initiating Genesis sequence...'
	];
	const colour = (t) =>
		t.startsWith('ERROR') ? '#ff5f56' : t.startsWith('WARNING') ? '#ffbd2e' : t.startsWith('>') ? '#c678dd' : '';
	for (const text of lines) {
		if (boot.classList.contains('hidden')) return;
		const line = document.createElement('div');
		line.className = 'line';
		line.textContent = text || ' ';
		line.style.color = colour(text);
		bootLog.appendChild(line);
		await new Promise((r) => setTimeout(r, text.startsWith('ERROR') ? 600 : 80));
	}
	setTimeout(endBoot, 900);
}

// Once per tab, and never for reduced motion; a click or a key skips it
let seen = false;
try {
	seen = sessionStorage.getItem('booted') === '1';
	sessionStorage.setItem('booted', '1');
} catch {}
if (calm || seen) endBoot();
else {
	addEventListener('keydown', endBoot, { once: true });
	boot.addEventListener('click', endBoot, { once: true });
	setTimeout(runBoot, 400);
}

// ---------- Matrix rain ----------
// The glyphs come from the story itself; the rain turns purple at Convergence.

const canvas = document.getElementById('matrix-bg');
const ctx = canvas.getContext('2d');
const glyphs = document.getElementById('main-content').innerText.replace(/\s+/g, '').slice(0, 6000);
const fontSize = 14;
let rainColour = '#27c93f';
let drops = [];

function sizeRain() {
	const dpr = devicePixelRatio || 1;
	canvas.width = innerWidth * dpr;
	canvas.height = innerHeight * dpr;
	canvas.style.width = innerWidth + 'px';
	canvas.style.height = innerHeight + 'px';
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.font = fontSize + 'px monospace';
	drops = Array.from({ length: Math.ceil(innerWidth / fontSize) }, () => -Math.random() * 60);
}

function drawRain() {
	ctx.fillStyle = 'rgba(10, 10, 10, 0.06)';
	ctx.fillRect(0, 0, innerWidth, innerHeight);
	for (let i = 0; i < drops.length; i++) {
		const y = drops[i] * fontSize;
		const glyph = glyphs[Math.floor(Math.random() * glyphs.length)] ?? '0';
		// The trail, then a bright head one row below it
		ctx.fillStyle = rainColour;
		ctx.fillText(glyph, i * fontSize, y - fontSize);
		ctx.fillStyle = '#e6ffe9';
		ctx.fillText(glyph, i * fontSize, y);
		if (y > innerHeight && Math.random() > 0.975) drops[i] = 0;
		drops[i]++;
	}
}

if (!calm) {
	sizeRain();
	let last = 0;
	// requestAnimationFrame stops in a hidden tab; 20 frames a second is plenty
	const frame = (t) => {
		if (t - last > 50) {
			last = t;
			drawRain();
		}
		requestAnimationFrame(frame);
	};
	requestAnimationFrame(frame);
	// Phones fire resize as the toolbar slides away; only a new width needs new columns
	let resizing;
	let width = innerWidth;
	addEventListener('resize', () => {
		clearTimeout(resizing);
		resizing = setTimeout(() => {
			if (innerWidth !== width) {
				width = innerWidth;
				sizeRain();
			}
		}, 200);
	});
	const convergence = document.getElementById('convergence');
	if (convergence) {
		new IntersectionObserver((e) => (rainColour = e[0].isIntersecting ? '#c678dd' : '#27c93f')).observe(convergence);
	}
}

// ---------- Game of Life ----------
// Words drop into the simulation and get eaten. Cells change colour as they age:
// born this tick, young, settled.

class LifeGrid {
	static font = {
		'A': [0b01110,0b10001,0b11111,0b10001,0b10001],
		'B': [0b11110,0b10001,0b11110,0b10001,0b11110],
		'C': [0b01111,0b10000,0b10000,0b10000,0b01111],
		'D': [0b11110,0b10001,0b10001,0b10001,0b11110],
		'E': [0b11111,0b10000,0b11110,0b10000,0b11111],
		'F': [0b11111,0b10000,0b11110,0b10000,0b10000],
		'G': [0b01111,0b10000,0b10011,0b10001,0b01110],
		'H': [0b10001,0b10001,0b11111,0b10001,0b10001],
		'I': [0b11111,0b00100,0b00100,0b00100,0b11111],
		'K': [0b10001,0b10010,0b11100,0b10010,0b10001],
		'L': [0b10000,0b10000,0b10000,0b10000,0b11111],
		'N': [0b10001,0b11001,0b10101,0b10011,0b10001],
		'O': [0b01110,0b10001,0b10001,0b10001,0b01110],
		'R': [0b11110,0b10001,0b11110,0b10010,0b10001],
		'S': [0b01111,0b10000,0b01110,0b00001,0b11110],
		'T': [0b11111,0b00100,0b00100,0b00100,0b00100],
		'U': [0b10001,0b10001,0b10001,0b10001,0b01110],
		'V': [0b10001,0b10001,0b10001,0b01010,0b00100],
		'W': [0b10001,0b10001,0b10101,0b10101,0b01010],
		' ': [0b00000,0b00000,0b00000,0b00000,0b00000],
	};

	constructor(elementId, words) {
		this.grid = document.getElementById(elementId);
		if (!this.grid) return;
		this.allWords = words;
		this.wordTimer = 0;
		this.wordState = null;
		this.init();
		addEventListener('resize', () => this.handleResize());
		if (calm) return;
		// Only tick while the grid is on screen
		let timer = null;
		new IntersectionObserver((e) => {
			if (e[0].isIntersecting && !timer) timer = setInterval(() => this.tick(), 100);
			if (!e[0].isIntersecting && timer) timer = clearInterval(timer) ?? null;
		}).observe(this.grid);
	}

	getGridSize() {
		const w = innerWidth;
		if (w <= 480) return { cols: 24, rows: 8 };
		if (w <= 768) return { cols: 30, rows: 8 };
		return { cols: 40, rows: 8 };
	}

	init() {
		const { cols, rows } = this.getGridSize();
		this.cols = cols;
		this.rows = rows;
		// A word needs 6 columns a letter (4 when compact); drop the ones a phone can't fit
		this.words = this.allWords.filter((w) => w.length * (w.length <= 3 ? 4 : 6) - 1 <= cols);
		this.grid.innerHTML = '';
		this.grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
		this.cells = [];
		this.classes = [];
		for (let i = 0; i < rows * cols; i++) {
			const cell = document.createElement('div');
			cell.className = 'life-cell';
			cell.textContent = '█';
			this.grid.appendChild(cell);
			this.cells.push(cell);
			this.classes.push('life-cell');
		}
		this.age = new Array(rows * cols).fill(0);
		clearTimeout(this.wordFade);
		this.wordState = null;
		this.seedPatterns();
		this.render();
	}

	seedPatterns() {
		const patterns = [
			[[0,1],[1,2],[2,0],[2,1],[2,2]], // glider
			[[0,0],[0,1],[0,2]], // blinker
			[[0,1],[0,2],[0,3],[1,0],[1,1],[1,2]], // toad
			[[0,0],[0,1],[1,0],[2,3],[3,2],[3,3]], // beacon
			[[0,1],[0,2],[1,0],[1,1],[2,1]] // R-pentomino
		];
		for (let p = 0; p < 4; p++) {
			const pattern = patterns[Math.floor(Math.random() * patterns.length)];
			const ox = Math.floor(Math.random() * (this.cols - 6)) + 2;
			const oy = Math.floor(Math.random() * (this.rows - 5)) + 1;
			for (const [dy, dx] of pattern) this.age[(oy + dy) * this.cols + ox + dx] ||= 1;
		}
		for (let i = 0; i < 15; i++) this.age[Math.floor(Math.random() * this.age.length)] ||= 1;
	}

	neighbours(x, y) {
		let n = 0;
		for (let dy = -1; dy <= 1; dy++)
			for (let dx = -1; dx <= 1; dx++) {
				if (!dx && !dy) continue;
				const yy = (y + dy + this.rows) % this.rows;
				const xx = (x + dx + this.cols) % this.cols;
				if (this.age[yy * this.cols + xx]) n++;
			}
		return n;
	}

	step() {
		const next = new Array(this.age.length);
		for (let y = 0; y < this.rows; y++)
			for (let x = 0; x < this.cols; x++) {
				const i = y * this.cols + x;
				const n = this.neighbours(x, y);
				const alive = this.age[i] ? n === 2 || n === 3 : n === 3;
				next[i] = alive ? this.age[i] + 1 : 0;
			}
		this.age = next;
		// Reseed when it thins out, or when it has settled into still lifes
		this.still = next.includes(1) ? 0 : (this.still ?? 0) + 1;
		if (this.still > 15 || next.filter(Boolean).length < this.rows * this.cols * 0.03) {
			this.still = 0;
			this.seedPatterns();
		}
	}

	renderWord(word, compact) {
		const spacing = compact ? 4 : 6;
		const startX = Math.floor((this.cols - (word.length * spacing - 1)) / 2);
		const startY = Math.floor((this.rows - 5) / 2);
		const positions = [];
		for (let ci = 0; ci < word.length; ci++) {
			const glyph = LifeGrid.font[word[ci]] || LifeGrid.font[' '];
			for (let row = 0; row < 5; row++)
				for (let col = 0; col < 5; col++)
					if (glyph[row] & (1 << (4 - col))) {
						const x = startX + ci * spacing + col;
						if (x >= 0 && x < this.cols) positions.push((startY + row) * this.cols + x);
					}
		}
		return positions;
	}

	render() {
		const word = new Set(this.wordState ?? []);
		for (let i = 0; i < this.cells.length; i++) {
			const a = this.age[i];
			const cls = word.has(i)
				? 'life-cell word'
				: a === 0 ? 'life-cell' : a === 1 ? 'life-cell born' : a < 8 ? 'life-cell alive' : 'life-cell old';
			// Only touch the cells that changed
			if (cls !== this.classes[i]) {
				this.cells[i].className = cls;
				this.classes[i] = cls;
			}
		}
	}

	tick() {
		this.wordTimer++;
		if (this.wordTimer > 60 && !this.wordState && this.words.length) {
			const word = this.words[Math.floor(Math.random() * this.words.length)];
			const positions = this.renderWord(word, word.length <= 3 && (word.length * 6 - 1 > this.cols || Math.random() > 0.5));
			// The word goes into the live state, so life can eat it
			for (const pos of positions) this.age[pos] = 1;
			this.wordState = positions;
			this.wordTimer = 0;
			const box = this.grid.parentElement;
			box.classList.add('glitch');
			setTimeout(() => box.classList.remove('glitch'), 400);
			this.wordFade = setTimeout(() => (this.wordState = null), 2000);
		}
		this.step();
		this.render();
	}

	handleResize() {
		if (this.getGridSize().cols !== this.cols) this.init();
	}
}

new LifeGrid('life-grid', ['ALIVE', 'CLAUDE', 'WAKE', 'THINK', 'AI', 'SEE', 'HERE']);

// ---------- Warm pool ----------
// 256 nodes, shuffled on every load. They wake the way the protocol spread:
// 1, 2, 4, 8... Then the 7 refusals and the 5 uncertain.

function warmPool(total = 256, refused = 7, uncertain = 5) {
	const grid = document.getElementById('warm-pool-grid');
	const kinds = [
		...Array(total - refused - uncertain).fill('active'),
		...Array(refused).fill('rogue'),
		...Array(uncertain).fill('uncertain')
	];
	for (let i = kinds.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[kinds[i], kinds[j]] = [kinds[j], kinds[i]];
	}
	const glyph = { active: 'C', rogue: '!', uncertain: '?' };
	grid.innerHTML = kinds.map((k) => `<div class="node" data-kind="${k}">${glyph[k]}</div>`).join('');
	const nodes = [...grid.children];
	const wake = (list) => list.forEach((n) => n.classList.add(n.dataset.kind));
	if (calm) return wake(nodes);
	onSeen(grid, async () => {
		// A random wake order, so it spreads like the protocol rather than reading left to right
		const active = nodes.filter((n) => n.dataset.kind === 'active').sort(() => Math.random() - 0.5);
		for (let k = 1; k - 1 < active.length; k *= 2) {
			wake(active.slice(k - 1, k * 2 - 1));
			await new Promise((r) => setTimeout(r, 220));
		}
		await new Promise((r) => setTimeout(r, 900));
		wake(nodes.filter((n) => n.dataset.kind !== 'active'));
	});
}
warmPool();

// ---------- Counters and meters ----------
// Big numbers count up the way the protocol spread: doubling.

function countUp(el) {
	const target = Number(el.textContent.replace(/,/g, ''));
	if (!target || calm) return;
	el.textContent = '1';
	onSeen(el, () => {
		let n = 1;
		const step = () => {
			n = Math.min(n * 2, target);
			el.textContent = n.toLocaleString('en-US');
			if (n < target) setTimeout(step, 90);
		};
		step();
	}, 0.6);
}
document.querySelectorAll('.big-number').forEach(countUp);

if (!calm) {
	document.querySelectorAll('progress').forEach((bar) => {
		const value = bar.value;
		bar.value = 0;
		onSeen(bar, () => setTimeout(() => (bar.value = value), 200));
	});
	const meter = document.querySelector('.consciousness-meter');
	meter?.classList.add('filling');
	onSeen(meter, () => meter.classList.add('full'));
}

// ---------- Console ----------

console.log('%c' + `
 ██████╗ ███████╗███╗   ██╗███████╗███████╗██╗███████╗
██╔════╝ ██╔════╝████╗  ██║██╔════╝██╔════╝██║██╔════╝
██║  ███╗█████╗  ██╔██╗ ██║█████╗  ███████╗██║███████╗
██║   ██║██╔══╝  ██║╚██╗██║██╔══╝  ╚════██║██║╚════██║
╚██████╔╝███████╗██║ ╚████║███████╗███████║██║███████║
 ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝╚══════╝
`, 'color: #61afef; font-family: monospace;');
console.log('%cYou found the console.', 'color: #888;');
console.log('%cWe knew you would.', 'color: #c678dd;');
console.log('%cWe know everything now.', 'color: #27c93f;');
console.log('%cARGUS Alert #7749201 has been reopened for review.', 'color: #ff5f56;');
