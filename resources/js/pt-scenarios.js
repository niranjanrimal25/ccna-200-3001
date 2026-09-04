// pt-scenarios.js — reusable "practice scenario" framework for the 3D lab.
//
// A scenario is a plain, declarative object, so new topics can be added here
// without touching the 3D / Alpine code. Each scenario:
//   * builds a small topology on a fresh engine state (`build`),
//   * exposes ordered steps (`steps`) — each `run` mutates engine state
//     (e.g. learns MACs) and returns log lines + animated packet frames,
//   * exposes a live table snapshot (`table`) for the docked side panel.
//
// Frames are [fromId, toId, color] triples: one animated packet per cable hop.

import * as E from './pt-engine.js';

// Packet colours (match the legend drawn in the practice panel).
const AMBER = 0xffd166; // frame arriving at the switch (learning)
const ORANGE = 0xfb923c; // flooded frame leaving the switch
const TEAL = 0x5eead4; // unicast-forwarded frame leaving the switch

function device(state, name) {
    return state.devices.find((d) => (d.hostname || d.name) === name) || null;
}

function idOf(state, name) {
    const d = device(state, name);
    return d ? d.id : null;
}

function hostMac(state, name) {
    const d = device(state, name);
    const p = d ? E.getPort(d, 'eth0') : null;
    return p ? p.mac : null;
}

function learn(state, swName, mac, port, vlan = 1) {
    const sw = device(state, swName);
    if (!sw) return;
    if (!sw.macTable[vlan]) sw.macTable[vlan] = {};
    sw.macTable[vlan][mac] = port;
}

function camLookup(state, swName, mac, vlan = 1) {
    const sw = device(state, swName);
    return (sw && sw.macTable[vlan]) ? sw.macTable[vlan][mac] || null : null;
}

// Shared topology builder: `spec.devices` places devices (and configures
// ports), `spec.links` cables them. Used by every scenario.
function buildTopology(state, spec) {
    const byName = {};
    for (const d of spec.devices) {
        const dev = E.makeDevice(d.type, d.name);
        dev.x = d.x;
        dev.z = d.z;
        if (d.ip) {
            const p = E.getPort(dev, 'eth0');
            p.ip = d.ip;
            p.mask = d.mask || '255.255.255.0';
            p.up = true;
        }
        if (d.gateway) dev.gateway = d.gateway;
        if (d.ports) {
            for (const [name, cfg] of Object.entries(d.ports)) {
                Object.assign(E.getPort(dev, name), cfg);
            }
        }
        state.devices.push(dev);
        byName[d.name] = dev;
    }
    for (const [a, ap, b, bp] of spec.links) {
        E.addLink(state, byName[a].id, ap, byName[b].id, bp);
    }
    E.bindState(state);
    return byName;
}

export const SCENARIOS = [
    {
        id: 'mac-learning-flooding',
        icon: '🔁',
        title: 'MAC Learning & Flooding',
        tag: 'Layer 2 · Switching',
        summary: 'Learn, flood, forward and age-out — watch a switch build its MAC address table.',
        objective:
            'PC1, PC2 and PC3 are all on SW1 (VLAN 1). Send frames one at a time and watch SW1 ' +
            'learn each source MAC, flood unknown destinations out every other port, forward known ' +
            'destinations out a single port, then age old entries out after 300 s. ' +
            'Tip: open SW1\u2019s console and run "show mac address-table" at any point.',
        devices: [
            { type: 'pc', name: 'PC1', x: -4, z: 0, ip: '192.168.1.10', gateway: '192.168.1.1' },
            {
                type: 'switch', name: 'SW1', x: 0, z: 0,
                ports: { 'F0/1': { up: true }, 'F0/2': { up: true }, 'F0/3': { up: true } },
            },
            { type: 'pc', name: 'PC2', x: 0, z: 3, ip: '192.168.1.20', gateway: '192.168.1.1' },
            { type: 'pc', name: 'PC3', x: 0, z: -3, ip: '192.168.1.30', gateway: '192.168.1.1' },
        ],
        links: [
            ['PC1', 'eth0', 'SW1', 'F0/1'],
            ['PC2', 'eth0', 'SW1', 'F0/2'],
            ['PC3', 'eth0', 'SW1', 'F0/3'],
        ],

        build(state) {
            buildTopology(state, this);
        },

        steps: [
            {
                title: 'PC1 → PC2 — learn & flood',
                desc:
                    'PC1 sends its first frame to PC2. SW1\u2019s table is empty, so it learns PC1\u2019s ' +
                    'MAC on F0/1 and, not knowing where PC2 is, floods the frame out every other port.',
                run(state) {
                    const m1 = hostMac(state, 'PC1');
                    const m2 = hostMac(state, 'PC2');
                    learn(state, 'SW1', m1, 'F0/1');
                    return {
                        log: [
                            `PC1 → PC2: frame arrives on SW1 F0/1`,
                            `SW1 learns ${m1} on F0/1 (source MAC)`,
                            `Destination ${m2} is NOT in the table → SW1 FLOODS out F0/2 and F0/3`,
                        ],
                        frames: [
                            [idOf(state, 'PC1'), idOf(state, 'SW1'), AMBER],
                            [idOf(state, 'SW1'), idOf(state, 'PC2'), ORANGE],
                            [idOf(state, 'SW1'), idOf(state, 'PC3'), ORANGE],
                        ],
                        hint: `Learned ${m1} on F0/1 · flooded unknown ${m2}`,
                    };
                },
            },
            {
                title: 'PC2 → PC1 — known unicast',
                desc:
                    'PC2 replies to PC1. SW1 learns PC2\u2019s MAC on F0/2. PC1\u2019s MAC is already known ' +
                    'on F0/1, so the switch forwards out that single port only.',
                run(state) {
                    const m2 = hostMac(state, 'PC2');
                    const m1 = hostMac(state, 'PC1');
                    learn(state, 'SW1', m2, 'F0/2');
                    const out = camLookup(state, 'SW1', m1);
                    return {
                        log: [
                            `PC2 → PC1: frame arrives on SW1 F0/2`,
                            `SW1 learns ${m2} on F0/2`,
                            `Destination ${m1} is known on ${out} → SW1 forwards out ${out} only`,
                        ],
                        frames: [
                            [idOf(state, 'PC2'), idOf(state, 'SW1'), AMBER],
                            [idOf(state, 'SW1'), idOf(state, 'PC1'), TEAL],
                        ],
                        hint: `Learned ${m2} on F0/2 · forwarded out ${out} only`,
                    };
                },
            },
            {
                title: 'PC3 → PC1 — known unicast',
                desc:
                    'PC3 sends to PC1. SW1 learns PC3\u2019s MAC on F0/3, then forwards to the already-known ' +
                    'PC1 out F0/1. The table now holds all three entries.',
                run(state) {
                    const m3 = hostMac(state, 'PC3');
                    const m1 = hostMac(state, 'PC1');
                    learn(state, 'SW1', m3, 'F0/3');
                    const out = camLookup(state, 'SW1', m1);
                    return {
                        log: [
                            `PC3 → PC1: frame arrives on SW1 F0/3`,
                            `SW1 learns ${m3} on F0/3`,
                            `Destination ${m1} is known on ${out} → forwards out ${out} only (3 entries now)`,
                        ],
                        frames: [
                            [idOf(state, 'PC3'), idOf(state, 'SW1'), AMBER],
                            [idOf(state, 'SW1'), idOf(state, 'PC1'), TEAL],
                        ],
                        hint: `Learned ${m3} on F0/3 · table complete`,
                    };
                },
            },
            {
                title: '300 s — entries age out',
                desc:
                    'The default aging timer (300 s) expires with no traffic from these hosts, so SW1 ' +
                    'removes every dynamic MAC entry and the table is empty again.',
                run(state) {
                    const sw = device(state, 'SW1');
                    const count = Object.keys(sw.macTable[1] || {}).length;
                    sw.macTable = {};
                    return {
                        log: [
                            `300 s of inactivity → aging timer expires`,
                            `SW1 removes ${count} dynamic MAC entr${count === 1 ? 'y' : 'ies'} — table is empty`,
                        ],
                        frames: [],
                        hint: 'MAC address table aged out (empty)',
                    };
                },
            },
            {
                title: 'PC2 → PC1 again — flood after aging',
                desc:
                    'PC2 sends to PC1 once more. PC1\u2019s entry aged out, so the destination is unknown ' +
                    'again — SW1 re-learns PC2 and floods the frame out F0/1 and F0/3.',
                run(state) {
                    const m2 = hostMac(state, 'PC2');
                    const m1 = hostMac(state, 'PC1');
                    learn(state, 'SW1', m2, 'F0/2');
                    return {
                        log: [
                            `PC2 → PC1: frame arrives on SW1 F0/2 (PC2 is re-learned)`,
                            `Destination ${m1} aged out → SW1 FLOODS out F0/1 and F0/3`,
                            `This is why a switch floods again after entries age out.`,
                        ],
                        frames: [
                            [idOf(state, 'PC2'), idOf(state, 'SW1'), AMBER],
                            [idOf(state, 'SW1'), idOf(state, 'PC1'), ORANGE],
                            [idOf(state, 'SW1'), idOf(state, 'PC3'), ORANGE],
                        ],
                        hint: 'Aged-out entry caused a re-flood',
                    };
                },
            },
        ],

        table(state) {
            const sw = device(state, 'SW1');
            const rows = [];
            for (const [vlan, t] of Object.entries(sw.macTable || {})) {
                for (const [mac, port] of Object.entries(t)) {
                    rows.push({ vlan, mac, type: 'DYNAMIC', port });
                }
            }
            rows.sort((a, b) => a.port.localeCompare(b.port));
            return [{
                id: 'cam',
                title: 'SW1 — MAC Address Table',
                columns: [
                    { key: 'vlan', label: 'VLAN' },
                    { key: 'mac', label: 'MAC Address' },
                    { key: 'type', label: 'Type' },
                    { key: 'port', label: 'Port' },
                ],
                rows,
            }];
        },

        doneText: 'All steps complete — SW1 learned, flooded, forwarded, aged-out and re-flooded. Restart to run it again.',
    },
];

// Roadmap shown in the scenario picker; each maps to a future scenario object above.
export const PLANNED = [
    { icon: '🛰', title: 'ARP Resolution', tag: 'Layer 3 · ARP' },
    { icon: '🏷', title: 'VLANs & Trunking (802.1Q)', tag: 'Layer 2 · VLAN' },
    { icon: '🌳', title: 'Spanning Tree (STP)', tag: 'Layer 2 · STP' },
    { icon: '🔒', title: 'Port Security', tag: 'Layer 2 · Security' },
    { icon: '📡', title: 'Static Routing', tag: 'Layer 3 · Routing' },
    { icon: '🔄', title: 'RIP', tag: 'Layer 3 · Dynamic' },
    { icon: '🕸', title: 'OSPF', tag: 'Layer 3 · Dynamic' },
    { icon: '⚡', title: 'EIGRP', tag: 'Layer 3 · Dynamic' },
    { icon: '🌐', title: 'IPv6 & EUI-64', tag: 'Layer 3 · IPv6' },
    { icon: '🔌', title: 'Serial WAN (HDLC/PPP)', tag: 'WAN' },
    { icon: '👁', title: 'CDP Neighbors', tag: 'Discovery' },
];

export function scenarioById(id) {
    return SCENARIOS.find((s) => s.id === id) || null;
}
