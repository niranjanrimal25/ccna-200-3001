// pt-cli.js — full command-line interpreter for the packet-tracer style lab.
// No DOM / Three.js dependencies. Operates on the pt-engine state so it can be
// unit-tested in Node. The UI layer calls execute() and renders the results.
//
// Modes:
//   router/switch : user (R1>) / priv (R1#) / config (R1(config)#)
//                   iface (config-if) / line (config-line)
//                   router (config-router) / vlan (config-vlan)
//   pc / server    : pc (C:\>)
//
// Interactive prompts (password / confirm / banner) are returned as `prompt`
// and resolved via executePrompt().

import * as E from './pt-engine.js';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

export function portLongName(portName) {
    const n = String(portName).toLowerCase();
    if (n.startsWith('g')) return 'GigabitEthernet' + n.slice(1);
    if (n.startsWith('f')) return 'FastEthernet' + n.slice(1);
    if (n.startsWith('s')) return 'Serial' + n.slice(1);
    if (n.startsWith('lo')) return 'Loopback' + n.slice(2);
    if (n.startsWith('eth')) return 'Ethernet' + n.slice(3);
    if (n.startsWith('vlan')) return 'Vlan' + n.slice(4);
    return portName;
}

export function promptFor(dev, mode) {
    const name = dev.hostname || dev.name;
    if (dev.type === 'pc' || dev.type === 'server') return 'C:\\>';
    switch (mode) {
        case 'user': return `${name}>`;
        case 'priv': return `${name}#`;
        case 'config': return `${name}(config)#`;
        case 'iface': {
            const iface = (dev.__ctx && dev.__ctx.iface) ? portLongName(dev.__ctx.iface) : '?';
            return `${name}(config-if)#`;
        }
        case 'line': return `${name}(config-line)#`;
        case 'router': return `${name}(config-router)#`;
        case 'vlan': return `${name}(config-vlan)#`;
        default: return `${name}>`;
    }
}

function hash5(str) {
    // cosmetic MD5-like hash for `enable secret 5` (NOT cryptographically secure)
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return '$1$mF86$' + h.toString(16).padStart(8, '0');
}

function now() {
    return new Date().toISOString().slice(11, 19);
}

function ctx(dev) {
    if (!dev.__ctx) dev.__ctx = { iface: null, line: null, router: null, vlan: null };
    return dev.__ctx;
}

// ---------------------------------------------------------------------------
// output builders
// ---------------------------------------------------------------------------

function showIpInterfaceBrief(state, dev) {
    const lines = [];
    lines.push('Interface              IP-Address      OK? Method Status                Protocol');
    for (const p of dev.ports) {
        if (p.kind === 'svi' && !p.ip) continue;
        const long = portLongName(p.name).padEnd(21);
        const ip = (p.ip || 'unassigned').padEnd(15);
        const ok = 'YES'.padEnd(4);
        const method = p.ip ? (p.kind === 'svi' ? 'NVRAM' : 'manual') : 'unset';
        const methodS = method.padEnd(7);
        const status = p.up ? 'up' : 'administratively down';
        const statusS = status.padEnd(21);
        const proto = E.lineProtocolUp(state, dev, p) ? 'up' : 'down';
        lines.push(`${long} ${ip} ${ok} ${methodS} ${statusS} ${proto}`);
    }
    return lines;
}

function showIpRoute(dev) {
    const lines = [];
    lines.push('Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP');
    lines.push('       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area');
    lines.push('       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2');
    lines.push('       i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1, L2 - IS-IS level-2');
    lines.push('       ia - IS-IS inter area, * - candidate default, U - per-user static route');
    lines.push('       o - ODR, P - periodic downloaded static route, H - NHRP, l - LISP');
    lines.push('       + - replicated route, % - next hop override');
    lines.push('');
    lines.push('Gateway of last resort is not set');
    lines.push('');

    const routes = E.routesOf(dev);
    for (const r of routes) {
        const prefix = `${r.net}/${r.prefix}`.padEnd(20);
        let code = r.type;
        if (r.type === 'O IA') code = 'O IA';
        if (r.type === 'C') {
            lines.push(`C        ${prefix} is directly connected, ${portLongName(r.egress)}`);
        } else if (r.type === 'S' || r.type === 'S*') {
            const via = r.nextHop ? ` via ${r.nextHop}` : '';
            lines.push(`S        ${prefix} [1/0]${via}`);
        } else if (r.type === 'O' || r.type === 'O IA') {
            const metric = r.metric ?? 0;
            lines.push(`O${r.type === 'O IA' ? ' IA' : '       '} ${prefix} [110/${metric}] via ${r.nextHop}, 00:00:0${(metric % 9) + 1}, ${portLongName(r.egress)}`);
        } else if (r.type === 'R') {
            lines.push(`R        ${prefix} [120/${r.metric ?? 1}] via ${r.nextHop}, 00:00:0${((r.metric ?? 1) % 9) + 1}, ${portLongName(r.egress)}`);
        } else if (r.type === 'D') {
            lines.push(`D        ${prefix} [90/${r.metric ?? 0}] via ${r.nextHop}, 00:00:0${((r.metric ?? 0) % 9) + 1}, ${portLongName(r.egress)}`);
        }
    }

    // local /32 host routes
    for (const p of dev.ports) {
        if (p.ip && p.up && p.kind !== 'nic' && p.kind !== 'subinterface' && p.kind !== 'svi') {
            lines.push(`L        ${p.ip}/32 is directly connected, ${portLongName(p.name)}`);
        }
    }
    return lines;
}

function showIpv6InterfaceBrief(state, dev) {
    const lines = [];
    lines.push('Interface              IPv6 Address                                  Status Protocol');
    for (const p of dev.ports) {
        if (p.kind === 'svi' && !p.ipv6) continue;
        if (!p.ipv6 && p.kind !== 'ethernet' && p.kind !== 'serial' && p.kind !== 'subinterface' && p.kind !== 'loopback') continue;
        const status = p.up ? 'up' : 'administratively down';
        const proto = E.lineProtocolUp(state, dev, p) ? 'up' : 'down';
        const stateS = `${status}/${proto}`;
        lines.push(`${portLongName(p.name).padEnd(21)} [${stateS}]`);
        lines.push(`    ${E.ipv6LinkLocal(dev).toUpperCase()}`);
        if (p.ipv6) lines.push(`    ${p.ipv6}/${p.ipv6Prefix || 64}`.toUpperCase());
    }
    return lines;
}

function showIpv6Route(dev) {
    const lines = [];
    lines.push('Codes: C - Connected, L - Local, S - Static');
    for (const p of dev.ports) {
        if (p.ipv6 && p.up && p.kind !== 'nic') {
            const net = E.ipv6Network(p.ipv6, p.ipv6Prefix || 64);
            lines.push(`C   ${net.replace('::/', '::/').toUpperCase()} [0/0]`);
            lines.push(`     via ${portLongName(p.name)}, directly connected`);
        }
    }
    for (const r of dev.ipv6Routes || []) {
        lines.push(`S   ${r.prefix.toUpperCase()} [1/0] via ${r.nextHop.toUpperCase()}`);
    }
    return lines;
}

function showInterfaces(state, dev) {
    const lines = [];
    for (const p of dev.ports) {
        if (p.kind === 'svi') continue;
        const status = p.up ? 'up' : 'administratively down';
        const proto = E.lineProtocolUp(state, dev, p) ? 'up' : 'down';
        lines.push(`${portLongName(p.name)} is ${status}, line protocol is ${proto}`);
        const hw = p.kind === 'serial' ? 'M4T' : p.name.toLowerCase().startsWith('g') ? 'iGbE' : 'FastEthernet';
        lines.push(`  Hardware is ${hw}, address is ${p.mac} (bia ${p.mac})`);
        if (p.ip) lines.push(`  Internet address is ${p.ip}/${E.prefixLen(p.mask)}`);
        if (p.ipv6) lines.push(`  IPv6 address is ${p.ipv6}/${p.ipv6Prefix || 64} (global)`);
        lines.push(`  MTU 1500 bytes, BW ${p.bandwidth || 1000000} Kbit/sec, DLY 10 usec,`);
        lines.push(`     reliability 255/255, txload 1/255, rxload 1/255`);
        const encap = p.kind === 'serial' ? String(p.encapsulation || 'hdlc').toUpperCase() : (p.kind === 'subinterface' ? '802.1Q Virtual LAN, Vlan ID ' + p.dot1q : 'ARPA');
        lines.push(`  Encapsulation ${encap}, loopback not set`);
        if (p.kind === 'serial') {
            lines.push(`  ${p.clockRate ? 'DCE' : 'DTE'} ${p.clockRate ? ', clock rate ' + p.clockRate : ''}`);
        }
        if (p.kind === 'subinterface') {
            lines.push(`  Encapsulation 802.1Q Virtual LAN, Vlan ID ${p.dot1q}.`);
        }
        if (p.desc) lines.push(`  Description: ${p.desc}`);
        lines.push('');
    }
    return lines;
}

function showVlanBrief(dev) {
    const lines = [];
    lines.push('VLAN Name                             Status    Ports');
    lines.push('---- -------------------------------- --------- -------------------------------');
    const accessPorts = (vlan) => dev.ports
        .filter((p) => p.kind === 'ethernet' && p.mode !== 'trunk' && (p.accessVlan || 1) === vlan)
        .map((p) => portLongName(p.name)).join(', ');
    for (const v of dev.vlans || [{ id: 1, name: 'default' }]) {
        lines.push(`${String(v.id).padEnd(4)} ${(v.name || '').padEnd(32)} active    ${accessPorts(v.id)}`);
    }
    return lines;
}

function showInterfacesTrunk(dev) {
    const lines = [];
    lines.push('Port        Mode             Encapsulation  Status        Native vlan');
    const trunks = dev.ports.filter((p) => p.kind === 'ethernet' && p.mode === 'trunk');
    for (const t of trunks) {
        const status = t.up ? 'trunking' : 'down';
        lines.push(`${portLongName(t.name).padEnd(11)} on               802.1q         ${status.padEnd(13)} ${t.nativeVlan || 1}`);
    }
    lines.push('');
    lines.push('Port        Vlans allowed on trunk');
    for (const t of trunks) {
        lines.push(`${portLongName(t.name).padEnd(11)} ${t.trunkVlans ? t.trunkVlans.join(',') : '1-4094'}`);
    }
    return lines;
}

function showMacTable(dev) {
    const lines = [];
    lines.push('          Mac Address Table');
    lines.push('-------------------------------------------');
    lines.push('Vlan    Mac Address       Type        Ports');
    lines.push('----    -----------       --------    -----');
    let any = false;
    for (const [vlan, table] of Object.entries(dev.macTable || {})) {
        for (const [mac, port] of Object.entries(table)) {
            any = true;
            lines.push(`${String(vlan).padEnd(7)} ${mac}    DYNAMIC     ${portLongName(port)}`);
        }
    }
    if (!any) lines.push('(no dynamically learned MAC addresses)');
    return lines;
}

function showPortSecurity(dev) {
    const lines = [];
    lines.push('Secure Port  MaxSecureAddr  CurrentAddr  SecurityViolation  Security Action');
    lines.push('               (Count)       (Count)         (Count)');
    lines.push('---------------------------------------------------------------------------');
    let any = false;
    for (const p of dev.ports) {
        if (p.kind !== 'ethernet' || !p.portSecurity?.enabled) continue;
        any = true;
        const action = { shutdown: 'Shutdown', restrict: 'Restrict', protect: 'Protect' }[p.portSecurity.violation] || p.portSecurity.violation;
        lines.push(`${portLongName(p.name).padEnd(14)} ${String(p.portSecurity.maximum).padEnd(13)} ${String(p.portSecurity.macs.length).padEnd(13)} 0                 ${action}`);
    }
    if (!any) lines.push('(no secure ports configured)');
    return lines;
}

function showCdpNeighbors(state, dev) {
    const lines = [];
    if (!dev.cdp) {
        lines.push('% CDP is not enabled');
        return lines;
    }
    const n = E.cdpNeighbors(state, dev) || [];
    lines.push('Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge');
    lines.push('                  S - Switch, H - Host, I - IGMP, r - Repeater');
    lines.push('');
    lines.push('Device ID        Local Intrfce     Holdtme    Capability  Platform            Port ID');
    for (const nb of n) {
        lines.push(`${(nb.deviceId || '').padEnd(16)} ${portLongName(nb.localInterface).padEnd(17)} 160        ${(nb.capability || '').padEnd(11)} ${(nb.platform || '').padEnd(19)} ${portLongName(nb.portId)}`);
    }
    if (!n.length) lines.push('(no CDP neighbors)');
    return lines;
}

function showIpProtocols(dev) {
    const lines = [];
    lines.push('*** IP Routing is NSF aware ***');
    lines.push('');
    if (dev.ospf) {
        const areas = new Set(dev.ospf.networks.map((n) => n.area));
        lines.push(`Routing Protocol is "ospf ${dev.ospf.pid}"`);
        lines.push(`  Router ID ${dev.ospf.routerId}`);
        lines.push(`  Number of areas in this router is ${areas.size}. ${areas.size} normal 0 stub 0 nssa`);
        lines.push('  Maximum path: 4');
        lines.push('  Routing for Networks:');
        for (const n of dev.ospf.networks) lines.push(`    ${n.net} ${n.wildcard} area ${n.area}`);
        lines.push('  Routing Information Sources:');
        lines.push('    Gateway         Distance      Last Update');
    }
    if (dev.rip) {
        lines.push('Routing Protocol is "rip"');
        lines.push('  Sending updates every 30 seconds, next due in 0 seconds');
        lines.push('  Default version control: send version 2, receive version 2');
        lines.push('  Routing for Networks:');
        for (const n of dev.rip.networks) lines.push(`    ${n.net}`);
        lines.push('  Distance: (default is 120)');
    }
    if (dev.eigrp) {
        lines.push(`Routing Protocol is "eigrp ${dev.eigrp.asn}"`);
        lines.push('  Router ID ' + (dev.eigrp.routerId || '0.0.0.0'));
        lines.push('  Routing for Networks:');
        for (const n of dev.eigrp.networks) lines.push(`    ${n.net} ${n.wildcard || '0.0.0.255'}`);
        lines.push('  Distance: internal 90 external 170');
    }
    if (!dev.ospf && !dev.rip && !dev.eigrp) {
        lines.push('No routing protocol is configured.');
    }
    return lines;
}

function showOspfNeighbor(state, dev) {
    const lines = [];
    if (!dev.ospf) {
        lines.push('% OSPF is not enabled');
        return lines;
    }
    lines.push('');
    lines.push('Neighbor ID     Pri   State           Dead Time   Address         Interface');
    const n = E.ospfNeighbors(state, dev);
    for (const nb of n) {
        lines.push(`${(nb.neighborId || '0.0.0.0').padEnd(15)} 1     FULL/  -        00:00:31     ${(nb.address || '').padEnd(14)} ${portLongName(nb.interface)}`);
    }
    if (!n.length) lines.push('(no OSPF neighbors)');
    return lines;
}

function showVersion(dev) {
    const type = dev.type === 'router' ? 'ISR4321/K9' : dev.type === 'switch' ? 'WS-C2960-24TT-L' : 'PC';
    return [
        'Cisco IOS Software, Practice Lab Simulator (for CCNA 200-301)',
        `Copyright (c) 1986-2026 by Practice Lab`,
        '',
        `${dev.hostname || dev.name} uptime is 0 minutes`,
        'System returned to ROM by reload',
        'System image file is "flash:lab"',
        '',
        `cisco ${type} processor with 3825664K/6144K bytes of memory`,
        '',
        dev.type === 'router'
            ? '2 Gigabit Ethernet interfaces\n2 Serial(sync/async) interfaces\n1 Loopback interface'
            : dev.type === 'switch'
                ? '24 FastEthernet interfaces\n2 Gigabit Ethernet interfaces\n1 VLAN interface'
                : '1 Ethernet interface',
        '',
        'Configuration register is 0x2102',
    ];
}

function showRunningConfig(dev) {
    return formatConfigObject(E.serializeConfig(dev));
}

function showStartupConfig(dev) {
    if (!dev.startupConfig) {
        return ['startup-config is not present'];
    }
    return formatConfigObject(dev.startupConfig);
}

function formatConfigObject(cfg) {
    const lines = [];
    lines.push('!');
    lines.push('version 15.2');
    lines.push(`hostname ${cfg.hostname}`);
    lines.push('!');
    if (cfg.banner) {
        lines.push('banner motd ^C');
        lines.push(cfg.banner);
        lines.push('^C');
        lines.push('!');
    }
    if (cfg.enableSecret) {
        lines.push('enable secret 5 ' + (cfg.enableSecret.type === '5' ? cfg.enableSecret.value : hash5(cfg.enableSecret.value)));
    }
    if (cfg.servicePasswordEncryption) lines.push('service password-encryption');
    lines.push('no ip domain lookup');
    lines.push('!');

    for (const p of cfg.ports || []) {
        lines.push(`interface ${portLongName(p.name)}`);
        if (p.desc) lines.push(` description ${p.desc}`);
        if (p.kind === 'subinterface') {
            if (p.encapsulation) lines.push(` encapsulation dot1Q ${p.dot1q}`);
        } else if (p.kind === 'serial') {
            if (p.encapsulation) lines.push(` encapsulation ${p.encapsulation}`);
            if (p.clockRate) lines.push(` clock rate ${p.clockRate}`);
        }
        if (p.mode === 'access' && p.kind === 'ethernet') {
            lines.push(` switchport mode access`);
            lines.push(` switchport access vlan ${p.accessVlan || 1}`);
        } else if (p.mode === 'trunk') {
            lines.push(` switchport mode trunk`);
            lines.push(` switchport trunk native vlan ${p.nativeVlan || 1}`);
        }
        if (p.ip) lines.push(` ip address ${p.ip} ${p.mask}`);
        else if (p.kind !== 'subinterface') lines.push(' no ip address');
        if (p.ipv6) lines.push(` ipv6 address ${p.ipv6}/${p.ipv6Prefix || 64}`);
        if (p.speed && p.speed !== 'auto') lines.push(` speed ${p.speed}`);
        if (p.duplex && p.duplex !== 'auto') lines.push(` duplex ${p.duplex}`);
        if (p.up) lines.push(' no shutdown');
        else lines.push(' shutdown');
        lines.push('!');
    }

    if (cfg.vlans) {
        for (const v of cfg.vlans) {
            if (v.id === 1) continue;
            lines.push(`vlan ${v.id}`);
            lines.push(` name ${v.name}`);
            lines.push('!');
        }
    }

    for (const r of cfg.staticRoutes || []) {
        lines.push(`ip route ${r.net} ${r.mask} ${r.nextHop}`);
    }
    for (const r of cfg.ipv6Routes || []) {
        lines.push(`ipv6 route ${r.prefix} ${r.nextHop}`);
    }

    if (cfg.rip) {
        lines.push(`router rip`);
        lines.push(' version 2');
        lines.push(' no auto-summary');
        for (const n of cfg.rip.networks) lines.push(` network ${n.net}`);
        lines.push('!');
    }
    if (cfg.ospf) {
        lines.push(`router ospf ${cfg.ospf.pid}`);
        if (cfg.ospf.routerId) lines.push(` router-id ${cfg.ospf.routerId}`);
        for (const n of cfg.ospf.networks) lines.push(` network ${n.net} ${n.wildcard} area ${n.area}`);
        lines.push('!');
    }
    if (cfg.eigrp) {
        lines.push(`router eigrp ${cfg.eigrp.asn}`);
        if (cfg.eigrp.routerId) lines.push(` eigrp router-id ${cfg.eigrp.routerId}`);
        for (const n of cfg.eigrp.networks) lines.push(` network ${n.net} ${n.wildcard || ''}`.trimEnd());
        lines.push('!');
    }

    lines.push('line con 0');
    if (cfg.line && cfg.line.console.password) {
        lines.push(` password ${cfg.servicePasswordEncryption ? hash5(cfg.line.console.password) : cfg.line.console.password}`);
        lines.push(' login');
    }
    lines.push('line vty 0 4');
    if (cfg.line && cfg.line.vty.password) {
        lines.push(` password ${cfg.servicePasswordEncryption ? hash5(cfg.line.vty.password) : cfg.line.vty.password}`);
        lines.push(' login');
    }
    lines.push('!');
    lines.push('end');
    return lines;
}

// ---------------------------------------------------------------------------
// ping / traceroute output
// ---------------------------------------------------------------------------

function ciscoPing(state, dev, ip) {
    const result = E.ping(state, dev.id, ip);
    const lines = [];
    lines.push('Type escape sequence to abort.');
    lines.push(`Sending 5, 100-byte ICMP Echos to ${ip}, timeout is 2 seconds:`);
    lines.push(result.ok ? '!!!!!' : '.....');
    const n = result.ok ? 5 : 0;
    lines.push(`Success rate is ${result.ok ? 100 : 0} percent (${n}/5), round-trip min/avg/max = 1/1/3 ms`);
    return { lines, result };
}

function winPing(state, dev, ip) {
    const result = E.ping(state, dev.id, ip);
    const lines = [];
    lines.push('');
    lines.push(`Pinging ${ip} with 32 bytes of data:`);
    const ttl = result.ok ? Math.max(1, 64 - (result.trace.request.length - 1)) : 0;
    if (result.ok) {
        for (let i = 0; i < 4; i++) lines.push(`Reply from ${ip}: bytes=32 time=1ms TTL=${ttl}`);
    } else {
        for (let i = 0; i < 4; i++) lines.push('Request timed out.');
    }
    lines.push('');
    lines.push(`Ping statistics for ${ip}:`);
    lines.push(`    Packets: Sent = 4, Received = ${result.ok ? 4 : 0}, Lost = ${result.ok ? 0 : 4} (${result.ok ? 0 : 100}% loss),`);
    lines.push('Approximate round trip times in milli-seconds:');
    lines.push(`    Minimum = ${result.ok ? 0 : 0}ms, Maximum = ${result.ok ? 1 : 0}ms, Average = ${result.ok ? 0 : 0}ms`);
    return { lines, result };
}

function traceRoute(state, dev, ip) {
    const result = E.ping(state, dev.id, ip);
    const lines = [];
    lines.push('Type escape sequence to abort.');
    lines.push(`Tracing the route to ${ip}`);
    lines.push('');
    if (!result.ok) {
        lines.push(...result.log.slice(-3));
        return { lines, result };
    }
    const seen = [];
    result.trace.request.forEach((id, i) => {
        const d = E.getDevice(state, id);
        if (d) {
            lines.push(`  ${i + 1}  ${(d.ports.find((p) => p.ip) || {}).ip || '-'}  1 msec  1 msec  1 msec`);
            seen.push(d.hostname || d.name);
        }
    });
    return { lines, result };
}

// ---------------------------------------------------------------------------
// command execution
// ---------------------------------------------------------------------------

function invalidInput(lines) {
    lines.push('% Invalid input detected at ' + "'^'" + ' marker.');
}

export function execute(state, dev, mode, rawInput) {
    const input = String(rawInput || '').trim();
    const lines = [];
    const events = [];
    let nextMode = mode;
    let prompt = null;

    if (!input) return { mode: nextMode, lines, events, prompt };

    const cmd = input.toLowerCase();
    const parts = input.split(/\s+/);
    const isSwitch = dev.type === 'switch';

    // ------------------------------------------------------------- PC ------
    if (dev.type === 'pc' || dev.type === 'server') {
        return executePc(state, dev, input, cmd, parts, lines, events, nextMode, prompt);
    }

    // ----------------------------------------------------- Cisco IOS -------
    if (mode === 'user') {
        if (cmd === 'enable' || cmd === 'en') {
            if (dev.enableSecret) {
                prompt = { kind: 'password', target: 'enable' };
                lines.push('Password: ');
            } else {
                nextMode = 'priv';
                lines.push(`${dev.name}#`);
            }
        } else if (cmd === '?' || cmd === 'help') {
            lines.push(...IOS_HELP);
        } else if (cmd.startsWith('show ')) {
            lines.push(...runShow(state, dev, cmd, isSwitch));
        } else if (cmd.startsWith('ping ')) {
            const ip = input.slice(5).trim();
            if (!E.isValidIp(ip) && !E.isValidIpv6(ip)) lines.push('% Unrecognized host or address, or protocol not running');
            else {
                const { lines: pl, result } = ciscoPing(state, dev, ip);
                lines.push(...pl);
                events.push({ type: 'ping', fromId: dev.id, result });
            }
        } else if (cmd.startsWith('traceroute ') || cmd.startsWith('trace ')) {
            const ip = input.split(/\s+/)[1];
            if (!E.isValidIp(ip)) lines.push('% Unrecognized host or address, or protocol not running');
            else {
                const { lines: pl, result } = traceRoute(state, dev, ip);
                lines.push(...pl);
                events.push({ type: 'ping', fromId: dev.id, result });
            }
        } else if (cmd === 'terminal length 0' || cmd === 'terminal length' ) {
            // cosmetic, no-op
        } else {
            invalidInput(lines);
        }
    } else if (mode === 'priv') {
        if (cmd === 'configure terminal' || cmd === 'conf t') {
            nextMode = 'config';
            lines.push('Enter configuration commands, one per line.  End with CNTL/Z.');
        } else if (cmd === 'exit' || cmd === 'disable') {
            nextMode = 'user';
        } else if (cmd === '?' || cmd === 'help') {
            lines.push(...IOS_HELP);
        } else if (cmd.startsWith('show ')) {
            lines.push(...runShow(state, dev, cmd, isSwitch));
        } else if (cmd.startsWith('ping ')) {
            const ip = input.slice(5).trim();
            if (!E.isValidIp(ip) && !E.isValidIpv6(ip)) lines.push('% Unrecognized host or address, or protocol not running');
            else {
                const { lines: pl, result } = ciscoPing(state, dev, ip);
                lines.push(...pl);
                events.push({ type: 'ping', fromId: dev.id, result });
            }
        } else if (cmd.startsWith('traceroute ') || cmd.startsWith('trace ')) {
            const ip = input.split(/\s+/)[1];
            if (!E.isValidIp(ip)) lines.push('% Unrecognized host or address, or protocol not running');
            else {
                const { lines: pl, result } = traceRoute(state, dev, ip);
                lines.push(...pl);
                events.push({ type: 'ping', fromId: dev.id, result });
            }
        } else if (cmd === 'write' || cmd === 'wr' || cmd === 'copy running-config startup-config' || cmd === 'write memory') {
            dev.startupConfig = E.serializeConfig(dev);
            lines.push('Building configuration...');
            lines.push('[OK]');
            events.push({ type: 'config-changed' });
        } else if (cmd === 'erase startup-config' || cmd === 'erase nvram:') {
            prompt = { kind: 'confirm', action: 'erase' };
            lines.push('Erasing the nvram filesystem will remove all configuration files! Continue? [confirm]');
        } else if (cmd === 'reload') {
            prompt = { kind: 'confirm', action: 'reload' };
            lines.push('Proceed with reload? [confirm]');
        } else if (cmd === 'clear mac address-table' || cmd === 'clear mac address-table dynamic') {
            dev.macTable = {};
            lines.push('Mac address table cleared.');
        } else if (cmd === 'clear arp-cache') {
            dev.arp = {};
            lines.push('ARP cache cleared.');
        } else {
            invalidInput(lines);
        }
    } else if (mode === 'config') {
        if (cmd === 'exit') {
            nextMode = 'priv';
        } else if (cmd === 'end' || cmd === 'ctrl+z') {
            nextMode = 'priv';
        } else if (cmd.startsWith('hostname ')) {
            const name = input.slice(9).trim();
            if (!name || !/^[\w.-]+$/.test(name)) lines.push('% Invalid hostname');
            else {
                dev.hostname = name; dev.name = name;
                events.push({ type: 'config-changed' });
            }
        } else if (cmd.startsWith('enable secret ')) {
            const arg = input.slice(14).trim();
            const m = arg.match(/^(5|0)\s+(\S+)$/);
            if (m) {
                dev.enableSecret = m[1] === '5' ? { type: '5', value: m[2] } : { type: '0', value: m[2] };
            } else {
                dev.enableSecret = { type: '5', value: hash5(arg) };
            }
            events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('enable password ')) {
            dev.enablePassword = input.slice(16).trim();
            events.push({ type: 'config-changed' });
        } else if (cmd === 'no enable secret' || cmd === 'no enable password') {
            dev.enableSecret = null; dev.enablePassword = null;
            events.push({ type: 'config-changed' });
        } else if (cmd === 'service password-encryption') {
            dev.servicePasswordEncryption = true;
            events.push({ type: 'config-changed' });
        } else if (cmd === 'no service password-encryption') {
            dev.servicePasswordEncryption = false;
            events.push({ type: 'config-changed' });
        } else if (cmd === 'no ip domain-lookup' || cmd === 'no ip domain lookup') {
            // cosmetic no-op
        } else if (cmd.startsWith('banner motd ')) {
            const delim = input.slice(12).trim().charAt(0);
            prompt = { kind: 'banner', delimiter: delim };
        } else if (cmd.startsWith('line console ') || cmd === 'line console 0') {
            ctx(dev).line = 'console';
            nextMode = 'line';
        } else if (cmd.startsWith('line vty ')) {
            ctx(dev).line = 'vty';
            nextMode = 'line';
        } else if (cmd.startsWith('interface ')) {
            const portArg = input.slice(10).trim();
            const port = E.findPortByText(dev, portArg);
            if (!port) {
                lines.push('% Invalid interface type and number');
            } else {
                ctx(dev).iface = port.name;
                nextMode = 'iface';
                events.push({ type: 'config-changed' });
            }
        } else if (cmd.startsWith('vlan ') && isSwitch) {
            const m = input.match(/^vlan\s+(\d+)$/);
            if (!m) { invalidInput(lines); }
            else {
                const id = parseInt(m[1], 10);
                E.ensureVlan(dev, id);
                ctx(dev).vlan = id;
                nextMode = 'vlan';
                events.push({ type: 'config-changed' });
            }
        } else if (cmd.startsWith('router rip')) {
            dev.rip = dev.rip || { version: 2, networks: [], passive: [] };
            ctx(dev).router = 'rip';
            nextMode = 'router';
            events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('router ospf ')) {
            const pid = input.match(/^router ospf\s+(\d+)$/);
            if (!pid) { invalidInput(lines); }
            else {
                dev.ospf = dev.ospf || { pid: parseInt(pid[1], 10), routerId: null, networks: [], passive: [] };
                ctx(dev).router = 'ospf';
                nextMode = 'router';
                events.push({ type: 'config-changed' });
            }
        } else if (cmd.startsWith('router eigrp ')) {
            const asn = input.match(/^router eigrp\s+(\d+)$/);
            if (!asn) { invalidInput(lines); }
            else {
                dev.eigrp = dev.eigrp || { asn: parseInt(asn[1], 10), routerId: null, networks: [], passive: [] };
                ctx(dev).router = 'eigrp';
                nextMode = 'router';
                events.push({ type: 'config-changed' });
            }
        } else if (cmd === 'no router rip') {
            dev.rip = null; events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('no router ospf')) {
            dev.ospf = null; events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('no router eigrp')) {
            dev.eigrp = null; events.push({ type: 'config-changed' });
        } else if (cmd === 'ip routing' && isSwitch) {
            dev.ipRouting = true; events.push({ type: 'config-changed' });
        } else if (cmd === 'no ip routing' && isSwitch) {
            dev.ipRouting = false; events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('ip default-gateway ') && isSwitch) {
            const ip = input.slice(19).trim();
            if (!E.isValidIp(ip)) lines.push('% Invalid IP address');
            else { dev.defaultGateway = ip; events.push({ type: 'config-changed' }); }
        } else if (cmd.startsWith('ip route ')) {
            handleIpRoute(dev, input, parts, lines, events, true);
        } else if (cmd.startsWith('no ip route ')) {
            handleIpRoute(dev, input, parts, lines, events, false);
        } else if (cmd === 'ipv6 unicast-routing') {
            dev.ipv6Routing = true; events.push({ type: 'config-changed' });
        } else if (cmd === 'no ipv6 unicast-routing') {
            dev.ipv6Routing = false; events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('ipv6 route ')) {
            const m = input.match(/^ipv6 route\s+(\S+)\s+(\S+)$/);
            if (!m || !E.isValidIpv6(m[1]) || !E.isValidIpv6(m[2])) lines.push('% Invalid IPv6 route');
            else {
                dev.ipv6Routes = dev.ipv6Routes || [];
                dev.ipv6Routes.push({ prefix: m[1], nextHop: m[2] });
                events.push({ type: 'config-changed' });
            }
        } else if (cmd === 'cdp run') {
            dev.cdp = true; events.push({ type: 'config-changed' });
        } else if (cmd === 'no cdp run') {
            dev.cdp = false; events.push({ type: 'config-changed' });
        } else if (cmd === '?' || cmd === 'help') {
            lines.push(...IOS_HELP);
        } else {
            invalidInput(lines);
        }
    } else if (mode === 'iface') {
        const ifaceName = ctx(dev).iface;
        const port = ifaceName ? E.getPort(dev, ifaceName) : null;
        if (!port) { nextMode = 'config'; return { mode: nextMode, lines: ['% interface not found'], events, prompt }; }

        if (cmd === 'exit') {
            nextMode = 'config';
        } else if (cmd === 'end' || cmd === 'ctrl+z') {
            nextMode = 'priv';
        } else if (cmd.startsWith('ip address ')) {
            const m = input.match(/^ip address\s+(\S+)\s+(\S+)$/);
            if (!m || !E.isValidIp(m[1]) || !E.isValidMask(m[2])) lines.push('% Invalid IP address or subnet mask');
            else {
                port.ip = m[1]; port.mask = m[2];
                events.push({ type: 'config-changed' });
            }
        } else if (cmd === 'no ip address') {
            port.ip = null; port.mask = null; events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('ipv6 address ')) {
            const m = input.match(/^ipv6 address\s+(\S+)$/);
            const addr = m ? m[1] : null;
            const slash = addr ? addr.indexOf('/') : -1;
            if (!addr || slash < 0 || !E.isValidIpv6(addr.split('/')[0])) lines.push('% Invalid IPv6 address');
            else {
                port.ipv6 = addr.split('/')[0]; port.ipv6Prefix = parseInt(addr.split('/')[1], 10);
                events.push({ type: 'config-changed' });
            }
        } else if (cmd === 'no shutdown' || cmd === 'no shut') {
            port.up = true; events.push({ type: 'config-changed' });
        } else if (cmd === 'shutdown') {
            port.up = false; events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('description ')) {
            port.desc = input.slice(12).trim(); events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('speed ')) {
            const s = parts[1];
            if (!/^(auto|10|100|1000)$/.test(s)) lines.push('% Invalid speed');
            else { port.speed = s; events.push({ type: 'config-changed' }); }
        } else if (cmd.startsWith('duplex ')) {
            const d = parts[1];
            if (!/^(auto|full|half)$/.test(d)) lines.push('% Invalid duplex');
            else { port.duplex = d; events.push({ type: 'config-changed' }); }
        } else if (cmd.startsWith('bandwidth ')) {
            const bw = parseInt(parts[1], 10);
            if (!Number.isInteger(bw) || bw <= 0) lines.push('% Invalid bandwidth');
            else { port.bandwidth = bw; events.push({ type: 'config-changed' }); }
        } else if (cmd.startsWith('encapsulation dot1q ') || cmd.startsWith('encapsulation dot1Q ')) {
            const vlan = parseInt(input.split(/\s+/)[2], 10);
            if (!Number.isInteger(vlan) || vlan < 1 || vlan > 4094) lines.push('% Invalid VLAN ID');
            else {
                port.encapsulation = 'dot1q'; port.dot1q = vlan;
                events.push({ type: 'config-changed' });
            }
        } else if (cmd.startsWith('encapsulation ')) {
            const enc = parts[1];
            if (port.kind !== 'serial') lines.push('% Encapsulation can only be set on serial interfaces');
            else if (!/^(hdlc|ppp)$/.test(enc)) lines.push('% Invalid encapsulation');
            else { port.encapsulation = enc; events.push({ type: 'config-changed' }); }
        } else if (cmd.startsWith('clock rate ')) {
            const rate = parseInt(parts[2], 10);
            if (port.kind !== 'serial') lines.push('% Clock rate can only be set on serial interfaces');
            else if (!Number.isInteger(rate)) lines.push('% Invalid clock rate');
            else { port.clockRate = rate; events.push({ type: 'config-changed' }); }
        } else if (cmd.startsWith('switchport mode access')) {
            port.mode = 'access'; events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('switchport mode trunk')) {
            port.mode = 'trunk'; events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('switchport access vlan ')) {
            const vlan = parseInt(input.split(/\s+/)[3], 10);
            if (!Number.isInteger(vlan)) lines.push('% Invalid VLAN');
            else { port.mode = 'access'; port.accessVlan = vlan; E.ensureVlan(dev, vlan); events.push({ type: 'config-changed' }); }
        } else if (cmd.startsWith('switchport trunk allowed vlan ')) {
            const list = input.slice(30).trim();
            if (list === 'all') port.trunkVlans = null;
            else {
                const vlans = list.split(',').map((x) => parseInt(x.trim(), 10)).filter((x) => Number.isInteger(x));
                port.trunkVlans = vlans;
            }
            events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('switchport trunk native vlan ')) {
            port.nativeVlan = parseInt(input.split(/\s+/)[4], 10);
            events.push({ type: 'config-changed' });
        } else if (cmd === 'switchport port-security') {
            port.portSecurity = port.portSecurity || { enabled: true, maximum: 1, violation: 'shutdown', macs: [] };
            port.portSecurity.enabled = true;
            events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('switchport port-security maximum ')) {
            const n = parseInt(input.split(/\s+/)[4], 10);
            port.portSecurity = port.portSecurity || { enabled: true, maximum: 1, violation: 'shutdown', macs: [] };
            port.portSecurity.enabled = true; port.portSecurity.maximum = n;
            events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('switchport port-security violation ')) {
            const v = input.split(/\s+/)[4];
            port.portSecurity = port.portSecurity || { enabled: true, maximum: 1, violation: 'shutdown', macs: [] };
            port.portSecurity.enabled = true; port.portSecurity.violation = v;
            events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('switchport port-security mac-address sticky')) {
            port.portSecurity = port.portSecurity || { enabled: true, maximum: 1, violation: 'shutdown', macs: [], sticky: true };
            port.portSecurity.enabled = true; port.portSecurity.sticky = true;
            events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('switchport port-security mac-address ')) {
            const mac = input.split(/\s+/)[4];
            port.portSecurity = port.portSecurity || { enabled: true, maximum: 1, violation: 'shutdown', macs: [] };
            port.portSecurity.enabled = true; port.portSecurity.macs.push(mac);
            events.push({ type: 'config-changed' });
        } else if (cmd === 'no switchport port-security') {
            if (port.portSecurity) port.portSecurity.enabled = false;
            events.push({ type: 'config-changed' });
        } else if (cmd === '?' || cmd === 'help') {
            lines.push(...IOS_IFACE_HELP);
        } else {
            invalidInput(lines);
        }
    } else if (mode === 'line') {
        const which = ctx(dev).line || 'console';
        const lineCfg = dev.line[which] || { password: null, login: false };
        if (cmd === 'exit') {
            nextMode = 'config';
        } else if (cmd === 'end' || cmd === 'ctrl+z') {
            nextMode = 'priv';
        } else if (cmd.startsWith('password ')) {
            lineCfg.password = input.slice(9).trim();
            dev.line[which] = lineCfg;
            events.push({ type: 'config-changed' });
        } else if (cmd === 'login') {
            lineCfg.login = true; dev.line[which] = lineCfg;
            events.push({ type: 'config-changed' });
        } else if (cmd === 'no login') {
            lineCfg.login = false; dev.line[which] = lineCfg;
            events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('logging synchronous')) {
            // cosmetic
        } else {
            invalidInput(lines);
        }
    } else if (mode === 'router') {
        const which = ctx(dev).router || 'ospf';
        if (cmd === 'exit') {
            nextMode = 'config';
        } else if (cmd === 'end' || cmd === 'ctrl+z') {
            nextMode = 'priv';
        } else if (which === 'rip') {
            if (cmd.startsWith('version 2') || cmd === 'version 2') dev.rip.version = 2;
            else if (cmd === 'no auto-summary') dev.rip.autoSummary = false;
            else if (cmd.startsWith('network ')) {
                const net = input.split(/\s+/)[1];
                if (!E.isValidIp(net)) lines.push('% Invalid network');
                else { dev.rip.networks.push({ net, wildcard: classfulWildcard(net) }); events.push({ type: 'config-changed' }); }
            } else if (cmd.startsWith('no network ')) {
                const net = input.split(/\s+/)[2];
                dev.rip.networks = dev.rip.networks.filter((n) => n.net !== net);
                events.push({ type: 'config-changed' });
            } else if (cmd.startsWith('passive-interface ')) {
                dev.rip.passive = dev.rip.passive || [];
                dev.rip.passive.push(input.split(/\s+/)[1]);
                events.push({ type: 'config-changed' });
            } else invalidInput(lines);
        } else if (which === 'ospf') {
            if (cmd.startsWith('router-id ')) {
                const rid = input.split(/\s+/)[1];
                if (!E.isValidIp(rid)) lines.push('% Invalid router-id');
                else { dev.ospf.routerId = rid; events.push({ type: 'config-changed' }); }
            } else if (cmd.startsWith('network ')) {
                const m = input.match(/^network\s+(\S+)\s+(\S+)\s+area\s+(\d+)$/);
                if (!m || !E.isValidIp(m[1]) || !E.isValidWildcard(m[2])) lines.push('% Invalid OSPF network statement');
                else { dev.ospf.networks.push({ net: m[1], wildcard: m[2], area: m[3] }); events.push({ type: 'config-changed' }); }
            } else if (cmd.startsWith('no network ')) {
                const m = input.match(/^no network\s+(\S+)\s+(\S+)\s+area\s+(\d+)$/);
                dev.ospf.networks = dev.ospf.networks.filter((n) => !(m && n.net === m[1] && n.wildcard === m[2] && n.area === m[3]));
                events.push({ type: 'config-changed' });
            } else if (cmd.startsWith('passive-interface ')) {
                dev.ospf.passive = dev.ospf.passive || [];
                dev.ospf.passive.push(input.split(/\s+/)[1]);
                events.push({ type: 'config-changed' });
            } else invalidInput(lines);
        } else if (which === 'eigrp') {
            if (cmd.startsWith('eigrp router-id ')) {
                dev.eigrp.routerId = input.split(/\s+/)[2];
                events.push({ type: 'config-changed' });
            } else if (cmd.startsWith('network ')) {
                const m = input.match(/^network\s+(\S+)(?:\s+(\S+))?$/);
                if (!m || !E.isValidIp(m[1])) lines.push('% Invalid network');
                else {
                    dev.eigrp.networks.push({ net: m[1], wildcard: m[2] || classfulWildcard(m[1]) });
                    events.push({ type: 'config-changed' });
                }
            } else if (cmd.startsWith('no network ')) {
                const net = input.split(/\s+/)[2];
                dev.eigrp.networks = dev.eigrp.networks.filter((n) => n.net !== net);
                events.push({ type: 'config-changed' });
            } else if (cmd.startsWith('passive-interface ')) {
                dev.eigrp.passive = dev.eigrp.passive || [];
                dev.eigrp.passive.push(input.split(/\s+/)[1]);
                events.push({ type: 'config-changed' });
            } else invalidInput(lines);
        } else invalidInput(lines);
    } else if (mode === 'vlan') {
        const vlanId = ctx(dev).vlan;
        if (cmd === 'exit') {
            nextMode = 'config';
        } else if (cmd === 'end' || cmd === 'ctrl+z') {
            nextMode = 'priv';
        } else if (cmd.startsWith('name ')) {
            E.ensureVlan(dev, vlanId, input.slice(5).trim());
            events.push({ type: 'config-changed' });
        } else invalidInput(lines);
    }

    return { mode: nextMode, lines, events, prompt };
}

function classfulWildcard(net) {
    const first = parseInt(net.split('.')[0], 10);
    if (first < 128) return '0.255.255.255';
    if (first < 192) return '0.0.255.255';
    return '0.0.0.255';
}

function handleIpRoute(dev, input, parts, lines, events, isAdd) {
    // ip route NET MASK NEXT-HOP | ip route NET MASK INTERFACE
    const tokens = isAdd ? parts : parts.slice(1); // strip 'no'
    // tokens: [ip|no, route, net, mask, nh]
    const net = tokens[2], mask = tokens[3], nh = tokens[4];
    if (!net || !mask || !nh) {
        lines.push('Usage: ip route <network> <mask> <next-hop | interface>');
        return;
    }
    if (!E.isValidIp(net) || !E.isValidMask(mask)) {
        lines.push('% Invalid network or mask');
        return;
    }
    if (isAdd) {
        if (!E.isValidIp(nh) && !E.findPortByText(dev, nh)) {
            lines.push('% Invalid next-hop address');
            return;
        }
        const exit = E.isValidIp(nh) ? null : E.findPortByText(dev, nh).name;
        dev.staticRoutes = dev.staticRoutes || [];
        dev.staticRoutes.push({ net, mask, nextHop: exit ? null : nh, exit });
        lines.push(`Static route ${net}/${E.prefixLen(mask)} ${exit ? 'via ' + exit : 'via ' + nh} added.`);
        events.push({ type: 'config-changed' });
    } else {
        const before = dev.staticRoutes.length;
        dev.staticRoutes = dev.staticRoutes.filter((r) => !(r.net === net && r.mask === mask && (r.nextHop === nh || r.exit === nh)));
        lines.push(dev.staticRoutes.length < before ? 'Static route removed.' : '% Route not found.');
        events.push({ type: 'config-changed' });
    }
}

function executePc(state, dev, input, cmd, parts, lines, events, nextMode, prompt) {
    if (cmd === 'help' || cmd === '?') {
        lines.push(...PC_HELP);
    } else if (cmd === 'ipconfig' || cmd === 'ipconfig /all') {
        const eth = E.getPort(dev, 'eth0');
        lines.push('Windows IP Configuration');
        lines.push('');
        lines.push('Ethernet adapter Ethernet0:');
        lines.push('   Connection-specific DNS Suffix  . :');
        lines.push(`   IPv4 Address. . . . . . . . . . : ${eth?.ip || '0.0.0.0'}`);
        lines.push(`   Subnet Mask . . . . . . . . . . : ${eth?.mask || '0.0.0.0'}`);
        lines.push(`   Default Gateway . . . . . . . . : ${dev.gateway || ''}`);
        lines.push(`   Physical Address. . . . . . . . : ${(eth?.mac || '00-00-00-00-00-00').replace(/\./g, '-')}`);
        lines.push('   DHCP Enabled. . . . . . . . . . : No');
        if (eth?.ipv6) lines.push(`   IPv6 Address. . . . . . . . . . : ${eth.ipv6}`);
    } else if (cmd.startsWith('ping ')) {
        const ip = input.slice(5).trim();
        if (!E.isValidIp(ip) && !E.isValidIpv6(ip)) lines.push('Ping request could not find host. Please check the name and try again.');
        else {
            const { lines: pl, result } = winPing(state, dev, ip);
            lines.push(...pl);
            events.push({ type: 'ping', fromId: dev.id, result });
        }
    } else if (cmd.startsWith('tracert ')) {
        const ip = input.slice(8).trim();
        if (!E.isValidIp(ip)) lines.push('Unable to resolve target system name.');
        else {
            const result = E.ping(state, dev.id, ip);
            lines.push(`Tracing route to ${ip} over a maximum of 30 hops`);
            if (!result.ok) {
                lines.push(...result.log.slice(-3));
            } else {
                let i = 0;
                result.trace.request.forEach((id) => {
                    const d = E.getDevice(state, id);
                    i++;
                    if (d) lines.push(`  ${i}    <1 ms   <1 ms   <1 ms  ${d.hostname || d.name}`);
                });
                lines.push('Trace complete.');
            }
            events.push({ type: 'ping', fromId: dev.id, result });
        }
    } else if (cmd === 'arp -a' || cmd === 'arp') {
        lines.push('Interface: ' + (E.getPort(dev, 'eth0')?.ip || '0.0.0.0') + ' --- 0x1');
        lines.push('  Internet Address      Physical Address      Type');
        const entries = Object.entries(dev.arp);
        if (!entries.length) lines.push('  No ARP entries found.');
        for (const [ip, mac] of entries) {
            lines.push(`  ${ip.padEnd(22)} ${mac.replace(/\./g, '-')}     dynamic`);
        }
    } else if (cmd.startsWith('ip ')) {
        const m = input.match(/^ip\s+(\S+)\s+(\S+)$/i);
        if (!m) lines.push('Usage: ip <address> <mask>   (e.g. ip 192.168.1.10 255.255.255.0)');
        else if (!E.isValidIp(m[1]) || !E.isValidMask(m[2])) lines.push('Invalid IP address or subnet mask.');
        else {
            const eth = E.getPort(dev, 'eth0');
            eth.ip = m[1]; eth.mask = m[2]; eth.up = true;
            lines.push(`Ethernet0 configured: ${m[1]} ${m[2]}`);
            events.push({ type: 'config-changed' });
        }
    } else if (cmd.startsWith('ipv6 ')) {
        const m = input.match(/^ipv6\s+(\S+)$/i);
        if (!m || !E.isValidIpv6(m[1].split('/')[0])) lines.push('Usage: ipv6 <address>/<prefix>');
        else {
            const eth = E.getPort(dev, 'eth0');
            eth.ipv6 = m[1].split('/')[0]; eth.ipv6Prefix = parseInt(m[1].split('/')[1] || '64', 10);
            lines.push(`Ethernet0 IPv6 configured: ${m[1]}`);
            events.push({ type: 'config-changed' });
        }
    } else if (cmd.startsWith('gw ')) {
        const m = input.match(/^gw\s+(\S+)$/i);
        if (!m || !E.isValidIp(m[1])) lines.push('Usage: gw <address>   (e.g. gw 192.168.1.1)');
        else { dev.gateway = m[1]; lines.push(`Default gateway set to ${m[1]}`); events.push({ type: 'config-changed' }); }
    } else if (cmd === 'clear' || cmd === 'cls') {
        lines.push('\u0000CLEAR');
    } else {
        lines.push(`'${rawInput}' is not recognized as an internal or external command,`);
        lines.push('operable program or batch file.');
    }
    return { mode: nextMode, lines, events, prompt };
}

// Resolve interactive prompts (password / confirm / banner).
export function executePrompt(state, dev, mode, promptCtx, rawInput) {
    const input = String(rawInput || '');
    const lines = [];
    const events = [];
    let nextMode = mode;
    let prompt = null;

    if (!promptCtx) return { mode: nextMode, lines, events, prompt };

    if (promptCtx.kind === 'password') {
        if (promptCtx.target === 'enable') {
            const ok = dev.enableSecret
                ? (dev.enableSecret.type === '5' ? hash5(input) === dev.enableSecret.value : input === dev.enableSecret.value)
                : true;
            if (ok) {
                nextMode = 'priv';
                lines.push(`${dev.name}#`);
            } else {
                lines.push('% Bad secrets');
                lines.push(`${dev.name}>`);
            }
        } else if (promptCtx.target === 'console' || promptCtx.target === 'vty') {
            const lineCfg = dev.line[promptCtx.target] || {};
            if (lineCfg.password && input === lineCfg.password) {
                nextMode = 'user';
                lines.push(`${dev.name}>`);
            } else {
                lines.push('% Login invalid');
            }
        }
    } else if (promptCtx.kind === 'confirm') {
        const confirm = input.trim().toLowerCase();
        const yes = confirm === '' || confirm === 'y' || confirm === 'yes';
        if (promptCtx.action === 'reload') {
            if (!yes) {
                lines.push('% Reload cancelled');
            } else {
                E.reloadDevice(state, dev);
                lines.push('');
                lines.push('System Bootstrap, Version 15.2(4)M5, RELEASE SOFTWARE');
                lines.push(`Copyright (c) 1986-2026 by Practice Lab`);
                lines.push('');
                lines.push(`${dev.hostname || dev.name} con0 is now available`);
                lines.push(`${dev.hostname || dev.name}>`);
                nextMode = 'user';
                events.push({ type: 'reload', devId: dev.id });
            }
        } else if (promptCtx.action === 'erase') {
            if (!yes) {
                lines.push('% Erase cancelled');
            } else {
                E.eraseStartupConfig(dev);
                lines.push('Erasing the nvram filesystem will remove all configuration files! Continue? [confirm]');
                lines.push('Erase of nvram: complete');
                events.push({ type: 'config-changed' });
            }
        }
    } else if (promptCtx.kind === 'banner') {
        if (input.trim() === promptCtx.delimiter) {
            nextMode = 'config';
        } else {
            dev.banner = (dev.banner || '') + input + '\n';
            prompt = promptCtx; // keep collecting
        }
        events.push({ type: 'config-changed' });
    }

    return { mode: nextMode, lines, events, prompt };
}

function runShow(state, dev, cmd, isSwitch) {
    if (cmd.startsWith('show ip interface brief')) return showIpInterfaceBrief(state, dev);
    if (cmd.startsWith('show ipv6 interface brief')) return showIpv6InterfaceBrief(state, dev);
    if (cmd.startsWith('show ip route')) return showIpRoute(dev);
    if (cmd.startsWith('show ipv6 route')) return showIpv6Route(dev);
    if (cmd.startsWith('show running-config') || cmd === 'show run') return showRunningConfig(dev);
    if (cmd.startsWith('show startup-config') || cmd === 'show start') return showStartupConfig(dev);
    if (cmd.startsWith('show arp')) {
        const lines = [];
        lines.push('Protocol  Address          Age (min)  Hardware Addr   Type   Interface');
        for (const [ip, mac] of Object.entries(dev.arp)) {
            const route = E.longestMatch(dev, ip) || {};
            lines.push(`Internet  ${ip.padEnd(16)} -           ${mac}  ARPA   ${route.egress ? portLongName(route.egress) : '-'}`);
        }
        return lines;
    }
    if (cmd.startsWith('show mac address-table') || cmd.startsWith('show mac-address-table')) {
        if (isSwitch) return showMacTable(dev);
        return ['% Invalid input — this is a switch command'];
    }
    if (cmd.startsWith('show interfaces trunk')) {
        if (isSwitch) return showInterfacesTrunk(dev);
        return ['% Invalid input detected'];
    }
    if (cmd.startsWith('show interfaces status')) {
        const lines = [];
        lines.push('Port      Name               Status       Vlan       Duplex  Speed Type');
        for (const p of dev.ports) {
            if (p.kind !== 'ethernet') continue;
            const status = p.up ? 'connected' : 'notconnect';
            const vlan = p.mode === 'trunk' ? 'trunk' : String(p.accessVlan || 1);
            lines.push(`${portLongName(p.name).padEnd(9)} ${''.padEnd(18)}${status.padEnd(13)}${vlan.padEnd(10)} auto    auto   ${p.ip ? 'L3' : '10/100/1000BaseTX'}`);
        }
        return lines;
    }
    if (cmd.startsWith('show interfaces')) return showInterfaces(state, dev);
    if (cmd.startsWith('show vlan')) return showVlanBrief(dev);
    if (cmd.startsWith('show port-security')) return showPortSecurity(dev);
    if (cmd.startsWith('show cdp neighbors')) return showCdpNeighbors(state, dev);
    if (cmd.startsWith('show ip protocols')) return showIpProtocols(dev);
    if (cmd.startsWith('show ip ospf neighbor')) return showOspfNeighbor(state, dev);
    if (cmd.startsWith('show ip eigrp neighbors')) {
        const lines = [];
        lines.push('IP-EIGRP neighbors for process ' + (dev.eigrp ? dev.eigrp.asn : '?'));
        lines.push('H   Address                 Interface       Hold Uptime   SRTT   RTO  Q  Seq');
        const n = E.eigrpNeighbors(state, dev);
        n.forEach((nb, i) => lines.push(`${i}   ${(nb.address || '').padEnd(23)} ${portLongName(nb.interface).padEnd(15)} 12   00:00:10  1     200  0  1`));
        if (!n.length) lines.push('(no neighbors)');
        return lines;
    }
    if (cmd.startsWith('show version')) return showVersion(dev);
    if (cmd.startsWith('show controllers')) {
        const lines = [];
        for (const p of dev.ports) {
            if (p.kind !== 'serial') continue;
            lines.push(`Interface ${portLongName(p.name)}`);
            lines.push(`Hardware is ${p.clockRate ? 'DCE' : 'DTE'}`);
        }
        return lines;
    }
    return ['% Invalid input detected at ' + "'^'" + ' marker.'];
}

const IOS_HELP = [
    'Exec commands:',
    '  enable                 Enter privileged EXEC mode',
    '  configure terminal     Enter global configuration mode',
    '  ping IP                Test reachability',
    '  traceroute IP          Trace the route to a host',
    '  show ip interface brief', '  show ip route', '  show interfaces',
    '  show running-config', '  show startup-config', '  show version',
    '  show arp', '  show cdp neighbors', '  show ip protocols',
    '  show ip ospf neighbor', '  show vlan brief', '  show interfaces trunk',
    '  show mac address-table', '  show port-security',
    'Configuration commands (after "configure terminal"):',
    '  hostname NAME          Set the device hostname',
    '  enable secret PASS     Set the privileged EXEC password',
    '  banner motd #          Set a login banner',
    '  line console 0 / vty   Configure console/VTY lines',
    '  interface IFACE        Configure an interface',
    '  ip route NET MASK NH   Add a static route',
    '  router rip|ospf|eigrp  Configure a routing protocol',
    '  vlan ID                (switch) Create a VLAN',
];

const IOS_IFACE_HELP = [
    'Interface commands:',
    '  ip address IP MASK          Assign an IPv4 address',
    '  ipv6 address ADDR/PREFIX    Assign an IPv6 address',
    '  no shutdown / shutdown      Enable / disable the interface',
    '  description TEXT            Describe the interface',
    '  speed/duplex/bandwidth      Set interface attributes',
    '  encapsulation dot1q VLAN    (subinterface) 802.1Q tagging',
    '  clock rate RATE             (serial DCE)',
    '  switchport mode access|trunk',
    '  switchport access vlan ID',
    '  switchport trunk allowed vlan LIST',
    '  switchport port-security [maximum N | violation MODE]',
    '  exit / end',
];

const PC_HELP = [
    'Available commands:',
    '  ipconfig /all          Show IP configuration',
    '  ping IP                Test reachability',
    '  tracert IP             Trace the route to a host',
    '  arp -a                 Show the ARP cache',
    '  ip IP MASK             Set Ethernet0 IPv4 address',
    '  ipv6 ADDR/PREFIX       Set Ethernet0 IPv6 address',
    '  gw IP                  Set the default gateway',
    '  help                   Show this help',
];
