import './bootstrap';
import Alpine from 'alpinejs';
import routerLabData from './router-sim.js';
import notesPdfData from './notes-pdf.js';

window.Alpine = Alpine;

function nodeById(nodes, id) {
    return nodes.find((n) => n.id === id);
}

function buildMacTable(steps, step) {
    const table = [];
    for (let i = 0; i <= step; i++) {
        const add = steps[i]?.animate?.mac_table_add;
        if (add) table.push({ ...add });
    }
    return table;
}

function normalizeHighlights(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

Alpine.data('topologyAnimation', (content) => ({
    steps: content.steps ?? [],
    nodes: content.nodes ?? [],
    links: content.links ?? [],
    step: 0,
    packets: [],
    highlights: [],
    macTable: [],
    hasMacTable: false,

    init() {
        this.hasMacTable = this.steps.some((s) => s.animate?.mac_table_add);
        this.renderStep();
    },

    isHighlighted(id) {
        return this.highlights.includes(id);
    },

    next() {
        if (this.step < this.steps.length - 1) {
            this.step++;
            this.renderStep();
        }
    },

    prev() {
        if (this.step > 0) {
            this.step--;
            this.renderStep();
        }
    },

    packetTransform(step, slot) {
        const p = this.packets.find((pkt) => pkt.step === step && pkt.slot === slot);
        return p ? `translate(${p.x} ${p.y})` : 'translate(0 0)';
    },

    renderStep() {
        const i = this.step;
        const spec = this.steps[i]?.animate ?? {};
        this.highlights = normalizeHighlights(spec.highlight);
        if (this.hasMacTable) {
            this.macTable = buildMacTable(this.steps, this.step);
        }

        const packets = [];
        const addPacket = (from, to) => {
            packets.push({
                step: i,
                slot: packets.length,
                label: spec.label ?? '',
                x: from.x,
                y: from.y,
                from: { x: from.x, y: from.y },
                to: { x: to.x, y: to.y },
            });
        };

        if (spec.flood) {
            const source = nodeById(this.nodes, spec.packet_from);
            if (source) {
                this.nodes
                    .filter((n) => n.id !== spec.packet_from)
                    .forEach((n) => addPacket(source, n));
            }
        } else if (spec.packet_from && spec.packet_to) {
            const from = nodeById(this.nodes, spec.packet_from);
            const to = nodeById(this.nodes, spec.packet_to);
            if (from && to) addPacket(from, to);
        }
        this.packets = packets;
        this.packets.forEach((p) => this.animatePacket(p));
    },

    animatePacket(p) {
        const t0 = performance.now();
        const dur = 900;
        const frame = (t) => {
            const k = Math.min(1, (t - t0) / dur);
            p.x = p.from.x + (p.to.x - p.from.x) * k;
            p.y = p.from.y + (p.to.y - p.from.y) * k;
            if (k < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    },
}));

Alpine.data('encapsulationAnimation', (steps) => ({
    steps,
    step: 0,
    get state() {
        return this.steps[this.step]?.state ?? 'app';
    },
    get progress() {
        return this.step + 1;
    },
    get total() {
        return this.steps.length;
    },
    next() {
        if (this.step < this.steps.length - 1) this.step++;
    },
    prev() {
        if (this.step > 0) this.step--;
    },
}));

Alpine.data('cliAnimation', (steps) => ({
    steps,
    step: 0,
    lines() {
        return this.steps.slice(0, this.step + 1);
    },
    next() {
        if (this.step < this.steps.length - 1) this.step++;
    },
    prev() {
        if (this.step > 0) this.step--;
    },
}));

Alpine.data('quizApp', (questions) => ({
    questions,
    current: 0,
    selected: null,
    answered: false,
    score: 0,

    get question() {
        return this.questions[this.current];
    },

    get total() {
        return this.questions.length;
    },

    get finished() {
        return this.current >= this.total;
    },

    optionState(opt) {
        if (!this.answered) return 'idle';
        if (opt.is_correct) return 'correct';
        if (opt.id === this.selected) return 'wrong';
        return 'muted';
    },

    select(id) {
        if (this.answered) return;
        this.selected = id;
        this.answered = true;
        const chosen = this.question.options.find((o) => o.id === id);
        if (chosen?.is_correct) this.score++;
    },

    next() {
        this.current++;
        this.selected = null;
        this.answered = false;
    },

    restart() {
        this.current = 0;
        this.selected = null;
        this.answered = false;
        this.score = 0;
    },
}));

Alpine.data('routerLab', routerLabData);
Alpine.data('notesPdf', notesPdfData);

Alpine.start();
