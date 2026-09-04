// pt-engine.js — pure network simulation engine for the packet-tracer style lab.
// No DOM or Three.js dependencies, so it can be unit-tested in Node.
//
// Models a small but realistic CCNA-level network:
//   * IPv4 + IPv6 addressing, ARP, MAC learning (per-VLAN), L2 flooding
//   * VLANs / trunks / subinterfaces (router-on-a-stick) / SVIs
//   * Serial WAN point-to-point links (DCE clock rate, HDLC/PPP)
//   * Connected, static, default, RIP, OSPF and EIGRP routes (longest-prefix + AD)
//   * hop-by-hop ping forwarding with an event log and animated trace
//   * port-security, CDP neighbours, running/startup config snapshots

let macSeq = 0;
let linkSeq = 0;
const seqByType = {};

const ID_PREFIX = { router: 'r', switch: 'sw', pc: 'pc', server: 'srv' };

function nextSeq(type) {
    seqByType[type] = (seqByType[type] || 0) + 1;
    return seqByType[type];
}

// ---------------------------------------------------------------------------
// Port / device definitions
// ---------------------------------------------------------------------------

// Administrative distance
const AD = { connected: 0, static: 1, eigrp: 90, ospf: 110, rip: 120 };

// kind: ethernet | serial | loopback | subinterface | svi | nic
function etherPort(name, bw, mode = null) {
    return {
        name, kind: 'ethernet', ip: null, mask: null, ipv6: null, ipv6Prefix: null,
        up: false, mac: makeMac(), desc: null,
        mode, accessVlan: 1, trunkVlans: null, nativeVlan: 1,
        speed: 'auto', duplex: 'auto', bandwidth: bw,
        portSecurity: { enabled: false, maximum: 1, violation: 'shutdown', macs: [] },
    };
}

function serialPort(name) {
    return {
        name, kind: 'serial', ip: null, mask: null, ipv6: null, ipv6Prefix: null,
        up: false, mac: makeMac(), desc: null,
        encapsulation: 'hdlc', clockRate: null, bandwidth: 1544,
        speed: 'auto', duplex: 'auto',
    };
}

function loopbackPort(name) {
    return {
        name, kind: 'loopback', ip: null, mask: null, ipv6: null, ipv6Prefix: null,
        up: true, mac: makeMac(), desc: null, bandwidth: 8000000,
    };
}

function sviPort(vlanId) {
    return {
        name: 'Vlan' + vlanId, kind: 'svi', vlanId, ip: null, mask: null,
        ipv6: null, ipv6Prefix: null, up: false, mac: makeMac(), desc: null, bandwidth: 1000000,
    };
}

function subinterfacePort(parent, dot1q) {
    return {
        name: parent + '.' + dot1q, kind: 'subinterface', parent, dot1q,
        ip: null, mask: null, ipv6: null, ipv6Prefix: null, up: false, mac: makeMac(),
        desc: null, encapsulation: null, bandwidth: 1000000,
    };
}

function nicPort() {
    return {
        name: 'eth0', kind: 'nic', ip: null, mask: null, ipv6: null, ipv6Prefix: null,
        up: false, mac: makeMac(), desc: null, bandwidth: 1000000,
    };
}

export function makePort(type, name, opts = {}) {
    if (type === 'serial') return { ...serialPort(name), ...opts };
    if (type === 'loopback') return { ...loopbackPort(name), ...opts };
    return { ...etherPort(name, opts.bandwidth ?? 1000000, opts.mode ?? null), ...opts };
}

export function makeDevice(type, name) {
    const ports = [];
    if (type === 'router') {
        ports.push(etherPort('G0/0', 1000000));
        ports.push(etherPort('G0/1', 1000000));
        ports.push(etherPort('G0/2', 1000000));
        ports.push(serialPort('S0/0/0'));
        ports.push(serialPort('S0/0/1'));
        ports.push(loopbackPort('Lo0'));
    } else if (type === 'switch') {
        for (let i = 1; i <= 24; i++) ports.push(etherPort('F0/' + i, 100000, 'access'));
        ports.push(etherPort('G0/1', 1000000, 'access'));
        ports.push(etherPort('G0/2', 1000000, 'access'));
        ports.push(sviPort(1));
    } else {
        ports.push(nicPort());
    }

    const dev = {
        id: (ID_PREFIX[type] || 'd') + nextSeq(type),
        type,
        name,
        hostname: name,
        x: 0,
        z: 0,
        ports,
        arp: {},
        staticRoutes: [],       // { net, mask, nextHop, exit }
        ipv6Routes: [],
        gateway: null,          // PCs / servers default gateway
        defaultGateway: null,   // switch management gateway
        ipRouting: false,       // L2 switch by default
        vlans: type === 'switch' ? [{ id: 1, name: 'default' }] : [],
        macTable: {},           // switch: { vlan: { mac: port } }
        rip: null,              // { version, networks: [{net,wildcard}], passive: [] }
        ospf: null,             // { pid, routerId, networks: [{net,wildcard,area}], passive: [] }
        eigrp: null,            // { asn, networks: [{net,wildcard}], passive: [] }
        cdp: type !== 'pc' && type !== 'server',
        enableSecret: null,     // { hash }
        line: { console: { password: null, login: false }, vty: { password: null, login: false } },
        banner: null,
        servicePasswordEncryption: false,
        startupConfig: null,    // snapshot set by 'copy run start' / 'write'
    };

    if (type === 'switch') dev.macTable = {};
    return dev;
}

export function makeState() {
    return { devices: [], links: [] };
}

export function getDevice(state, id) {
    const rid = resolveId(state, id);
    return rid ? state.devices.find((d) => d.id === rid) || null : null;
}

export function resolveId(state, idOrName) {
    if (!idOrName) return null;
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
    return String(name).toLowerCase().replace(/[^a-z0-9/.]/g, '');
}

export function getPort(dev, name) {
    if (!dev) return null;
    const n = normalizePort(name);
    return dev.ports.find((p) => normalizePort(p.name) === n) || null;
}

export function addSubinterface(dev, name, dot1q) {
    if (getPort(dev, name)) return getPort(dev, name);
    const parentPort = getPort(dev, name.split('.')[0]);
    if (!parentPort) return null;
    // Store the canonical (actual) parent port name so case-insensitive
    // lookups and `p.parent === port.name` comparisons always line up.
    const p = subinterfacePort(parentPort.name, dot1q);
    p.name = parentPort.name + '.' + dot1q;
    dev.ports.push(p);
    return p;
}

export function vlanExists(dev, id) {
    return (dev.vlans || []).some((v) => v.id === id);
}

export function ensureVlan(dev, id, name) {
    if (!dev.vlans) dev.vlans = [];
    let v = dev.vlans.find((x) => x.id === id);
    if (!v) {
        v = { id, name: name || 'VLAN' + String(id).padStart(4, '0') };
        dev.vlans.push(v);
    } else if (name) {
        v.name = name;
    }
    return v;
}

export function ensureSvi(dev, vlanId) {
    const existing = getPort(dev, 'Vlan' + vlanId);
    if (existing) return existing;
    const p = sviPort(vlanId);
    dev.ports.push(p);
    return p;
}

export function findPortByText(dev, str) {
    const s = String(str).toLowerCase().replace(/[\s-]/g, '');
    let m = s.match(/^(?:gigabitethernet|gi|g)(\d+\/\d+(?:\.\d+)?)/);
    if (m) return resolvePortRef(dev, 'g' + m[1]);
    m = s.match(/^(?:fastethernet|fa|f)(\d+\/\d+)/);
    if (m) return resolvePortRef(dev, 'f' + m[1]);
    m = s.match(/^(?:serial|se|s)(\d+\/\d+\/\d+)/);
    if (m) return resolvePortRef(dev, 's' + m[1]);
    m = s.match(/^(?:ethernet|eth|e)(\d+(?:\.\d+)?)$/);
    if (m) return resolvePortRef(dev, 'eth' + m[1]);
    m = s.match(/^(?:loopback|lo)(\d+)/);
    if (m) return resolvePortRef(dev, 'lo' + m[1]);
    m = s.match(/^vlan(\d+)/);
    if (m) return resolvePortRef(dev, 'vlan' + m[1]);
    return null;
}

function resolvePortRef(dev, canonical) {
    const direct = getPort(dev, canonical);
    if (direct) return direct;
    // subinterface may not exist yet — try to create if parent exists
    if (canonical.includes('.')) {
        const [parent, vlan] = canonical.split('.');
        if (getPort(dev, parent)) return addSubinterface(dev, canonical, parseInt(vlan, 10));
    }
    return null;
}

// ---------------------------------------------------------------------------
// IP helpers (IPv4)
// ---------------------------------------------------------------------------

export function ipToInt(ip) {
    const parts = String(ip).split('.');
    if (parts.length !== 4) return null;
    const n = parts.map(Number);
    if (n.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return null;
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
    const bits = (n >>> 0).toString(2).padStart(32, '0');
    return /^1*0*$/.test(bits) && bits.includes('1');
}

export function prefixLen(mask) {
    const n = ipToInt(mask);
    if (n === null) return null;
    return (n >>> 0).toString(2).split('1').length - 1;
}

export function prefixToMask(prefix) {
    const p = Number(prefix);
    if (!Number.isInteger(p) || p < 1 || p > 32) return null;
    return intToIp(((0xffffffff << (32 - p)) >>> 0));
}

export function wildcardToMask(wc) {
    const n = ipToInt(wc);
    if (n === null) return null;
    return intToIp((~n) >>> 0);
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

export function networkMatches(net, mask, statementNet, wildcard) {
    // does subnet (net/mask) fall inside the 'network' statement net + wildcard?
    const wc = ipToInt(wildcard);
    return ((ipToInt(net) & ~wc) >>> 0) === ((ipToInt(statementNet) & ~wc) >>> 0);
}

export function isValidWildcard(wc) {
    const n = ipToInt(wc);
    if (n === null) return false;
    const bits = (n >>> 0).toString(2).padStart(32, '0');
    return /^0*1*$/.test(bits);
}

// ---------------------------------------------------------------------------
// IP helpers (IPv6)
// ---------------------------------------------------------------------------

export function expandIpv6(s) {
    if (!s || typeof s !== 'string') return null;
    let str = s.trim().toLowerCase();
    if (str.includes('/')) str = str.split('/')[0];
    if (str === '::') str = '0:0:0:0:0:0:0:0';
    const dbl = str.indexOf('::');
    if (dbl >= 0) {
        const left = str.slice(0, dbl).split(':').filter((x) => x !== '');
        const right = str.slice(dbl + 2).split(':').filter((x) => x !== '');
        const missing = 8 - left.length - right.length;
        if (missing < 0) return null;
        str = [...left, ...Array(missing).fill('0'), ...right].join(':');
    }
    const groups = str.split(':');
    if (groups.length !== 8) return null;
    if (groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
    return groups.map((g) => g.padStart(4, '0')).join(':');
}

export function isValidIpv6(s) {
    return expandIpv6(s) !== null;
}

export function ipv6Groups(s) {
    const e = expandIpv6(s);
    if (!e) return null;
    return e.split(':').map((g) => parseInt(g, 16));
}

export function ipv6Network(s, prefix) {
    const g = ipv6Groups(s);
    if (!g) return null;
    const p = Number(prefix);
    if (!Number.isInteger(p) || p < 0 || p > 128) return null;
    const out = g.slice();
    for (let i = 0; i < 8; i++) {
        const bits = Math.max(0, Math.min(16, p - i * 16));
        out[i] = bits === 16 ? out[i] : (out[i] >> (16 - bits)) << (16 - bits);
    }
    return out.map((x) => x.toString(16)).join(':') + '::/' + p;
}

export function ipv6SameSubnet(a, b, prefix) {
    const ga = ipv6Groups(a);
    const gb = ipv6Groups(b);
    if (!ga || !gb) return false;
    const p = Number(prefix);
    for (let i = 0; i < 8; i++) {
        const bits = Math.max(0, Math.min(16, p - i * 16));
        if (bits === 0) break;
        const mask = bits === 16 ? 0xffff : ((0xffff << (16 - bits)) & 0xffff);
        if ((ga[i] & mask) !== (gb[i] & mask)) return false;
    }
    return true;
}

export function ipv6LinkLocal(dev) {
    // deterministic link-local from the MAC (simplified EUI-64)
    const mac = dev.ports[0]?.mac || '0000.0000.0001';
    const hex = mac.replace(/\./g, '');
    return 'fe80::' + hex.slice(0, 4) + ':' + hex.slice(4, 8) + ':' + hex.slice(8, 12);
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export function addLink(state, aDevId, aPort, bDevId, bPort) {
    const a = resolveId(state, aDevId);
    const b = resolveId(state, bDevId);
    if (!a || !b || a === b) return null;
    linkSeq += 1;
    const link = { id: 'l' + linkSeq, a: { devId: a, port: aPort }, b: { devId: b, port: bPort } };
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

export function linkEnds(state, link) {
    const a = getDevice(state, link.a.devId);
    const b = getDevice(state, link.b.devId);
    const pa = a ? getPort(a, link.a.port) : null;
    const pb = b ? getPort(b, link.b.port) : null;
    return { a, b, pa, pb };
}

// ---------------------------------------------------------------------------
// Link / interface state
// ---------------------------------------------------------------------------

export function lineProtocolUp(state, dev, port) {
    if (!port.up) return false;
    if (port.kind === 'loopback') return true;
    if (port.kind === 'svi') {
        // up if any access/trunk port in that VLAN is up
        const vlan = port.vlanId;
        return dev.ports.some((p) => p.kind === 'ethernet' && p.up && portCarriesVlan(dev, p, vlan));
    }
    if (port.kind === 'subinterface') {
        const parent = getPort(dev, port.parent);
        return Boolean(parent && parent.up && port.encapsulation);
    }
    const link = linksOf(state, dev.id).find((l) => {
        const isA = l.a.devId === dev.id && normalizePort(l.a.port) === normalizePort(port.name);
        const isB = l.b.devId === dev.id && normalizePort(l.b.port) === normalizePort(port.name);
        return isA || isB;
    });
    if (!link) return false;
    const ends = linkEnds(state, link);
    const other = ends.a.id === dev.id ? { dev: ends.b, port: ends.pb } : { dev: ends.a, port: ends.pa };
    if (!other.port || !other.port.up) return false;
    if (port.kind === 'serial') {
        // serial line protocol up requires matching encapsulation and a clock on one end
        if (port.encapsulation !== other.port.encapsulation) return false;
        return Boolean(port.clockRate || other.port.clockRate);
    }
    return true;
}

export function linkUp(state, link) {
    const ends = linkEnds(state, link);
    if (!ends.pa || !ends.pb) return false;
    return Boolean(ends.pa.up && ends.pb.up && lineProtocolUp(state, ends.a, ends.pa) && lineProtocolUp(state, ends.b, ends.pb));
}

// Does this port carry frames for VLAN `vlan`? (switch access/trunk, router subinterface)
export function portCarriesVlan(dev, port, vlan) {
    if (!port) return false;
    if (port.kind === 'nic') return true; // host: VLAN is decided by the switch port it plugs into
    if (port.kind === 'subinterface') return port.dot1q === vlan;
    if (port.kind === 'svi') return port.vlanId === vlan;
    if (port.kind === 'loopback') return false;
    if (dev.type === 'switch' && port.kind === 'ethernet') {
        if (port.mode === 'trunk') return port.trunkVlans === null || port.trunkVlans.includes(vlan);
        return (port.accessVlan || 1) === vlan;
    }
    // router ethernet physical port → native VLAN 1, plus any subinterface VLANs
    if (port.kind === 'ethernet') {
        const subs = dev.ports.filter((p) => p.kind === 'subinterface' && normalizePort(p.parent) === normalizePort(port.name));
        if (subs.some((p) => p.dot1q === vlan)) return true;
        return vlan === 1;
    }
    return false;
}

export function portVlan(dev, port) {
    if (!port) return null;
    if (port.kind === 'subinterface') return port.dot1q;
    if (port.kind === 'svi') return port.vlanId;
    if (port.kind === 'serial') return null; // point-to-point
    if (port.kind === 'nic') return null; // resolved via the attached switch port (hostVlan)
    if (dev.type === 'switch' && port.kind === 'ethernet') {
        if (port.mode === 'trunk') return 'trunk';
        return port.accessVlan || 1;
    }
    return 1;
}

// The effective VLAN a host (PC/server) belongs to, taken from the switch port it connects to.
export function hostVlan(state, dev) {
    const link = linksOf(state, dev.id)[0];
    if (!link) return 1;
    const ends = linkEnds(state, link);
    const other = ends.a.id === dev.id ? { dev: ends.b, port: ends.pb } : { dev: ends.a, port: ends.pa };
    if (other.dev.type === 'switch' && other.port.kind === 'ethernet') {
        if (other.port.mode === 'trunk') return other.port.nativeVlan || 1;
        return other.port.accessVlan || 1;
    }
    if (other.port.kind === 'subinterface') return other.port.dot1q;
    return 1;
}

// ---------------------------------------------------------------------------
// L2 topology + forwarding (VLAN-aware)
// ---------------------------------------------------------------------------

export function l2Path(state, fromDev, toDev, vlan) {
    if (fromDev.id === toDev.id) return [fromDev.id];
    const prev = new Map([[fromDev.id, null]]);
    const q = [fromDev.id];
    const visited = new Set([fromDev.id]);

    while (q.length) {
        const id = q.shift();
        if (id === toDev.id) {
            const path = [];
            let cur = id;
            while (cur) { path.unshift(cur); cur = prev.get(cur); }
            return path;
        }
        for (const link of linksOf(state, id)) {
            if (!linkCarries(state, link, vlan)) continue;
            const otherId = link.a.devId === id ? link.b.devId : link.a.devId;
            if (visited.has(otherId)) continue;
            const other = getDevice(state, otherId);
            if (!other) continue;
            if (other.id !== toDev.id && other.type !== 'switch') continue;
            visited.add(otherId);
            prev.set(otherId, id);
            q.push(otherId);
        }
    }
    return null;
}

function linkCarries(state, link, vlan) {
    if (!linkUp(state, link)) return false;
    const ends = linkEnds(state, link);
    const aIsSerial = ends.pa.kind === 'serial' || ends.pb.kind === 'serial';
    if (aIsSerial) return vlan === null; // serial point-to-point only
    if (vlan === null) return false;
    return portCarriesVlan(ends.a, ends.pa, vlan) && portCarriesVlan(ends.b, ends.pb, vlan);
}

function macTableFor(sw, vlan) {
    if (!sw.macTable[vlan]) sw.macTable[vlan] = {};
    return sw.macTable[vlan];
}

function learnMacs(state, srcDev, egressPort, leg, nextHopIp, vlan) {
    const srcPort = getPort(srcDev, egressPort);
    if (!srcPort) return;
    const srcMac = srcPort.mac;
    const dstMac = srcDev.arp[nextHopIp];

    for (let i = 1; i < leg.length - 1; i++) {
        const sw = getDevice(state, leg[i]);
        if (!sw || sw.type !== 'switch') continue;
        const table = macTableFor(sw, vlan);
        const inLink = findLink(state, leg[i - 1], leg[i]);
        if (!inLink) continue;
        const inPort = inLink.a.devId === leg[i] ? inLink.a.port : inLink.b.port;
        if (!learnPort(sw, inPort, srcMac, vlan, state)) continue;
        table[srcMac] = inPort;
        if (dstMac) {
            const outLink = findLink(state, leg[i], leg[i + 1]);
            if (outLink) {
                const outPort = outLink.a.devId === leg[i] ? outLink.a.port : outLink.b.port;
                table[dstMac] = outPort;
            }
        }
    }
}

// Port-security check on a switch access port when a new source MAC appears.
function learnPort(sw, portName, srcMac, vlan, state) {
    const port = getPort(sw, portName);
    if (!port || port.mode !== 'access' || !port.portSecurity.enabled) return true;
    const ps = port.portSecurity;
    const known = ps.macs.includes(srcMac);
    if (!known && ps.macs.length >= ps.maximum) {
        if (ps.violation === 'shutdown') {
            port.up = false;
            return false;
        }
        // restrict/protect: drop (don't learn)
        return false;
    }
    if (!known) ps.macs.push(srcMac);
    return true;
}

// ---------------------------------------------------------------------------
// Routing — connected / static / dynamic
// ---------------------------------------------------------------------------

export function connectedRoutes(dev) {
    const out = [];
    for (const p of dev.ports) {
        if (p.kind === 'subinterface' && !p.encapsulation) continue;
        if (p.kind === 'svi' && dev.type === 'switch') {
            if (p.ip && p.mask) {
                out.push({ type: 'C', net: networkOf(p.ip, p.mask), mask: p.mask, prefix: prefixLen(p.mask), egress: p.name, nextHop: null, local: p.ip, ad: AD.connected });
            }
            continue;
        }
        if (p.ip && p.mask && p.up && p.kind !== 'nic' && lineProtocolUpState(p)) {
            const prefix = p.kind === 'loopback' ? 32 : prefixLen(p.mask);
            const mask = p.kind === 'loopback' ? prefixToMask(32) : p.mask;
            const net = p.kind === 'loopback' ? p.ip : networkOf(p.ip, p.mask);
            out.push({ type: 'C', net, mask, prefix, egress: p.name, nextHop: null, local: p.ip, ad: AD.connected });
        }
    }
    return out;
}

function lineProtocolUpState(p) {
    // loopback / serial always eligible when admin up; others checked by caller context
    return true;
}

export function routesOf(dev) {
    const collected = [];
    for (const c of connectedRoutes(dev)) collected.push(c);
    for (const r of computeDynamicRoutes(dev) || []) collected.push(r);
    for (const s of dev.staticRoutes || []) {
        let egress = s.exit || null;
        if (!egress) {
            for (const p of dev.ports) {
                if (p.ip && p.mask && p.up && inSubnet(s.nextHop, networkOf(p.ip, p.mask), p.mask)) {
                    egress = p.name;
                    break;
                }
            }
        }
        collected.push({ type: s.mask === '0.0.0.0' ? 'S*' : 'S', net: s.net, mask: s.mask, prefix: prefixLen(s.mask), egress, nextHop: s.nextHop, local: null, ad: AD.static });
    }

    // Deduplicate by network/prefix, keeping the lowest administrative distance.
    const best = new Map();
    for (const r of collected) {
        const key = r.net + '/' + r.prefix;
        const cur = best.get(key);
        if (!cur || r.ad < cur.ad) best.set(key, r);
    }
    return Array.from(best.values());
}

export function longestMatch(dev, ip) {
    let best = null;
    for (const r of routesOf(dev)) {
        if (r.prefix === 0) {
            // default route
            if (!best) best = r;
            continue;
        }
        if (inSubnet(ip, r.net, r.mask)) {
            if (!best || r.prefix > best.prefix || (r.prefix === best.prefix && r.ad < best.ad)) best = r;
        }
    }
    return best;
}

export function pickSourceIp(dev, dstIp) {
    const withIp = dev.ports.filter((p) => p.ip && p.up);
    if (!withIp.length) return null;
    const same = withIp.find((p) => inSubnet(dstIp, networkOf(p.ip, p.mask), p.mask));
    return (same || withIp[0]).ip;
}

export function findDeviceByIp(state, ip) {
    return state.devices.find((d) => d.ports.some((p) => p.ip === ip)) || null;
}

// ---------------------------------------------------------------------------
// Dynamic routing (RIP / OSPF / EIGRP) — computed centrally over the state
// ---------------------------------------------------------------------------

// List all L3-capable devices (have at least one up IP interface).
function l3Devices(state) {
    return state.devices.filter((d) => d.ports.some((p) => p.ip && p.mask && p.up && p.kind !== 'nic'));
}

// All L3 adjacencies: two devices with IPs in the same subnet that are L2-reachable.
function l3Adjacencies(state) {
    const devs = l3Devices(state);
    const out = [];
    for (let i = 0; i < devs.length; i++) {
        for (let j = i + 1; j < devs.length; j++) {
            const A = devs[i], B = devs[j];
            for (const pa of A.ports) {
                if (!pa.ip || !pa.mask || !pa.up || pa.kind === 'nic' || pa.kind === 'subinterface' && !pa.encapsulation) continue;
                const vlan = portVlan(A, pa);
                const subnetA = networkOf(pa.ip, pa.mask);
                for (const pb of B.ports) {
                    if (!pb.ip || !pb.mask || !pb.up || pb.kind === 'nic' || pb.kind === 'subinterface' && !pb.encapsulation) continue;
                    if (subnetA !== networkOf(pb.ip, pb.mask)) continue;
                    const path = l2Path(state, A, B, vlan);
                    if (path) out.push({ a: A.id, b: B.id, aPort: pa, bPort: pb, subnet: subnetA, mask: pa.mask, vlan });
                }
            }
        }
    }
    return out;
}

function adjacencyGraph(state, adj) {
    // build device-level graph: { id: { neighborId: { cost, nextHopPort, nextHopIp } } }
    const graph = {};
    const devs = state.devices;
    for (const d of devs) graph[d.id] = {};
    for (const e of adj) {
        const A = getDevice(state, e.a), B = getDevice(state, e.b);
        if (!graph[e.a] || !graph[e.b]) continue;
        graph[e.a][e.b] = { cost: 1, port: e.aPort.name, ip: e.bPort.ip, bw: e.aPort.bandwidth };
        graph[e.b][e.a] = { cost: 1, port: e.bPort.name, ip: e.aPort.ip, bw: e.bPort.bandwidth };
    }
    return graph;
}

function dijkstra(graph, startId) {
    const dist = { [startId]: 0 };
    const prev = { [startId]: null };
    const done = new Set();
    const ids = Object.keys(graph);
    while (true) {
        let u = null;
        for (const id of ids) {
            if (done.has(id) || dist[id] === undefined) continue;
            if (u === null || dist[id] < dist[u]) u = id;
        }
        if (u === null) break;
        done.add(u);
        for (const [v, edge] of Object.entries(graph[u])) {
            const nd = dist[u] + edge.cost;
            if (dist[v] === undefined || nd < dist[v]) {
                dist[v] = nd;
                prev[v] = u;
            }
        }
    }
    return { dist, prev };
}

function firstHop(prev, startId, targetId) {
    let cur = targetId;
    let next = prev[cur];
    while (next !== null && next !== startId) {
        cur = next;
        next = prev[cur];
    }
    return next === startId ? cur : null;
}

function ripEnabledOnSubnet(dev, subnet, mask) {
    if (!dev.rip) return false;
    return dev.rip.networks.some((n) => networkMatches(subnet, mask, n.net, n.wildcard));
}

function ospfAreaFor(dev, subnet, mask) {
    if (!dev.ospf) return null;
    for (const n of dev.ospf.networks) {
        if (networkMatches(subnet, mask, n.net, n.wildcard)) return n.area;
    }
    return null;
}

function eigrpEnabledOnSubnet(dev, subnet, mask) {
    if (!dev.eigrp) return false;
    return dev.eigrp.networks.some((n) => networkMatches(subnet, mask, n.net, n.wildcard));
}

function portCost(port) {
    if (port.kind === 'serial') return 64;
    const bwMbps = (port.bandwidth || 1000000) / 1000;
    return Math.max(1, Math.round(100 / bwMbps));
}

function eigrpMetric(bwKbps) {
    return 256 * (10000000 / Math.max(1, bwKbps) + 10);
}

function computeDynamicRoutes(dev) {
    // compute routes for a single device (used by routesOf)
    const state = dev.__state;
    if (!state) return [];
    const out = [];

    // ---- RIP (distance vector: hop count) ----
    if (dev.rip) {
        const adj = l3Adjacencies(state).filter((e) => {
            const A = getDevice(state, e.a), B = getDevice(state, e.b);
            return A.rip && B.rip && ripEnabledOnSubnet(A, e.subnet, e.mask) && ripEnabledOnSubnet(B, e.subnet, e.mask);
        });
        const graph = adjacencyGraph(state, adj);
        const { dist, prev } = dijkstra(graph, dev.id);
        for (const other of state.devices) {
            if (other.id === dev.id || !other.rip || dist[other.id] === undefined) continue;
            for (const p of other.ports) {
                if (!p.ip || !p.mask || !p.up || p.kind === 'nic' || p.kind === 'subinterface' && !p.encapsulation) continue;
                if (!ripEnabledOnSubnet(other, networkOf(p.ip, p.mask), p.mask)) continue;
                const net = p.kind === 'loopback' ? p.ip : networkOf(p.ip, p.mask);
                const mask = p.kind === 'loopback' ? prefixToMask(32) : p.mask;
                const hop = firstHop(prev, dev.id, other.id);
                const edge = hop ? graph[dev.id][hop] : null;
                if (!edge) continue;
                out.push({ type: 'R', net, mask, prefix: prefixLen(mask), egress: edge.port, nextHop: edge.ip, local: null, ad: AD.rip, metric: dist[other.id] + 1 });
            }
        }
    }

    // ---- OSPF (SPF per area, ABR inter-area) ----
    if (dev.ospf) {
        out.push(...ospfRoutes(state, dev));
    }

    // ---- EIGRP (simplified: sum of composite metrics) ----
    if (dev.eigrp) {
        const adj = l3Adjacencies(state).filter((e) => {
            const A = getDevice(state, e.a), B = getDevice(state, e.b);
            return A.eigrp && B.eigrp && A.eigrp.asn === B.eigrp.asn && eigrpEnabledOnSubnet(A, e.subnet, e.mask) && eigrpEnabledOnSubnet(B, e.subnet, e.mask);
        });
        const graph = {};
        for (const d of state.devices) graph[d.id] = {};
        for (const e of adj) {
            const A = getDevice(state, e.a), B = getDevice(state, e.b);
            graph[e.a][e.b] = { cost: eigrpMetric(e.aPort.bandwidth), port: e.aPort.name, ip: e.bPort.ip, bw: e.aPort.bandwidth };
            graph[e.b][e.a] = { cost: eigrpMetric(e.bPort.bandwidth), port: e.bPort.name, ip: e.aPort.ip, bw: e.bPort.bandwidth };
        }
        const { dist, prev } = dijkstra(graph, dev.id);
        for (const other of state.devices) {
            if (other.id === dev.id || !other.eigrp || other.eigrp.asn !== dev.eigrp.asn || dist[other.id] === undefined) continue;
            for (const p of other.ports) {
                if (!p.ip || !p.mask || !p.up || p.kind === 'nic' || p.kind === 'subinterface' && !p.encapsulation) continue;
                if (!eigrpEnabledOnSubnet(other, networkOf(p.ip, p.mask), p.mask)) continue;
                const net = p.kind === 'loopback' ? p.ip : networkOf(p.ip, p.mask);
                const mask = p.kind === 'loopback' ? prefixToMask(32) : p.mask;
                const hop = firstHop(prev, dev.id, other.id);
                const edge = hop ? graph[dev.id][hop] : null;
                if (!edge) continue;
                out.push({ type: 'D', net, mask, prefix: prefixLen(mask), egress: edge.port, nextHop: edge.ip, local: null, ad: AD.eigrp, metric: Math.round(dist[other.id]) });
            }
        }
    }

    return out;
}

function ospfRoutes(state, dev) {
    const out = [];
    // collect all OSPF routers and their areas
    const routers = state.devices.filter((d) => d.ospf && d.type === 'router');
    // area → routers
    const areaRouters = {};
    const routerAreas = {};
    for (const r of routers) {
        const areas = new Set();
        for (const p of r.ports) {
            if (!p.ip || !p.mask || !p.up) continue;
            const subnet = networkOf(p.ip, p.mask);
            const a = ospfAreaFor(r, subnet, p.mask);
            if (a !== null) { areas.add(a); routerAreas[r.id] = routerAreas[r.id] || new Set(); routerAreas[r.id].add(a); }
        }
        for (const a of areas) { areaRouters[a] = areaRouters[a] || []; areaRouters[a].push(r.id); }
    }
    const myAreas = routerAreas[dev.id] || new Set();
    if (myAreas.size === 0) return out;

    // intra-area SPF per area
    const areaGraph = {}; // area -> graph
    for (const area of Object.keys(areaRouters)) {
        const adj = l3Adjacencies(state).filter((e) => {
            const A = getDevice(state, e.a), B = getDevice(state, e.b);
            return A.ospf && B.ospf && ospfAreaFor(A, e.subnet, e.mask) === area && ospfAreaFor(B, e.subnet, e.mask) === area;
        });
        const g = {};
        for (const d of state.devices) g[d.id] = {};
        for (const e of adj) {
            const A = getDevice(state, e.a), B = getDevice(state, e.b);
            g[e.a][e.b] = { cost: portCost(e.aPort), port: e.aPort.name, ip: e.bPort.ip };
            g[e.b][e.a] = { cost: portCost(e.bPort), port: e.bPort.name, ip: e.aPort.ip };
        }
        areaGraph[area] = { adj, graph: g };
    }

    // networks per area (connected subnets advertised by OSPF in that area)
    const areaNetworks = {}; // area -> [{net, mask, owner, prefix}]
    for (const r of routers) {
        for (const p of r.ports) {
            if (!p.ip || !p.mask || !p.up) continue;
            const subnet = networkOf(p.ip, p.mask);
            const a = ospfAreaFor(r, subnet, p.mask);
            if (a === null) continue;
            const net = p.kind === 'loopback' ? p.ip : subnet;
            const mask = p.kind === 'loopback' ? prefixToMask(32) : p.mask;
            areaNetworks[a] = areaNetworks[a] || [];
            areaNetworks[a].push({ net, mask, prefix: prefixLen(mask), owner: r.id });
        }
    }

    const ABRS = routers.filter((r) => (routerAreas[r.id] || new Set()).has('0') && (routerAreas[r.id] || new Set()).size > 1);

    const addIntraArea = (area) => {
        const { graph } = areaGraph[area] || { graph: {} };
        const { dist, prev } = dijkstra(graph, dev.id);
        for (const netInfo of areaNetworks[area] || []) {
            if (netInfo.owner === dev.id) continue;
            if (dist[netInfo.owner] === undefined) continue;
            const hop = firstHop(prev, dev.id, netInfo.owner);
            const edge = hop ? graph[dev.id][hop] : null;
            if (!edge) continue;
            out.push({ type: 'O', net: netInfo.net, mask: netInfo.mask, prefix: netInfo.prefix, egress: edge.port, nextHop: edge.ip, local: null, ad: AD.ospf, metric: dist[netInfo.owner] });
        }
    };

    const addViaAbr = (abrId, area, netInfo, abrCostToNet) => {
        const { graph } = areaGraph[area] || { graph: {} };
        const { dist, prev } = dijkstra(graph, dev.id);
        if (dist[abrId] === undefined) return;
        const hop = firstHop(prev, dev.id, abrId);
        const edge = hop ? graph[dev.id][hop] : null;
        if (!edge) return;
        out.push({ type: 'O IA', net: netInfo.net, mask: netInfo.mask, prefix: netInfo.prefix, egress: edge.port, nextHop: edge.ip, local: null, ad: AD.ospf, metric: dist[abrId] + abrCostToNet });
    };

    // intra-area routes for each of my areas
    for (const area of myAreas) addIntraArea(area);

    // inter-area routes
    for (const area of Object.keys(areaNetworks)) {
        if (myAreas.has(area)) continue; // already covered intra-area
        if (area === '0') {
            // I'm in a non-backbone area, route to backbone networks via my ABR
            for (const netInfo of areaNetworks['0'] || []) {
                for (const abr of ABRS) {
                    if ((routerAreas[abr] || new Set()).has([...myAreas][0])) {
                        // cost from abr to net within area 0
                        const { dist } = dijkstra(areaGraph['0'].graph, abr);
                        if (dist[netInfo.owner] !== undefined) addViaAbr(abr, [...myAreas][0], netInfo, dist[netInfo.owner]);
                    }
                }
            }
        } else {
            for (const netInfo of areaNetworks[area]) {
                for (const abr of ABRS) {
                    const abrAreas = routerAreas[abr] || new Set();
                    const viaArea = myAreas.has('0') ? '0' : [...myAreas][0];
                    if (!abrAreas.has(viaArea)) continue;
                    // cost from abr to net: if abr in that area, intra-area; else via backbone
                    let cost = Infinity;
                    if (abrAreas.has(area)) {
                        const { dist } = dijkstra(areaGraph[area].graph, abr);
                        if (dist[netInfo.owner] !== undefined) cost = dist[netInfo.owner];
                    } else if (abrAreas.has('0')) {
                        for (const abr2 of ABRS) {
                            if (!(routerAreas[abr2] || new Set()).has(area)) continue;
                            const { dist: d0 } = dijkstra(areaGraph['0'].graph, abr);
                            const { dist: dA } = dijkstra(areaGraph[area].graph, abr2);
                            if (d0[abr2] !== undefined && dA[netInfo.owner] !== undefined) cost = Math.min(cost, d0[abr2] + dA[netInfo.owner]);
                        }
                    }
                    if (cost !== Infinity) addViaAbr(abr, viaArea, netInfo, cost);
                }
            }
        }
    }

    return out;
}

// Attach the state reference to each device so routesOf() can compute dynamic routes.
export function bindState(state) {
    for (const d of state.devices) d.__state = state;
}

// ---------------------------------------------------------------------------
// CDP
// ---------------------------------------------------------------------------

export function cdpNeighbors(state, dev) {
    if (!dev.cdp) return null;
    const out = [];
    for (const link of linksOf(state, dev.id)) {
        if (!linkUp(state, link)) continue;
        const ends = linkEnds(state, link);
        const other = ends.a.id === dev.id ? { dev: ends.b, port: ends.pb } : { dev: ends.a, port: ends.pa };
        const localPort = ends.a.id === dev.id ? ends.pa : ends.pb;
        if (!other.dev.cdp) continue;
        out.push({ deviceId: other.dev.hostname || other.dev.name, localInterface: localPort.name, platform: platformName(other.dev), capability: capabilityName(other.dev), portId: other.port.name });
    }
    return out;
}

// Dynamic-routing neighbours for `show ip ospf neighbor` etc.
export function ospfNeighbors(state, dev) {
    const out = [];
    for (const e of l3Adjacencies(state)) {
        if (e.a !== dev.id && e.b !== dev.id) continue;
        const otherId = e.a === dev.id ? e.b : e.a;
        const other = getDevice(state, otherId);
        if (!other.ospf) continue;
        const areaA = ospfAreaFor(dev, e.subnet, e.mask);
        const areaB = ospfAreaFor(other, e.subnet, e.mask);
        if (areaA === null || areaB === null || areaA !== areaB) continue;
        const isA = e.a === dev.id;
        out.push({ neighborId: other.ospf.routerId || other.hostname, address: isA ? e.bPort.ip : e.aPort.ip, interface: isA ? e.aPort.name : e.bPort.name, area: areaA });
    }
    return out;
}

export function eigrpNeighbors(state, dev) {
    const out = [];
    for (const e of l3Adjacencies(state)) {
        if (e.a !== dev.id && e.b !== dev.id) continue;
        const otherId = e.a === dev.id ? e.b : e.a;
        const other = getDevice(state, otherId);
        if (!other.eigrp || other.eigrp.asn !== dev.eigrp.asn) continue;
        if (!eigrpEnabledOnSubnet(dev, e.subnet, e.mask) || !eigrpEnabledOnSubnet(other, e.subnet, e.mask)) continue;
        const isA = e.a === dev.id;
        out.push({ address: isA ? e.bPort.ip : e.aPort.ip, interface: isA ? e.aPort.name : e.bPort.name });
    }
    return out;
}

function platformName(dev) {
    switch (dev.type) {
        case 'router': return 'cisco ISR4321';
        case 'switch': return 'cisco WS-C2960-24TT-L';
        case 'server': return 'Linux Server';
        default: return 'PC';
    }
}

function capabilityName(dev) {
    switch (dev.type) {
        case 'router': return 'R I';
        case 'switch': return 'S I';
        default: return 'H';
    }
}

// ---------------------------------------------------------------------------
// Forwarding + ping
// ---------------------------------------------------------------------------

function forward(state, dev, packet, log, path, isOrigin, vlan) {
    path.push(dev.id);

    // Delivered?
    if (dev.ports.some((p) => p.ip === packet.dstIp && p.kind !== 'nic')) {
        log.push(`${dev.name}: packet delivered to ${packet.dstIp}`);
        return { delivered: true, path };
    }
    if (dev.type === 'pc' || dev.type === 'server') {
        if (dev.ports.some((p) => p.ip === packet.dstIp)) {
            log.push(`${dev.name}: packet delivered to ${packet.dstIp}`);
            return { delivered: true, path };
        }
    }

    if (dev.type === 'router' && !isOrigin) {
        packet.ttl -= 1;
        if (packet.ttl <= 0) {
            log.push(`${dev.name}: TTL expired — packet dropped`);
            return { delivered: false, path };
        }
    }

    let nextHopIp = null;
    let egressPort = null;
    let outVlan = null;
    let isSerial = false;

    if (dev.type === 'router') {
        const route = longestMatch(dev, packet.dstIp);
        if (!route) {
            log.push(`${dev.name}: no route to ${packet.dstIp} — packet dropped`);
            return { delivered: false, path };
        }
        if (!route.egress) {
            log.push(`${dev.name}: route next-hop unreachable — packet dropped`);
            return { delivered: false, path };
        }
        nextHopIp = route.nextHop || packet.dstIp;
        egressPort = route.egress;
        const eP = getPort(dev, egressPort);
        isSerial = eP && eP.kind === 'serial';
        outVlan = portVlan(dev, eP);
    } else {
        // host (pc/server) or switch originating from SVI
        let eth = null;
        if (dev.type === 'switch') {
            eth = dev.ports.find((p) => p.kind === 'svi' && p.ip && p.up) || null;
        } else {
            eth = getPort(dev, 'eth0');
        }
        if (!eth || !eth.ip) {
            log.push(`${dev.name}: no usable IP interface — packet dropped`);
            return { delivered: false, path };
        }
        if (!eth.up) {
            log.push(`${dev.name}: interface administratively down — packet dropped`);
            return { delivered: false, path };
        }
        const gw = dev.type === 'switch' ? dev.defaultGateway : dev.gateway;
        if (sameSubnet(eth.ip, packet.dstIp, eth.mask)) {
            nextHopIp = packet.dstIp;
        } else if (gw) {
            nextHopIp = gw;
        } else {
            log.push(`${dev.name}: ${packet.dstIp} is on another network and no default gateway is set`);
            return { delivered: false, path };
        }
        egressPort = eth.name;
        outVlan = eth.kind === 'svi' ? eth.vlanId : hostVlan(state, dev);
    }

    const nextDev = state.devices.find((d) => d.ports.some((p) => p.ip === nextHopIp)) || null;

    if (!nextDev) {
        if (!dev.arp[nextHopIp]) {
            log.push(`${dev.name}: ARP request — who has ${nextHopIp}?`);
            log.push(`${dev.name}: ARP timeout — host ${nextHopIp} unreachable`);
        } else {
            log.push(`${dev.name}: ${nextHopIp} unreachable — packet dropped`);
        }
        return { delivered: false, path };
    }

    // Serial point-to-point: no ARP needed.
    let leg;
    if (isSerial) {
        const link = linksOf(state, dev.id).find((l) => {
            const isA = l.a.devId === dev.id && normalizePort(l.a.port) === normalizePort(egressPort);
            const isB = l.b.devId === dev.id && normalizePort(l.b.port) === normalizePort(egressPort);
            return isA || isB;
        });
        if (!link || !linkUp(state, link)) {
            log.push(`${dev.name}: serial link down — packet dropped`);
            return { delivered: false, path };
        }
        leg = [dev.id, nextDev.id];
    } else {
        if (!dev.arp[nextHopIp]) {
            log.push(`${dev.name}: ARP request — who has ${nextHopIp}?`);
            const targetPort = nextDev.ports.find((p) => p.ip === nextHopIp);
            dev.arp[nextHopIp] = targetPort.mac;
            const srcPort = getPort(dev, egressPort);
            if (srcPort && srcPort.ip) nextDev.arp[srcPort.ip] = srcPort.mac;
            log.push(`${nextDev.name}: ARP reply — ${nextHopIp} is at ${targetPort.mac}`);
        }
        leg = l2Path(state, dev, nextDev, outVlan);
        if (!leg) {
            log.push(`${dev.name}: link down on the path to ${nextHopIp} — packet dropped`);
            return { delivered: false, path };
        }
        learnMacs(state, dev, egressPort, leg, nextHopIp, outVlan);
    }

    for (const id of leg.slice(1, -1)) path.push(id);
    return forward(state, nextDev, packet, log, path, false, outVlan);
}

export function ping(state, srcDevId, dstIp, sourceIp = null) {
    const log = [];
    const srcDev = getDevice(state, srcDevId);
    if (!srcDev) return { ok: false, log: ['unknown source device'], trace: { request: [], reply: [] } };
    const srcIp = sourceIp || pickSourceIp(srcDev, dstIp);
    if (!srcIp) {
        return { ok: false, log: [`${srcDev.name}: no usable source IP — cannot ping`], trace: { request: [], reply: [] } };
    }
    if (!isValidIp(dstIp)) {
        return { ok: false, log: ['invalid destination IP address'], trace: { request: [], reply: [] } };
    }
    const dstDev = findDeviceByIp(state, dstIp);
    if (!dstDev) {
        return { ok: false, log: [`${srcDev.name}: destination ${dstIp} is unknown on this network`], trace: { request: [], reply: [] } };
    }

    const req = forward(state, srcDev, { srcIp, dstIp, ttl: 64 }, log, [], true, null);

    let reply = { delivered: false, path: [] };
    if (req.delivered) {
        log.push(`${dstDev.name}: sending ICMP echo reply to ${srcIp}`);
        reply = forward(state, dstDev, { srcIp: dstIp, dstIp: srcIp, ttl: 64 }, log, [], true, null);
    }

    return {
        ok: req.delivered && reply.delivered,
        log,
        trace: { request: req.path, reply: reply.path },
    };
}

function pickEgress(dev, dstIp) {
    const route = longestMatch(dev, dstIp);
    return route ? route.egress : null;
}

// ---------------------------------------------------------------------------
// Config snapshots (copy run start / show startup-config / reload)
// ---------------------------------------------------------------------------

export function serializeConfig(dev) {
    return {
        hostname: dev.hostname,
        banner: dev.banner,
        enableSecret: dev.enableSecret,
        line: JSON.parse(JSON.stringify(dev.line)),
        servicePasswordEncryption: dev.servicePasswordEncryption,
        staticRoutes: JSON.parse(JSON.stringify(dev.staticRoutes)),
        ipv6Routes: JSON.parse(JSON.stringify(dev.ipv6Routes)),
        gateway: dev.gateway,
        defaultGateway: dev.defaultGateway,
        vlans: JSON.parse(JSON.stringify(dev.vlans)),
        rip: dev.rip ? JSON.parse(JSON.stringify(dev.rip)) : null,
        ospf: dev.ospf ? JSON.parse(JSON.stringify(dev.ospf)) : null,
        eigrp: dev.eigrp ? JSON.parse(JSON.stringify(dev.eigrp)) : null,
        cdp: dev.cdp,
        ports: dev.ports.map((p) => ({
            name: p.name, ip: p.ip, mask: p.mask, ipv6: p.ipv6, ipv6Prefix: p.ipv6Prefix,
            up: p.up, desc: p.desc, mode: p.mode, accessVlan: p.accessVlan,
            trunkVlans: p.trunkVlans ? [...p.trunkVlans] : null, nativeVlan: p.nativeVlan,
            encapsulation: p.encapsulation, clockRate: p.clockRate, speed: p.speed, duplex: p.duplex,
            bandwidth: p.bandwidth, dot1q: p.dot1q, parent: p.parent,
            portSecurity: p.portSecurity ? JSON.parse(JSON.stringify(p.portSecurity)) : null,
        })),
    };
}

export function factoryDefaults(type, name) {
    const d = makeDevice(type, name);
    return serializeConfig(d);
}

export function applyConfig(dev, cfg) {
    if (!cfg) return;
    dev.hostname = cfg.hostname ?? dev.hostname;
    dev.name = dev.hostname;
    dev.banner = cfg.banner ?? null;
    dev.enableSecret = cfg.enableSecret ?? null;
    dev.line = cfg.line ?? { console: { password: null, login: false }, vty: { password: null, login: false } };
    dev.servicePasswordEncryption = cfg.servicePasswordEncryption ?? false;
    dev.staticRoutes = cfg.staticRoutes ?? [];
    dev.ipv6Routes = cfg.ipv6Routes ?? [];
    dev.gateway = cfg.gateway ?? null;
    dev.defaultGateway = cfg.defaultGateway ?? null;
    dev.vlans = cfg.vlans ?? dev.vlans;
    dev.rip = cfg.rip ?? null;
    dev.ospf = cfg.ospf ?? null;
    dev.eigrp = cfg.eigrp ?? null;
    dev.cdp = cfg.cdp ?? true;

    // rebuild ports from config
    const byName = {};
    for (const p of dev.ports) byName[normalizePort(p.name)] = p;
    dev.ports = (cfg.ports || []).map((pc) => {
        const base = byName[normalizePort(pc.name)];
        const p = base || {
            name: pc.name, kind: pc.dot1q ? 'subinterface' : 'ethernet', mac: makeMac(),
            ip: null, mask: null, ipv6: null, ipv6Prefix: null, up: false, desc: null,
        };
        p.ip = pc.ip ?? null; p.mask = pc.mask ?? null; p.ipv6 = pc.ipv6 ?? null; p.ipv6Prefix = pc.ipv6Prefix ?? null;
        p.up = pc.up ?? false; p.desc = pc.desc ?? null;
        p.mode = pc.mode ?? p.mode; p.accessVlan = pc.accessVlan ?? p.accessVlan;
        p.trunkVlans = pc.trunkVlans ? [...pc.trunkVlans] : null; p.nativeVlan = pc.nativeVlan ?? p.nativeVlan;
        p.encapsulation = pc.encapsulation ?? p.encapsulation; p.clockRate = pc.clockRate ?? null;
        p.speed = pc.speed ?? p.speed; p.duplex = pc.duplex ?? p.duplex; p.bandwidth = pc.bandwidth ?? p.bandwidth;
        p.dot1q = pc.dot1q ?? p.dot1q; p.parent = pc.parent ?? p.parent;
        p.portSecurity = pc.portSecurity ?? p.portSecurity;
        return p;
    });

    dev.arp = {};
    if (dev.type === 'switch') dev.macTable = {};
    dev.startupConfig = cfg;
}

export function reloadDevice(state, dev) {
    const cfg = dev.startupConfig || null;
    if (cfg) applyConfig(dev, cfg);
    dev.arp = {};
    if (dev.type === 'switch') dev.macTable = {};
    return dev;
}

export function eraseStartupConfig(dev) {
    dev.startupConfig = null;
}

// ---------------------------------------------------------------------------
// Make MAC
// ---------------------------------------------------------------------------

export function makeMac() {
    macSeq += 1;
    return '0000.0000.' + macSeq.toString().padStart(4, '0');
}
