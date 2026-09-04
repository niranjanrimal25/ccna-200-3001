// subnetting.js — interactive subnetting practice trainer (Alpine component).
//
// Covers all the core CCNA subnetting skills, each with unlimited random
// questions, instant grading and a worked solution:
//   1. Find the subnet (network address of a host)
//   2. Network / broadcast / first / last / usable-host count
//   3. Choose the mask (borrow bits for subnets, or fit a host count)
//   4. CIDR ↔ dotted-decimal mask conversion
//   5. VLSM allocation (subnet a network to a host requirement)
//   6. Decimal ↔ binary octet conversion

// ---------------------------------------------------------------------------
// IP math (pure functions)
// ---------------------------------------------------------------------------

function ipToInt(ip) {
    const p = String(ip).trim().split('.').map((x) => parseInt(x, 10));
    if (p.length !== 4 || p.some((x) => Number.isNaN(x) || x < 0 || x > 255)) return null;
    return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
}

function intToIp(n) {
    n = n >>> 0;
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

function prefixToMask(p) {
    if (p <= 0) return '0.0.0.0';
    if (p >= 32) return '255.255.255.255';
    return intToIp((~0 << (32 - p)) >>> 0);
}

function maskToPrefix(mask) {
    const n = ipToInt(mask);
    if (n === null) return null;
    const bits = (n >>> 0).toString(2).padStart(32, '0');
    if (!/^1*0*$/.test(bits)) return null;
    const idx = bits.indexOf('0');
    return idx === -1 ? 32 : idx;
}

function networkInt(ipInt, prefix) {
    const mask = prefix <= 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (ipInt & mask) >>> 0;
}

function broadcastInt(ipInt, prefix) {
    const mask = prefix <= 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (ipInt | (~mask >>> 0)) >>> 0;
}

function usableHosts(prefix) {
    if (prefix >= 32) return 0;
    return Math.pow(2, 32 - prefix) - 2;
}

function ipToBin(ip) {
    return String(ip).split('.').map((o) => (+o).toString(2).padStart(8, '0')).join('.');
}

function decToBin(n) { return (+n).toString(2).padStart(8, '0'); }

function rand(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Random /24 base network in a private range, e.g. "192.168.7.0".
function randomBase24() {
    const f = rand(0, 2);
    if (f === 0) return `10.${rand(0, 255)}.${rand(0, 255)}.0`;
    if (f === 1) return `172.${rand(16, 31)}.${rand(0, 255)}.0`;
    return `192.168.${rand(0, 255)}.0`;
}

// A real usable host address somewhere inside a /24 (never the network or
// broadcast of its sub-prefix).
function randomHostIn24(base, prefix) {
    let h = ipToInt(base) + rand(1, 254);
    const net = networkInt(h, prefix);
    const bcast = broadcastInt(h, prefix);
    if (h === net) h += 1;
    else if (h === bcast) h -= 1;
    return h;
}

// ---------------------------------------------------------------------------
// Question generators
// ---------------------------------------------------------------------------

function qFindSubnet() {
    const base = randomBase24();
    const prefix = pick([24, 25, 26, 27, 28, 29, 30]);
    const host = randomHostIn24(base, prefix);
    const ip = intToIp(host);
    const net = intToIp(networkInt(host, prefix));
    const mask = prefixToMask(prefix);
    return {
        type: 'find-subnet', typeLabel: 'Find the subnet',
        prompt: `Which subnet (network address) contains host ${ip}/${prefix}?`,
        p1: 'e.g. 192.168.1.0/26', p2: '', two: false,
        params: { netInt: networkInt(host, prefix) },
        want: `${net}/${prefix}`,
        explain: [
            `Host:      ${ip}   →  ${ipToBin(ip)}`,
            `Mask:      /${prefix}  →  ${mask}   →  ${ipToBin(mask)}`,
            `Network  =  host AND mask  =  ${net}/${prefix}`,
        ],
    };
}

function qRange() {
    const base = randomBase24();
    const prefix = pick([25, 26, 27, 28, 29, 30]);
    const host = randomHostIn24(base, prefix);
    const ip = intToIp(host);
    const net = intToIp(networkInt(host, prefix));
    const bcast = intToIp(broadcastInt(host, prefix));
    const first = intToIp(networkInt(host, prefix) + 1);
    const last = intToIp(broadcastInt(host, prefix) - 1);
    const count = usableHosts(prefix);
    const kind = pick(['network', 'broadcast', 'first', 'last', 'count']);
    const prompts = {
        network: `What is the network address of ${ip}/${prefix}?`,
        broadcast: `What is the broadcast address of ${ip}/${prefix}?`,
        first: `What is the first usable host address of ${ip}/${prefix}?`,
        last: `What is the last usable host address of ${ip}/${prefix}?`,
        count: `How many usable host addresses does ${ip}/${prefix} provide?`,
    };
    const wants = { network: net, broadcast: bcast, first, last, count: String(count) };
    return {
        type: 'range', typeLabel: 'Network · broadcast · hosts',
        prompt: prompts[kind],
        p1: kind === 'count' ? 'e.g. 62' : 'e.g. 192.168.1.0', p2: '', two: false,
        params: { kind, ipInt: host, prefix },
        want: wants[kind],
        explain: [
            `Network:    ${net}/${prefix}   (first usable ${first})`,
            `Broadcast:  ${bcast}   (last usable ${last})`,
            `Usable hosts: ${count}   (2^(32-${prefix}) − 2)`,
        ],
    };
}

function qPrefix() {
    const what = pick(['subnets', 'hosts']);
    if (what === 'subnets') {
        const basePrefix = pick([8, 16, 24]);
        const base = basePrefix === 8
            ? `10.${rand(0, 255)}.0.0`
            : basePrefix === 16 ? `172.${rand(16, 31)}.0.0` : `192.168.${rand(0, 255)}.0`;
        const need = pick([2, 3, 4, 5, 6, 7, 10, 12, 14, 30, 60, 100]);
        const bits = Math.ceil(Math.log2(need));
        const newPrefix = basePrefix + bits;
        return {
            type: 'prefix', typeLabel: 'Choose the mask',
            prompt: `You need at least ${need} subnets from ${base}/${basePrefix}. How many host bits must you borrow for subnet bits?`,
            p1: 'e.g. 3', p2: '', two: false,
            params: { kind: 'borrow', answer: bits },
            want: String(bits),
            explain: [
                `2^${bits - 1} < ${need} ≤ 2^${bits}  →  borrow ${bits} bits`,
                `New mask: /${newPrefix} = ${prefixToMask(newPrefix)}`,
            ],
        };
    }
    const basePrefix = 24;
    const base = randomBase24();
    const need = pick([6, 10, 14, 25, 30, 50, 60, 100, 120, 200, 250]);
    const hostBits = Math.ceil(Math.log2(need + 2));
    const prefix = 32 - hostBits;
    return {
        type: 'prefix', typeLabel: 'Choose the mask',
        prompt: `Each subnet must support at least ${need} hosts. What prefix length (subnet mask) do you need?`,
        p1: 'e.g. /26', p2: '', two: false,
        params: { kind: 'hosts', answer: prefix },
        want: `/${prefix}`,
        explain: [
            `Need ${need} hosts + 2 (network & broadcast) = ${need + 2} addresses`,
            `2^${hostBits - 1} < ${need + 2} ≤ 2^${hostBits}  →  ${hostBits} host bits`,
            `Prefix = 32 − ${hostBits} = /${prefix}  →  ${prefixToMask(prefix)}`,
        ],
    };
}

function qCidr() {
    const dir = pick(['toMask', 'toPrefix']);
    const prefix = rand(9, 30);
    const mask = prefixToMask(prefix);
    if (dir === 'toMask') {
        return {
            type: 'cidr', typeLabel: 'CIDR ↔ mask',
            prompt: `Convert the CIDR prefix /${prefix} to a dotted-decimal subnet mask.`,
            p1: 'e.g. 255.255.255.0', p2: '', two: false,
            params: { kind: 'toMask', mask },
            want: mask,
            explain: [
                `/${prefix} = ${'1'.repeat(prefix)}${'0'.repeat(32 - prefix)} (32 bits)`,
                `= ${ipToBin(mask)}  →  ${mask}`,
            ],
        };
    }
    return {
        type: 'cidr', typeLabel: 'CIDR ↔ mask',
        prompt: `Convert the subnet mask ${mask} to a CIDR prefix length.`,
        p1: 'e.g. /26', p2: '', two: false,
        params: { kind: 'toPrefix', prefix },
        want: `/${prefix}`,
        explain: [
            `${mask} = ${ipToBin(mask)}`,
            `Count the leading 1s → /${prefix}`,
        ],
    };
}

function qVlsm() {
    const base = randomBase24();
    const basePrefix = 24;
    const hosts = pick([6, 10, 14, 25, 30, 50, 60, 100, 120, 250]);
    const hostBits = Math.ceil(Math.log2(hosts + 2));
    const prefix = 32 - hostBits;
    return {
        type: 'vlsm', typeLabel: 'VLSM allocation',
        prompt: `VLSM: from ${base}/${basePrefix}, assign a subnet to a LAN that needs at least ${hosts} hosts. Give the prefix length and the network address.`,
        p1: 'prefix e.g. /26', p2: 'network e.g. 192.168.1.0', two: true,
        params: { prefix, netInt: ipToInt(base) },
        want: `/${prefix}  ${base}`,
        explain: [
            `Hosts needed: ${hosts}  →  +2 = ${hosts + 2} addresses`,
            `2^${hostBits - 1} < ${hosts + 2} ≤ 2^${hostBits}  →  ${hostBits} host bits → /${prefix}`,
            `Smallest subnet: ${base}/${prefix}  (${prefixToMask(prefix)})`,
            `It holds 2^${hostBits} − 2 = ${usableHosts(prefix)} usable hosts — enough for ${hosts}.`,
        ],
    };
}

function qBinary() {
    const dir = pick(['toBin', 'toDec']);
    if (dir === 'toBin') {
        const dec = rand(0, 255);
        return {
            type: 'binary', typeLabel: 'Decimal ↔ binary',
            prompt: `Convert ${dec} to an 8-bit binary number.`,
            p1: 'e.g. 10101100', p2: '', two: false,
            params: { kind: 'toBin', dec },
            want: decToBin(dec),
            explain: [`${dec} = ${decToBin(dec)}`],
        };
    }
    const dec = rand(0, 255);
    const bin = decToBin(dec);
    return {
        type: 'binary', typeLabel: 'Decimal ↔ binary',
        prompt: `Convert the 8-bit binary ${bin} to decimal.`,
        p1: 'e.g. 172', p2: '', two: false,
        params: { kind: 'toDec', dec },
        want: String(dec),
        explain: [`${bin} = ${dec}`],
    };
}

const GENERATORS = {
    'find-subnet': qFindSubnet,
    'range': qRange,
    'prefix': qPrefix,
    'cidr': qCidr,
    'vlsm': qVlsm,
    'binary': qBinary,
};

// ---------------------------------------------------------------------------
// Grading (normalise free-text answers, compare)
// ---------------------------------------------------------------------------

function normPrefix(s) {
    s = String(s || '').trim();
    if (s.startsWith('/')) s = s.slice(1);
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? null : n;
}

function normIp(s) {
    const t = String(s || '').trim().split('/')[0];
    return ipToInt(t);
}

function normInt(s) {
    const n = parseInt(String(s || '').trim(), 10);
    return Number.isNaN(n) ? null : n;
}

function grade(type, params, v1, v2) {
    if (type === 'find-subnet') return normIp(v1) === params.netInt;
    if (type === 'range') {
        const { kind, ipInt, prefix } = params;
        if (kind === 'count') return normInt(v1) === usableHosts(prefix);
        const got = normIp(v1);
        if (got === null) return false;
        const net = networkInt(ipInt, prefix);
        const bcast = broadcastInt(ipInt, prefix);
        if (kind === 'network') return got === net;
        if (kind === 'broadcast') return got === bcast;
        if (kind === 'first') return got === net + 1;
        if (kind === 'last') return got === bcast - 1;
        return false;
    }
    if (type === 'prefix') return normPrefix(v1) === params.answer;
    if (type === 'cidr') {
        if (params.kind === 'toMask') {
            return ipToInt(String(v1 || '').trim()) === ipToInt(params.mask);
        }
        return normPrefix(v1) === params.prefix;
    }
    if (type === 'vlsm') {
        return normPrefix(v1) === params.prefix && normIp(v2) === params.netInt;
    }
    if (type === 'binary') {
        if (params.kind === 'toBin') {
            return String(v1 || '').trim().replace(/[\s.]/g, '') === decToBin(params.dec);
        }
        return normInt(v1) === params.dec;
    }
    return false;
}

// ---------------------------------------------------------------------------
// Alpine component
// ---------------------------------------------------------------------------

export default function subnettingData() {
    return {
        types: [
            { id: 'find-subnet', label: 'Find the subnet' },
            { id: 'range', label: 'Network · broadcast · hosts' },
            { id: 'prefix', label: 'Choose the mask' },
            { id: 'cidr', label: 'CIDR ↔ mask' },
            { id: 'vlsm', label: 'VLSM allocation' },
            { id: 'binary', label: 'Decimal ↔ binary' },
        ],
        active: 'find-subnet',
        q: null,
        values: { v1: '', v2: '' },
        result: null, // 'correct' | 'wrong' | null
        want: '',
        explain: [],
        correct: 0,
        total: 0,

        init() {
            this.newQuestion();
        },

        newQuestion() {
            this.q = GENERATORS[this.active]();
            this.values = { v1: '', v2: '' };
            this.result = null;
            this.want = '';
            this.explain = [];
        },

        pickType(id) {
            if (this.active === id) { this.newQuestion(); return; }
            this.active = id;
            this.newQuestion();
        },

        check() {
            if (!this.q) return;
            const ok = grade(this.q.type, this.q.params, this.values.v1, this.values.v2);
            this.result = ok ? 'correct' : 'wrong';
            this.want = this.q.want;
            this.explain = this.q.explain;
            if (!this.q.counted) {
                this.q.counted = true;
                this.total += 1;
                if (ok) this.correct += 1;
            }
        },

        resetScore() {
            this.correct = 0;
            this.total = 0;
        },
    };
}
