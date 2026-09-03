// pt-cli.js — pure command-line interpreter for the packet-tracer style lab.
// No DOM / Three.js dependencies. Operates on the pt-engine state so it can be
// unit-tested in Node. The UI layer calls `execute()` and renders the results.
//
// Supported modes:
//   router / switch : 'user' (R1>), 'priv' (R1#), 'config' (R1(config)#), 'iface' (R1(config-if)#)
//   pc / server     : 'pc' (C:\>)

import * as E from './pt-engine.js';

// ---------------------------------------------------------------------------
// Port naming helpers
// ---------------------------------------------------------------------------

export function portLongName(portName) {
    const n = String(portName).toLowerCase();
    if (n.startsWith('g')) return 'GigabitEthernet' + n.slice(1);
    if (n.startsWith('f')) return 'FastEthernet' + n.slice(1);
    if (n.startsWith('eth')) return 'Ethernet' + n.slice(3);
    return portName;
}

// A port has live protocol when it is admin-up and the attached link is up.
export function hasLiveLink(state, devId, portName) {
    const dev = E.getDevice(state, devId);
    if (!dev) return false;
    const port = E.getPort(dev, portName);
    if (!port || !port.up) return false;
    const link = E.linksOf(state, devId).find((l) => {
        const isA = l.a.devId === devId && E.normalizePort(l.a.port) === E.normalizePort(portName);
        const isB = l.b.devId === devId && E.normalizePort(l.b.port) === E.normalizePort(portName);
        return isA || isB;
    });
    return Boolean(link && E.linkUp(state, link));
}

// ---------------------------------------------------------------------------
// Cisco IOS output builders
// ---------------------------------------------------------------------------

function showIpInterfaceBrief(state, dev) {
    const lines = [];
    lines.push('Interface              IP-Address      OK? Method Status                Protocol');
    for (const p of dev.ports) {
        const long = portLongName(p.name).padEnd(20);
        const ip = (p.ip || 'unassigned').padEnd(15);
        const ok = 'YES'.padEnd(4);
        const method = p.ip ? 'manual' : 'unset';
        const methodS = method.padEnd(7);
        const status = p.up ? 'up' : 'administratively down';
        const statusS = status.padEnd(21);
        const proto = hasLiveLink(state, dev.id, p.name) ? 'up' : 'down';
        lines.push(`${long} ${ip} ${ok} ${methodS} ${statusS} ${proto}`);
    }
    return lines;
}

function showIpRoute(state, dev) {
    const lines = [];
    lines.push('Codes: C - connected, S - static');
    for (const r of E.routesOf(dev)) {
        if (r.type === 'C') {
            lines.push(`C    ${r.net}/${r.prefix} is directly connected, ${portLongName(r.egress)}`);
        } else if (r.type === 'S') {
            const via = r.nextHop ? ` via ${r.nextHop}` : '';
            const egress = r.egress ? `, ${portLongName(r.egress)}` : '';
            lines.push(`S    ${r.net}/${r.prefix} [1/0]${via}${egress}`);
        }
    }
    return lines;
}

function showRunningConfig(state, dev) {
    const lines = [];
    lines.push('!');
    lines.push(`hostname ${dev.hostname || dev.name}`);
    lines.push('!');
    for (const p of dev.ports) {
        lines.push(`interface ${portLongName(p.name)}`);
        if (p.ip) lines.push(` ip address ${p.ip} ${p.mask}`);
        if (p.up) lines.push(' no shutdown'); else lines.push(' shutdown');
        lines.push('!');
    }
    for (const r of dev.staticRoutes || []) {
        lines.push(`ip route ${r.net} ${r.mask} ${r.nextHop}`);
    }
    lines.push('!');
    lines.push('end');
    return lines;
}

function showArp(state, dev) {
    const lines = [];
    lines.push('Protocol  Address          Age (min)  Hardware Addr   Type   Interface');
    for (const [ip, mac] of Object.entries(dev.arp)) {
        const iface = (E.longestMatch(dev, ip) || {}).egress;
        const p = `${'Internet'}  ${ip.padEnd(16)} ${'-'.padEnd(10)} ${mac}  ARPA   ${portLongName(iface || '-')}`;
        lines.push(p);
    }
    return lines;
}

function showMacTable(dev) {
    const lines = [];
    lines.push('Vlan    Mac Address       Type        Ports');
    lines.push('----    -----------       --------    -----');
    const entries = Object.entries(dev.macTable || {});
    if (!entries.length) {
        lines.push('  (no dynamically learned MAC addresses)');
    }
    for (const [mac, port] of entries) {
        lines.push(`1       ${mac}    DYNAMIC     ${portLongName(port)}`);
    }
    return lines;
}

function showInterfaces(state, dev) {
    const lines = [];
    for (const p of dev.ports) {
        lines.push(`${portLongName(p.name)} is ${p.up ? 'up' : 'administratively down'}, line protocol is ${hasLiveLink(state, dev.id, p.name) ? 'up' : 'down'}`);
        if (p.ip) {
            lines.push(`  Internet address is ${p.ip}/${E.prefixLen(p.mask)}`);
            lines.push(`  Hardware address is ${p.mac}`);
        }
    }
    return lines;
}

function showVersion(dev) {
    return [
        'Cisco IOS Software, Practice Lab Simulator',
        `Device: ${dev.type} — ${dev.hostname || dev.name}`,
        'System image file is "flash:lab"',
        'Practice Lab — for CCNA 200-301 training only',
    ];
}

function showInterfacesStatus(dev) {
    const lines = [];
    lines.push('Port      Name               Status       Vlan       Duplex  Speed Type');
    for (const p of dev.ports) {
        const status = p.up ? 'connected' : 'notconnect';
        lines.push(`${portLongName(p.name).padEnd(9)} ${''.padEnd(18)}${status.padEnd(13)}1          auto    auto   ${p.ip ? 'L3' : 'L2'}`);
    }
    return lines;
}

// ---------------------------------------------------------------------------
// Help texts
// ---------------------------------------------------------------------------

const IOS_HELP = [
    'Available commands:',
    '  enable                 Enter privileged EXEC mode',
    '  configure terminal     Enter global configuration mode',
    '  hostname NAME          Set the device hostname (config mode)',
    '  interface IFACE        Configure an interface (config mode)',
    '  ip address IP MASK     Assign an IP address (config-if mode)',
    '  no shutdown            Bring an interface up (config-if mode)',
    '  shutdown               Administratively disable (config-if mode)',
    '  ip route NET MASK NH   Add a static route (config mode)',
    '  no ip route NET MASK   Remove a static route (config mode)',
    '  exit / end             Move up / jump to privileged mode',
    '  ping IP                Test reachability',
    '  show ip interface brief', '  show ip route', '  show interfaces',
    '  show running-config', '  show version', '  show arp',
    '  show mac address-table (switch)',
];

const IOS_IFACE_HELP = [
    'Interface commands:',
    '  ip address IP MASK     Assign an IP address',
    '  no shutdown            Enable the interface',
    '  shutdown               Disable the interface',
    '  exit                   Back to config mode',
];

const PC_HELP = [
    'Available commands:',
    '  ipconfig /all          Show IP configuration',
    '  ping IP                Test reachability',
    '  tracert IP             Trace the route to a host',
    '  arp -a                 Show the ARP cache',
    '  ip IP MASK             Lab helper: set Ethernet0 address',
    '  gw IP                  Lab helper: set the default gateway',
    '  help                   Show this help',
];

// ---------------------------------------------------------------------------
// Command execution
// ---------------------------------------------------------------------------

function pingDevice(state, dev, ip) {
    const result = E.ping(state, dev.id, ip);
    return { lines: result.log, result };
}

export function execute(state, dev, mode, rawInput) {
    const input = String(rawInput || '').trim();
    const lines = [];
    const events = [];
    let nextMode = mode;

    if (!input) {
        return { mode: nextMode, lines, events };
    }

    const cmd = input.toLowerCase();

    if (dev.type === 'pc' || dev.type === 'server') {
        // ----------------------------------------------------------- PC -----
        if (cmd === 'help' || cmd === '?' || cmd === 'help /all') {
            lines.push(...PC_HELP);
        } else if (cmd === 'ipconfig' || cmd === 'ipconfig /all') {
            const eth = E.getPort(dev, 'eth0');
            lines.push('Windows IP Configuration');
            lines.push('');
            lines.push('Ethernet adapter Ethernet0:');
            lines.push(`   Connection-specific DNS Suffix  . :`);
            lines.push(`   IPv4 Address. . . . . . . . . . : ${eth?.ip || '0.0.0.0'}`);
            lines.push(`   Subnet Mask . . . . . . . . . . : ${eth?.mask || '0.0.0.0'}`);
            lines.push(`   Default Gateway . . . . . . . . : ${dev.gateway || ''}`);
            lines.push(`   Physical Address. . . . . . . . : ${eth?.mac || '00-00-00-00-00-00'}`);
            lines.push(`   DHCP Enabled. . . . . . . . . . : No`);
        } else if (cmd === 'ipconfig') {
            const eth = E.getPort(dev, 'eth0');
            lines.push(`Ethernet adapter Ethernet0:  ${eth?.ip || '0.0.0.0'} / ${eth?.mask || '-'}  gw ${dev.gateway || '-'}`);
        } else if (cmd.startsWith('ping ')) {
            const ip = input.slice(5).trim();
            if (!E.isValidIp(ip)) {
                lines.push('Ping request could not find host. Please check the name and try again.');
            } else {
                const { lines: pl, result } = pingDevice(state, dev, ip);
                lines.push(`Pinging ${ip} with 32 bytes of data:`);
                lines.push(...pl);
                events.push({ type: 'ping', fromId: dev.id, result });
            }
        } else if (cmd.startsWith('tracert ')) {
            const ip = input.slice(8).trim();
            if (!E.isValidIp(ip)) {
                lines.push('Unable to resolve target system name.');
            } else {
                const result = E.ping(state, dev.id, ip);
                lines.push(`Tracing route to ${ip}`);
                if (!result.ok) {
                    lines.push(...result.log);
                } else {
                    const seen = [];
                    result.trace.request.forEach((id, i) => {
                        const d = E.getDevice(state, id);
                        if (d) lines.push(`  ${i + 1}    <1 ms   <1 ms   <1 ms  ${d.hostname || d.name}`);
                        seen.push(id);
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
                const dynamic = dev.gateway === ip ? 'dynamic' : 'dynamic';
                lines.push(`  ${ip.padEnd(22)} ${mac.replace(/\./g, '-')}     ${dynamic}`);
            }
        } else if (cmd.startsWith('ip ')) {
            const m = input.match(/^ip\s+(\S+)\s+(\S+)$/i);
            if (!m) {
                lines.push('Usage: ip <address> <mask>   (e.g. ip 192.168.1.10 255.255.255.0)');
            } else if (!E.isValidIp(m[1]) || !E.isValidMask(m[2])) {
                lines.push('Invalid IP address or subnet mask.');
            } else {
                const eth = E.getPort(dev, 'eth0');
                eth.ip = m[1]; eth.mask = m[2]; eth.up = true;
                lines.push(`Ethernet0 configured: ${m[1]} ${m[2]}`);
                events.push({ type: 'config-changed' });
            }
        } else if (cmd.startsWith('gw ')) {
            const m = input.match(/^gw\s+(\S+)$/i);
            if (!m) {
                lines.push('Usage: gw <address>   (e.g. gw 192.168.1.1)');
            } else if (!E.isValidIp(m[1])) {
                lines.push('Invalid IP address.');
            } else {
                dev.gateway = m[1];
                lines.push(`Default gateway set to ${m[1]}`);
                events.push({ type: 'config-changed' });
            }
        } else if (cmd === 'clear' || cmd === 'cls') {
            lines.push('\u0000CLEAR');
        } else {
            lines.push(`'${rawInput}' is not recognized as an internal or external command,`);
            lines.push('operable program or batch file.');
        }
        return { mode: nextMode, lines, events };
    }

    // -------------------------------------------------------- Cisco IOS ----
    const isSwitch = dev.type === 'switch';

    if (mode === 'user') {
        if (cmd === 'enable' || cmd === 'en') {
            nextMode = 'priv';
            lines.push(`${dev.name}#`);
        } else if (cmd === '?' || cmd === 'help') {
            lines.push(...IOS_HELP);
        } else if (cmd.startsWith('show ')) {
            lines.push(...runShow(state, dev, cmd, isSwitch));
        } else if (cmd.startsWith('ping ')) {
            const ip = input.slice(5).trim();
            if (!E.isValidIp(ip)) lines.push('% Unrecognized host or address, or protocol not running');
            else {
                const { lines: pl, result } = pingDevice(state, dev, ip);
                lines.push(...pl);
                events.push({ type: 'ping', fromId: dev.id, result });
            }
        } else {
            invalidInput(lines, input);
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
            if (!E.isValidIp(ip)) lines.push('% Unrecognized host or address, or protocol not running');
            else {
                const { lines: pl, result } = pingDevice(state, dev, ip);
                lines.push(...pl);
                events.push({ type: 'ping', fromId: dev.id, result });
            }
        } else if (cmd === 'write' || cmd === 'copy running-config startup-config' || cmd === 'wr') {
            lines.push('Building configuration...');
            lines.push('[OK]');
        } else if (cmd === 'reload') {
            lines.push('Reload is not available in the practice lab.');
        } else {
            invalidInput(lines, input);
        }
    } else if (mode === 'config') {
        if (cmd === 'exit') {
            nextMode = 'priv';
        } else if (cmd === 'end' || cmd === 'ctrl+z') {
            nextMode = 'priv';
        } else if (cmd.startsWith('hostname ')) {
            const name = input.slice(9).trim();
            if (!name || !/^[\w.-]+$/.test(name)) {
                lines.push('% Invalid hostname');
            } else {
                dev.hostname = name;
                dev.name = name;
                lines.push(`${dev.name}(config)#`);
                events.push({ type: 'config-changed' });
            }
        } else if (cmd.startsWith('interface ')) {
            const portArg = input.slice(10).trim();
            const port = E.findPortByText(dev, portArg) || E.getPort(dev, portArg);
            if (!port) {
                lines.push('% Invalid interface type and number');
            } else {
                enterInterfaceMode(state, dev, port.name);
                nextMode = 'iface';
                lines.push(`${dev.name}(config-if)#`);
            }
        } else if (cmd.startsWith('ip route ')) {
            const parts = input.split(/\s+/);
            // ip route NET MASK NEXTHOP
            if (parts.length === 5) {
                const [net, mask, nh] = parts.slice(2);
                if (!E.isValidIp(net) || !E.isValidMask(mask) || !E.isValidIp(nh)) {
                    lines.push('% Invalid static route');
                } else {
                    dev.staticRoutes = dev.staticRoutes || [];
                    dev.staticRoutes.push({ net, mask, nextHop: nh, exit: null });
                    lines.push(`Static route ${net}/${E.prefixLen(mask)} via ${nh} added.`);
                    events.push({ type: 'config-changed' });
                }
            } else {
                lines.push('Usage: ip route <network> <mask> <next-hop>');
            }
        } else if (cmd.startsWith('no ip route ')) {
            const parts = input.split(/\s+/);
            if (parts.length >= 6) {
                const [net, mask, nh] = parts.slice(3);
                const before = (dev.staticRoutes || []).length;
                dev.staticRoutes = (dev.staticRoutes || []).filter(
                    (r) => !(r.net === net && r.mask === mask && r.nextHop === nh),
                );
                lines.push(dev.staticRoutes.length < before ? 'Static route removed.' : '% Route not found.');
                events.push({ type: 'config-changed' });
            } else {
                lines.push('Usage: no ip route <network> <mask> <next-hop>');
            }
        } else if (cmd === 'no shutdown' || cmd === 'no shutdown' ) {
            lines.push('% Command only available in interface configuration mode');
        } else if (cmd === '?' || cmd === 'help') {
            lines.push(...IOS_HELP);
        } else {
            invalidInput(lines, input);
        }
    } else if (mode === 'iface') {
        if (cmd === 'exit') {
            nextMode = 'config';
        } else if (cmd === 'end' || cmd === 'ctrl+z') {
            nextMode = 'priv';
        } else if (cmd.startsWith('ip address ')) {
            const parts = input.split(/\s+/);
            if (parts.length === 4) {
                const [ip, mask] = parts.slice(2);
                if (!E.isValidIp(ip) || !E.isValidMask(mask)) {
                    lines.push('% Invalid IP address or subnet mask');
                } else {
                    const port = currentIfaceOf(state, dev, mode);
                    if (port) { port.ip = ip; port.mask = mask; }
                    lines.push(`${dev.name}(config-if)#`);
                    events.push({ type: 'config-changed' });
                }
            } else {
                lines.push('Usage: ip address <address> <mask>');
            }
        } else if (cmd === 'no shutdown' || cmd === 'no shut') {
            const port = currentIfaceOf(state, dev, mode);
            if (port) port.up = true;
            events.push({ type: 'config-changed' });
        } else if (cmd === 'shutdown') {
            const port = currentIfaceOf(state, dev, mode);
            if (port) port.up = false;
            events.push({ type: 'config-changed' });
        } else if (cmd === 'no ip address') {
            const port = currentIfaceOf(state, dev, mode);
            if (port) { port.ip = null; port.mask = null; }
            events.push({ type: 'config-changed' });
        } else if (cmd.startsWith('description ')) {
            const port = currentIfaceOf(state, dev, mode);
            if (port) port.desc = input.slice(12).trim();
        } else if (cmd === '?' || cmd === 'help') {
            lines.push(...IOS_IFACE_HELP);
        } else {
            invalidInput(lines, input);
        }
    }

    return { mode: nextMode, lines, events };
}

// Track the interface currently being configured. Stored on the device object
// by the UI (or here). We keep it on `dev.__currentIface` so mode transitions
// survive; the UI sets it when entering iface mode.
function currentIfaceOf(state, dev, mode) {
    const name = dev.__currentIface;
    return name ? E.getPort(dev, name) : null;
}

export function enterInterfaceMode(state, dev, portName) {
    dev.__currentIface = portName;
}

function runShow(state, dev, cmd, isSwitch) {
    if (cmd.startsWith('show ip interface brief')) {
        return showIpInterfaceBrief(state, dev);
    }
    if (cmd.startsWith('show ip route')) {
        return showIpRoute(state, dev);
    }
    if (cmd.startsWith('show running-config') || cmd === 'show run') {
        return showRunningConfig(state, dev);
    }
    if (cmd.startsWith('show arp')) {
        return showArp(state, dev);
    }
    if (cmd.startsWith('show mac address-table') || cmd.startsWith('show mac-address-table')) {
        if (isSwitch) return showMacTable(dev);
        return ['% Invalid input — this is a switch command'];
    }
    if (cmd.startsWith('show interfaces status')) {
        return showInterfacesStatus(dev);
    }
    if (cmd.startsWith('show interfaces')) {
        return showInterfaces(state, dev);
    }
    if (cmd.startsWith('show version')) {
        return showVersion(dev);
    }
    return ['% Invalid input detected at ' + "'^'" + ' marker.'];
}

function invalidInput(lines, input) {
    const caret = ' '.repeat(1) + '^';
    lines.push('% Invalid input detected at ' + "'^'" + ' marker.');
    lines.push(caret);
}
