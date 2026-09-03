// pt-engine.js — pure network simulation logic for the packet-tracer style lab.
// No DOM or Three.js dependencies, so it can be unit-tested in Node.

let macSeq = 0;
let linkSeq = 0;
const seqByType = {};

const ID_PREFIX = { router: 'r', switch: 'sw', pc: 'pc', server: 'srv' };

function nextSeq(type) {
    seqByType[type] = (seqByType[type] || 0) + 1;
    return seqByType[type];
}

const PORT_DEFS = {
    router: ['G0/0', 'G0/1', 'G0/2'],
    switch: ['F0/1', 'F0/2', 'F0/3', 'F0/4'],
    pc: ['eth0'],
    server: ['eth0'],
};

// ---------------------------------------------------------------------------
// IP helpers
// ---------------------------------------------------------------------------

export function ipToInt(ip) {
    const parts = String(ip).split('.');
    if (parts.length !== 4) return null;
    const n = parts.map(Number);
    if (n.some((x) => ! Number.isInteger(x) || x < 0 || x > 255)) return null;
    return (((n[0] << 24) >>> 0) + (n[1] << 16) + (n[2] << 8) + n[3]) >>> 0;
}

export function intToIp(n) {
    const u = n >>> 0;
    return [(u >>> 24) & 255, (u >>> 16) & 255, (u >>> 8) & 255, u & 255].join('.');
}

export function isValidIp(ip) {
    return ipToInt(ip) !== null;
}

export function isValidMask(mask) {
    const n = ipToInt(mask);
    if (n === null) return false;
    // must be contiguous ones from the left
    const bits = (n >>> 0).toString(2).padStart(32, '0');
    return /^1*0*$/.test(bits) && bits.includes('1');
}

export function prefixLen(mask) {
    const n = ipToInt(mask);
    if (n === null) return null;
    return (n >>> 0).toString(2).split('1').length - 1;
}

export function networkOf(ip, mask) {
    return intToIp((ipToInt(ip) & ipToInt(mask)) >>> 0);
}

export function inSubnet(ip, net, mask) {
    const m = ipToInt(mask);
    return ((ipToInt(ip) & m) >>> 0) === ((ipToInt(net) & m) >>> 0);
}

export function sameSubnet(ip1, ip2, mask) {
    return inSubnet(ip1, networkOf(ip2, mask), mask);
}

// ---------------------------------------------------------------------------
// Devices / links
// ---------------------------------------------------------------------------

export function makeMac() {
    macSeq += 1;
    return '0000.0000.' + macSeq.toString().padStart(4, '0');
}

export function makeDevice(type, name) {
    const ports = (PORT_DEFS[type] || ['eth0']).map((n) => ({
        name: n,
        ip: null,
        mask: null,
        up: type === 'switch', // switch ports start up; routers/pcs start administratively down
        mac: makeMac(),
        desc: null,
    }));

    const dev = {
        id: (ID_PREFIX[type] || 'd') + nextSeq(type),
        type,
        name,
        hostname: name,
        x: 0,
        z: 0,
        ports,
        arp: {},
    };

    if (type === 'router') dev.staticRoutes = [];
    if (type === 'switch') dev.macTable = {};
    if (type === 'pc' || type === 'server') dev.gateway = null;

    return dev;
}

export function makeState() {
    return { devices: [], links: [] };
}

export function getDevice(state, id) {
    const rid = resolveId(state, id);
    return rid ? state.devices.find((d) => d.id === rid) || null : null;
}

// Resolve a device reference to its canonical id (accepts id, name, or hostname).
export function resolveId(state, idOrName) {
    if (! idOrName) return null;
    const s = String(idOrName);
    const byId = state.devices.find((d) => d.id === s);
    if (byId) return byId.id;
    const lower = s.toLowerCase();
    const byName = state.devices.find(
        (d) => (d.name || '').toLowerCase() === lower || (d.hostname || '').toLowerCase() === lower,
    );
    return byName ? byName.id : null;
}

export function normalizePort(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9/]/g, '');
}

export function getPort(dev, name) {
    if (! dev) return null;
    const n = normalizePort(name);
    return dev.ports.find((p) => normalizePort(p.name) === n) || null;
}

export function findPortByText(dev, str) {
    const s = String(str).toLowerCase().replace(/[\s-]/g, '');
    let m = s.match(/^(?:gigabitethernet|gi|g)(\d+\/\d+)/);
    if (m) return getPort(dev, 'g' + m[1]);
    m = s.match(/^(?:fastethernet|fa|f)(\d+\/\d+)/);
    if (m) return getPort(dev, 'f' + m[1]);
    m = s.match(/^(?:ethernet|eth|e)(\d+)$/);
    if (m) return getPort(dev, 'eth' + m[1]);
    return null;
}

export function addLink(state, aDevId, aPort, bDevId, bPort) {
    const a = resolveId(state, aDevId);
    const b = resolveId(state, bDevId);
    if (! a || ! b) return null;
    if (a === b) return null; // no self-links
    linkSeq += 1;
    const link = {
        id: 'l' + linkSeq,
        a: { devId: a, port: aPort },
        b: { devId: b, port: bPort },
    };
    state.links.push(link);
    return link;
}

export function removeLink(state, linkId) {
    const i = state.links.findIndex((l) => l.id === linkId);
    if (i >= 0) state.links.splice(i, 1);
}

export function removeDevice(state, devId) {
    const rid = resolveId(state, devId);
    state.devices = state.devices.filter((d) => d.id !== rid);
    state.links = state.links.filter((l) => l.a.devId !== rid && l.b.devId !== rid);
}

export function linksOf(state, devId) {
    const rid = resolveId(state, devId);
    return state.links.filter((l) => l.a.devId === rid || l.b.devId === rid);
}

export function findLink(state, idA, idB) {
    const a = resolveId(state, idA);
    const b = resolveId(state, idB);
    return state.links.find(
        (l) => (l.a.devId === a && l.b.devId === b) || (l.a.devId === b && l.b.devId === a),
    );
}

export function linkUp(state, link) {
    const a = getPort(getDevice(state, link.a.devId), link.a.port);
    const b = getPort(getDevice(state, link.b.devId), link.b.port);
    return Boolean(a && b && a.up && b.up);
}

export function portUsed(dev, portName) {
    return false; // links tracked in state; checked separately by caller
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

export function connectedRoutes(dev) {
    const out = [];
    for (const p of dev.ports) {
        if (p.ip && p.mask && p.up) {
            out.push({
                type: 'C',
                net: networkOf(p.ip, p.mask),
                mask: p.mask,
                prefix: prefixLen(p.mask),
                egress: p.name,
                nextHop: null,
                local: p.ip,
            });
        }
    }
    return out;
}

export function routesOf(dev) {
    const routes = [];
    for (const c of connectedRoutes(dev)) {
        routes.push({ ...c });
    }
    for (const s of dev.staticRoutes || []) {
        let egress = s.exit || null;
        if (! egress) {
            for (const p of dev.ports) {
                if (p.ip && p.mask && p.up && inSubnet(s.nextHop, networkOf(p.ip, p.mask), p.mask)) {
                    egress = p.name;
                    break;
                }
            }
        }
        routes.push({
            type: 'S',
            net: s.net,
            mask: s.mask,
            prefix: prefixLen(s.mask),
            egress,
            nextHop: s.nextHop,
            local: null,
        });
    }
    return routes;
}

export function longestMatch(dev, ip) {
    let best = null;
    for (const r of routesOf(dev)) {
        if (inSubnet(ip, r.net, r.mask)) {
            if (! best || r.prefix > best.prefix) best = r;
        }
    }
    return best;
}

export function pickSourceIp(dev, dstIp) {
    const withIp = dev.ports.filter((p) => p.ip && p.up);
    if (! withIp.length) return null;
    const same = withIp.find((p) => inSubnet(dstIp, networkOf(p.ip, p.mask), p.mask));
    return (same || withIp[0]).ip;
}

export function findDeviceByIp(state, ip) {
    return state.devices.find((d) => d.ports.some((p) => p.ip === ip)) || null;
}

// ---------------------------------------------------------------------------
// L2 topology + forwarding
// ---------------------------------------------------------------------------

export function l2Path(state, fromDev, toDev) {
    if (fromDev.id === toDev.id) return [fromDev.id];
    const prev = new Map([[fromDev.id, null]]);
    const q = [fromDev.id];
    const visited = new Set([fromDev.id]);

    while (q.length) {
        const id = q.shift();
        if (id === toDev.id) {
            const path = [];
            let cur = id;
            while (cur) {
                path.unshift(cur);
                cur = prev.get(cur);
            }
            return path;
        }
        for (const link of linksOf(state, id)) {
            if (! linkUp(state, link)) continue;
            const otherId = link.a.devId === id ? link.b.devId : link.a.devId;
            if (visited.has(otherId)) continue;
            const other = getDevice(state, otherId);
            if (other.id !== toDev.id && other.type !== 'switch') continue;
            visited.add(otherId);
            prev.set(otherId, id);
            q.push(otherId);
        }
    }
    return null;
}

function learnMacs(state, srcDev, egressPort, leg, nextHopIp) {
    const srcPort = getPort(srcDev, egressPort);
    if (! srcPort) return;
    const srcMac = srcPort.mac;
    const dstMac = srcDev.arp[nextHopIp];

    for (let i = 1; i < leg.length - 1; i++) {
        const sw = getDevice(state, leg[i]);
        if (! sw || sw.type !== 'switch') continue;
        const inLink = findLink(state, leg[i - 1], leg[i]);
        if (! inLink) continue;
        const inPort = inLink.a.devId === leg[i] ? inLink.a.port : inLink.b.port;
        sw.macTable[srcMac] = inPort;
        if (dstMac) {
            const outLink = findLink(state, leg[i], leg[i + 1]);
            if (outLink) {
                const outPort = outLink.a.devId === leg[i] ? outLink.a.port : outLink.b.port;
                sw.macTable[dstMac] = outPort;
            }
        }
    }
}

function forward(state, dev, packet, log, path, isOrigin) {
    path.push(dev.id);

    // Delivered?
    if (dev.ports.some((p) => p.ip === packet.dstIp)) {
        log.push(`${dev.name}: packet delivered to ${packet.dstIp}`);
        return { delivered: true, path };
    }

    // TTL decrement at routers (except the origin).
    if (dev.type === 'router' && ! isOrigin) {
        packet.ttl -= 1;
        if (packet.ttl <= 0) {
            log.push(`${dev.name}: TTL expired — packet dropped`);
            return { delivered: false, path };
        }
    }

    let nextHopIp = null;
    let egressPort = null;

    if (dev.type === 'router') {
        const route = longestMatch(dev, packet.dstIp);
        if (! route) {
            log.push(`${dev.name}: no route to ${packet.dstIp} — packet dropped`);
            return { delivered: false, path };
        }
        if (! route.egress) {
            log.push(`${dev.name}: route next-hop unreachable — packet dropped`);
            return { delivered: false, path };
        }
        nextHopIp = route.nextHop || packet.dstIp;
        egressPort = route.egress;
    } else {
        const eth = getPort(dev, 'eth0');
        if (! eth || ! eth.ip) {
            log.push(`${dev.name}: no IP configured on eth0 — packet dropped`);
            return { delivered: false, path };
        }
        if (! eth.up) {
            log.push(`${dev.name}: eth0 administratively down — packet dropped`);
            return { delivered: false, path };
        }
        if (sameSubnet(eth.ip, packet.dstIp, eth.mask)) {
            nextHopIp = packet.dstIp;
        } else if (dev.gateway) {
            nextHopIp = dev.gateway;
        } else {
            log.push(`${dev.name}: ${packet.dstIp} is on another network and no default gateway is set`);
            return { delivered: false, path };
        }
        egressPort = 'eth0';
    }

    const nextDev = state.devices.find((d) => d.ports.some((p) => p.ip === nextHopIp)) || null;

    if (! nextDev) {
        if (! dev.arp[nextHopIp]) {
            log.push(`${dev.name}: ARP request — who has ${nextHopIp}?`);
            log.push(`${dev.name}: ARP timeout — host ${nextHopIp} unreachable`);
        } else {
            log.push(`${dev.name}: ${nextHopIp} unreachable — packet dropped`);
        }
        return { delivered: false, path };
    }

    if (! dev.arp[nextHopIp]) {
        log.push(`${dev.name}: ARP request — who has ${nextHopIp}?`);
        const targetPort = nextDev.ports.find((p) => p.ip === nextHopIp);
        dev.arp[nextHopIp] = targetPort.mac;
        const srcPort = getPort(dev, egressPort);
        if (srcPort && srcPort.ip) nextDev.arp[srcPort.ip] = srcPort.mac;
        log.push(`${nextDev.name}: ARP reply — ${nextHopIp} is at ${targetPort.mac}`);
    }

    const leg = l2Path(state, dev, nextDev);
    if (! leg) {
        log.push(`${dev.name}: link down on the path to ${nextHopIp} — packet dropped`);
        return { delivered: false, path };
    }

    learnMacs(state, dev, egressPort, leg, nextHopIp);

    // leg[0] is the current device (already in path) and leg[last] is nextDev
    // (pushed by the recursive forward); only push intermediate switches here.
    for (const id of leg.slice(1, -1)) path.push(id);
    return forward(state, nextDev, packet, log, path, false);
}

export function ping(state, srcDevId, dstIp, sourceIp = null) {
    const log = [];
    const srcDev = getDevice(state, srcDevId);
    if (! srcDev) return { ok: false, log: ['unknown source device'], trace: { request: [], reply: [] } };
    const srcIp = sourceIp || pickSourceIp(srcDev, dstIp);
    if (! srcIp) {
        return { ok: false, log: [`${srcDev.name}: no usable source IP — cannot ping`], trace: { request: [], reply: [] } };
    }
    if (! isValidIp(dstIp)) {
        return { ok: false, log: ['invalid destination IP address'], trace: { request: [], reply: [] } };
    }
    const dstDev = findDeviceByIp(state, dstIp);
    if (! dstDev) {
        return { ok: false, log: [`${srcDev.name}: destination ${dstIp} is unknown on this network`], trace: { request: [], reply: [] } };
    }

    const req = forward(state, srcDev, { srcIp, dstIp, ttl: 64 }, log, [], true);

    let reply = { delivered: false, path: [] };
    if (req.delivered) {
        log.push(`${dstDev.name}: sending ICMP echo reply to ${srcIp}`);
        reply = forward(state, dstDev, { srcIp: dstIp, dstIp: srcIp, ttl: 64 }, log, [], true);
    }

    return {
        ok: req.delivered && reply.delivered,
        log,
        trace: { request: req.path, reply: reply.path },
    };
}
