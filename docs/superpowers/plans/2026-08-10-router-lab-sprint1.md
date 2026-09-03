# Router Lab Sprint 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone `/labs/router` page with a Cisco 2911 SVG front panel and a fully functional IOS CLI simulator driven by Alpine.js.

**Architecture:** A single Alpine.js component (`routerLab`) wraps the entire page — front panel SVG reads LED state reactively, CLI terminal dispatches commands that mutate the same state. All logic lives in `resources/js/router-sim.js`; Blade components are presentational only.

**Tech Stack:** Laravel routing, Blade components, Alpine.js, Tailwind CSS. No backend state — pure frontend simulation.

## Global Constraints
- Route: `GET /labs/router` named `labs.router`
- Alpine component name: `routerLab` registered via `Alpine.data('routerLab', routerLabData)`
- Interface keys exactly: `GigabitEthernet0/0`, `GigabitEthernet0/1`, `GigabitEthernet0/2`
- Front panel SVG `viewBox="0 0 900 120"`
- Dark palette: terminal bg `#0a0a0a`, prompt green `#22c55e`, error red `#ef4444`
- No backend changes — no migrations, no models, no DB

---

## File Map

| File | Action |
|------|--------|
| `routes/web.php` | Add `GET /labs/router` route |
| `app/Http/Controllers/LabController.php` | New — single `router()` method |
| `resources/views/labs/router.blade.php` | New — page with `x-data="routerLab"` wrapper |
| `resources/views/components/lab/router-panel.blade.php` | New — Cisco 2911 SVG front panel |
| `resources/views/components/lab/cli-terminal.blade.php` | New — terminal UI |
| `resources/js/router-sim.js` | New — complete Alpine data function |
| `resources/js/app.js` | Import router-sim.js, register Alpine.data |
| `resources/views/layouts/app.blade.php` | Add "Labs" nav section |

---

### Task 1: Route + Controller + Page Shell + Sidebar Nav

**Files:**
- Modify: `routes/web.php`
- Create: `app/Http/Controllers/LabController.php`
- Create: `resources/views/labs/router.blade.php`
- Modify: `resources/views/layouts/app.blade.php`

**Interfaces:**
- Produces: `GET /labs/router` returns HTTP 200 with `x-data="routerLab"` in body

- [ ] **Step 1: Add route to web.php**

Add after the existing `lessons.show` route:

```php
use App\Http\Controllers\LabController;

Route::get('/labs/router', [LabController::class, 'router'])->name('labs.router');
```

- [ ] **Step 2: Create LabController**

```php
<?php

namespace App\Http\Controllers;

use Illuminate\View\View;

class LabController extends Controller
{
    public function router(): View
    {
        return view('labs.router');
    }
}
```

- [ ] **Step 3: Create labs directory and router.blade.php**

```bash
mkdir -p resources/views/labs
```

```blade
{{-- resources/views/labs/router.blade.php --}}
@extends('layouts.app')

@section('title', 'Router Lab — Cisco 2911')

@section('content')
<div x-data="routerLab" class="flex flex-col" style="min-height: calc(100vh - 2rem)">
    <div class="mb-4">
        <h1 class="text-2xl font-bold text-slate-100">Router Lab</h1>
        <p class="mt-1 text-sm text-slate-400">Cisco 2911 ISR — IOS 15.2(4)M5</p>
    </div>

    <div class="flex flex-col flex-1 overflow-hidden rounded-xl border border-slate-800">
        <x-lab.router-panel />
        <x-lab.cli-terminal />
    </div>
</div>
@endsection
```

- [ ] **Step 4: Add Labs nav section to app.blade.php**

Find the closing `</nav>` tag in the sidebar and add before it:

```blade
                        <div class="mt-6 px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Labs
                        </div>
                        <ul class="mt-0.5 space-y-0.5">
                            <li>
                                <a href="{{ route('labs.router') }}"
                                   @class([
                                       'block rounded-md px-3 py-1.5 text-sm transition-colors',
                                       'bg-blue-600/20 text-blue-300' => request()->routeIs('labs.router'),
                                       'text-slate-400 hover:bg-slate-800 hover:text-slate-200' => !request()->routeIs('labs.router'),
                                   ])>
                                    🖥 Cisco 2911 Router
                                </a>
                            </li>
                        </ul>
```

- [ ] **Step 5: Create placeholder Blade components so page renders**

```bash
mkdir -p resources/views/components/lab
```

Create `resources/views/components/lab/router-panel.blade.php`:
```blade
<div class="border-b border-slate-800 bg-slate-900 p-4 text-slate-400 text-sm">Router panel (coming in Task 3)</div>
```

Create `resources/views/components/lab/cli-terminal.blade.php`:
```blade
<div class="flex-1 bg-black p-4 text-green-400 font-mono text-sm">CLI terminal (coming in Task 4)</div>
```

- [ ] **Step 6: Verify page loads**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/labs/router
```
Expected: `200`

```bash
curl -s http://localhost:8000/labs/router | grep -c "Router Lab"
```
Expected: `1`

---

### Task 2: router-sim.js — Complete Alpine State Machine

**Files:**
- Create: `resources/js/router-sim.js`
- Modify: `resources/js/app.js`

**Interfaces:**
- Produces: `Alpine.data('routerLab')` with: `hostname`, `mode`, `interfaces`, `routes`, `output`, `currentInput`, `showTooltip`, `prompt` (getter), `handleKeydown()`, `submitCommand()`, `focusInput()`, `toggleTooltip()`

- [ ] **Step 1: Create resources/js/router-sim.js**

```js
export default function routerLabData() {
    return {
        hostname: 'Router',
        mode: 'user',
        currentIface: null,
        enableSecret: '',
        awaitingPassword: false,
        startupConfig: null,
        interfaces: {
            'GigabitEthernet0/0': { ip: '', mask: '', description: '', adminState: 'down', lineProtocol: 'down', clockRate: null, duplex: 'auto', speed: 'auto' },
            'GigabitEthernet0/1': { ip: '', mask: '', description: '', adminState: 'down', lineProtocol: 'down', clockRate: null, duplex: 'auto', speed: 'auto' },
            'GigabitEthernet0/2': { ip: '', mask: '', description: '', adminState: 'down', lineProtocol: 'down', clockRate: null, duplex: 'auto', speed: 'auto' },
        },
        routes: [],
        motd: '',
        history: [],
        historyIndex: -1,
        output: [],
        currentInput: '',
        showTooltip: null,

        get prompt() {
            switch (this.mode) {
                case 'user':      return `${this.hostname}>`;
                case 'privileged': return `${this.hostname}#`;
                case 'global':    return `${this.hostname}(config)#`;
                case 'interface': return `${this.hostname}(config-if)#`;
                default:          return `${this.hostname}>`;
            }
        },

        init() {
            this.print('Cisco IOS Software, Version 15.2(4)M5, RELEASE SOFTWARE (fc2)', 'text-slate-500');
            this.print('Technical Support: http://www.cisco.com/techsupport', 'text-slate-500');
            this.print('Copyright (c) 1986-2014 by Cisco Systems, Inc.', 'text-slate-500');
            this.print('');
            this.print('cisco CISCO2911/K9 (revision 1.0) with 483328K/40960K bytes of memory.', 'text-slate-500');
            this.print('Processor board ID FTX15248720', 'text-slate-500');
            this.print('');
            if (this.motd) this.print(this.motd, 'text-slate-300');
            this.$nextTick(() => { if (this.$refs.input) this.$refs.input.focus(); });
        },

        focusInput() {
            if (this.$refs.input) this.$refs.input.focus();
        },

        handleKeydown(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.submitCommand();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.historyIndex < this.history.length - 1) {
                    this.historyIndex++;
                    this.currentInput = this.history[this.history.length - 1 - this.historyIndex] ?? '';
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    this.currentInput = this.history[this.history.length - 1 - this.historyIndex] ?? '';
                } else {
                    this.historyIndex = -1;
                    this.currentInput = '';
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.tabComplete();
            } else if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                this.print(`${this.prompt}${this.currentInput}`, 'text-green-400');
                this.currentInput = '';
                if (this.mode === 'global' || this.mode === 'interface') {
                    this.mode = 'privileged';
                    this.currentIface = null;
                }
                this.scrollBottom();
            }
        },

        submitCommand() {
            const raw = this.currentInput.trim();
            this.print(`${this.prompt}${this.awaitingPassword ? '' : raw}`, 'text-green-400');

            if (this.awaitingPassword) {
                this.awaitingPassword = false;
                if (raw === this.enableSecret) {
                    this.mode = 'privileged';
                } else {
                    this.print('% Access denied', 'text-red-400');
                }
                this.currentInput = '';
                this.scrollBottom();
                return;
            }

            if (raw) {
                this.history.push(raw);
                if (this.history.length > 20) this.history.shift();
            }
            this.historyIndex = -1;
            this.currentInput = '';

            if (!raw) { this.scrollBottom(); return; }

            if (raw.trim() === '?') { this.cmdHelp(); this.scrollBottom(); return; }

            this.dispatch(raw.toLowerCase());
            this.scrollBottom();
        },

        dispatch(raw) {
            const parts = raw.trim().split(/\s+/);
            const first = parts[0];
            const rest = parts.slice(1);

            if (first === 'no') { this.dispatchNo(rest); return; }

            const validList = this.getValidCommandList();
            const expanded = this.expandCmd(first, validList);
            if (!expanded) { this.printError('% Unknown command or computer name, or unable to find computer address'); return; }

            switch (this.mode) {
                case 'user':      this.dispatchUser(expanded, rest); break;
                case 'privileged': this.dispatchPrivileged(expanded, rest); break;
                case 'global':    this.dispatchGlobal(expanded, rest); break;
                case 'interface': this.dispatchIface(expanded, rest); break;
            }
        },

        expandCmd(input, list) {
            const matches = list.filter(c => c.startsWith(input));
            if (matches.length === 1) return matches[0];
            if (matches.includes(input)) return input;
            if (matches.length > 1) { this.print(`% Ambiguous command: "${input}"`, 'text-red-400'); return null; }
            return null;
        },

        getValidCommandList() {
            switch (this.mode) {
                case 'user':      return ['enable', 'show', 'ping', 'logout', 'exit'];
                case 'privileged': return ['disable', 'configure', 'show', 'copy', 'write', 'ping', 'reload', 'logout', 'exit'];
                case 'global':    return ['hostname', 'interface', 'ip', 'enable', 'banner', 'no', 'exit', 'end'];
                case 'interface': return ['ip', 'no', 'shutdown', 'description', 'clock', 'duplex', 'speed', 'exit', 'end'];
                default: return [];
            }
        },

        dispatchNo(args) {
            if (!args.length) { this.print('% Incomplete command.', 'text-red-400'); return; }
            const sub = args[0]; const rest = args.slice(1);
            if (this.mode === 'interface') {
                if (sub === 'ip' && rest[0] === 'address') {
                    this.interfaces[this.currentIface].ip = '';
                    this.interfaces[this.currentIface].mask = '';
                } else if (sub === 'shutdown') {
                    this.cmdNoShutdown();
                } else if (sub === 'description') {
                    this.interfaces[this.currentIface].description = '';
                } else { this.printError('% Unknown command or computer name, or unable to find computer address'); }
            } else if (this.mode === 'global') {
                if (sub === 'ip' && rest[0] === 'route') { this.cmdNoIpRoute(rest.slice(1)); }
                else if (sub === 'hostname') { this.hostname = 'Router'; }
                else if (sub === 'banner') { this.motd = ''; }
                else { this.printError('% Unknown command or computer name, or unable to find computer address'); }
            } else { this.printError('% Unknown command or computer name, or unable to find computer address'); }
        },

        dispatchUser(cmd, args) {
            if (cmd === 'enable') { this.cmdEnable(); }
            else if (cmd === 'show') { this.dispatchShow(args); }
            else if (cmd === 'ping') { this.cmdPing(args); }
            else if (cmd === 'logout' || cmd === 'exit') { this.print('Connection closed by foreign host.', 'text-slate-400'); }
            else { this.printError('% Unknown command or computer name, or unable to find computer address'); }
        },

        dispatchPrivileged(cmd, args) {
            if (cmd === 'disable') { this.mode = 'user'; }
            else if (cmd === 'configure') { this.cmdConfigureTerminal(); }
            else if (cmd === 'show') { this.dispatchShow(args); }
            else if (cmd === 'copy') { this.cmdCopyRunStart(); }
            else if (cmd === 'write') { this.cmdCopyRunStart(); }
            else if (cmd === 'ping') { this.cmdPing(args); }
            else if (cmd === 'reload') { this.cmdReload(); }
            else if (cmd === 'logout' || cmd === 'exit') { this.print('Connection closed by foreign host.', 'text-slate-400'); }
            else { this.printError('% Unknown command or computer name, or unable to find computer address'); }
        },

        dispatchGlobal(cmd, args) {
            if (cmd === 'hostname') { this.cmdHostname(args); }
            else if (cmd === 'interface') { this.cmdInterface(args); }
            else if (cmd === 'ip') { if (args[0] === 'route') { this.cmdIpRoute(args.slice(1)); } else { this.printError('% Incomplete command.'); } }
            else if (cmd === 'enable') { if (args[0] === 'secret' && args[1]) { this.enableSecret = args.slice(1).join(' '); } else { this.print('% Incomplete command.', 'text-red-400'); } }
            else if (cmd === 'banner') { this.cmdBanner(args); }
            else if (cmd === 'exit') { this.mode = 'privileged'; }
            else if (cmd === 'end') { this.mode = 'privileged'; }
            else { this.printError('% Unknown command or computer name, or unable to find computer address'); }
        },

        dispatchIface(cmd, args) {
            if (cmd === 'ip') { if (args[0] === 'address' && args.length >= 3) { this.interfaces[this.currentIface].ip = args[1]; this.interfaces[this.currentIface].mask = args[2]; } else { this.print('% Incomplete command.', 'text-red-400'); } }
            else if (cmd === 'shutdown') { this.cmdShutdown(); }
            else if (cmd === 'description') { if (args.length) { this.interfaces[this.currentIface].description = args.join(' '); } else { this.print('% Incomplete command.', 'text-red-400'); } }
            else if (cmd === 'clock') { if (args[0] === 'rate' && args[1]) { this.interfaces[this.currentIface].clockRate = parseInt(args[1]); } }
            else if (cmd === 'duplex') { if (['auto','full','half'].includes(args[0])) { this.interfaces[this.currentIface].duplex = args[0]; } else { this.print('% Invalid input detected.', 'text-red-400'); } }
            else if (cmd === 'speed') { if (['10','100','1000','auto'].includes(args[0])) { this.interfaces[this.currentIface].speed = args[0]; } else { this.print('% Invalid input detected.', 'text-red-400'); } }
            else if (cmd === 'exit') { this.mode = 'global'; this.currentIface = null; }
            else if (cmd === 'end') { this.mode = 'privileged'; this.currentIface = null; }
            else { this.printError('% Unknown command or computer name, or unable to find computer address'); }
        },

        dispatchShow(args) {
            if (!args.length) { this.print('% Incomplete command.', 'text-red-400'); return; }
            const sub = args[0]; const rest = args.slice(1);
            if (sub.startsWith('ver')) { this.cmdShowVersion(); }
            else if (sub.startsWith('run')) { this.cmdShowRunningConfig(); }
            else if (sub.startsWith('start')) { this.cmdShowStartupConfig(); }
            else if (sub.startsWith('ip') && rest[0]?.startsWith('int')) { this.cmdShowIpInterfaceBrief(); }
            else if (sub.startsWith('ip') && rest[0]?.startsWith('ro')) { this.cmdShowIpRoute(); }
            else if (sub.startsWith('int') && rest[0]?.startsWith('ip')) { this.cmdShowIpInterfaceBrief(); }
            else if (sub.startsWith('int')) { this.cmdShowInterfaces(rest); }
            else { this.printError('% Unknown command or computer name, or unable to find computer address'); }
        },

        // ── Command implementations ─────────────────────────────────────

        cmdEnable() {
            if (this.enableSecret) { this.print('Password: ', 'text-slate-300'); this.awaitingPassword = true; }
            else { this.mode = 'privileged'; }
        },

        cmdConfigureTerminal() {
            this.mode = 'global';
            this.print('Enter configuration commands, one per line.  End with CNTL/Z.', 'text-slate-500');
        },

        cmdHostname(args) {
            if (!args.length) { this.print('% Incomplete command.', 'text-red-400'); return; }
            this.hostname = args[0];
        },

        cmdInterface(args) {
            if (!args.length) { this.print('% Incomplete command.', 'text-red-400'); return; }
            const name = this.resolveInterface(args.join(' '));
            if (!name) { this.print('% Invalid input detected at \'^\' marker.', 'text-red-400'); return; }
            this.currentIface = name;
            this.mode = 'interface';
        },

        cmdBanner(args) {
            if (args[0] !== 'motd' || args.length < 2) { this.print('% Incomplete command.', 'text-red-400'); return; }
            const raw = args.slice(1).join(' ');
            const delim = raw[0];
            const end = raw.lastIndexOf(delim, raw.length - 1);
            this.motd = end > 0 ? raw.slice(1, end).trim() : raw.slice(1).trim();
        },

        cmdIpRoute(args) {
            if (args.length < 3) { this.print('% Incomplete command.', 'text-red-400'); return; }
            this.routes.push({ network: args[0], mask: args[1], nexthop: args[2], ad: 1 });
        },

        cmdNoIpRoute(args) {
            if (args.length < 3) { this.print('% Incomplete command.', 'text-red-400'); return; }
            this.routes = this.routes.filter(r => !(r.network === args[0] && r.mask === args[1] && r.nexthop === args[2]));
        },

        cmdNoShutdown() {
            const iface = this.interfaces[this.currentIface];
            iface.adminState = 'up';
            iface.lineProtocol = 'up';
            this.print(`%LINK-3-UPDOWN: Interface ${this.currentIface}, changed state to up`, 'text-slate-500');
            this.print(`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${this.currentIface}, changed state to up`, 'text-slate-500');
        },

        cmdShutdown() {
            const iface = this.interfaces[this.currentIface];
            iface.adminState = 'down';
            iface.lineProtocol = 'down';
            this.print(`%LINK-5-CHANGED: Interface ${this.currentIface}, changed state to administratively down`, 'text-slate-500');
            this.print(`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${this.currentIface}, changed state to down`, 'text-slate-500');
        },

        cmdCopyRunStart() {
            this.startupConfig = JSON.parse(JSON.stringify({ hostname: this.hostname, interfaces: this.interfaces, routes: this.routes, motd: this.motd, enableSecret: this.enableSecret }));
            this.print('Destination filename [startup-config]? ', 'text-slate-500');
            this.print('Building configuration...', 'text-slate-500');
            this.print('[OK]', 'text-green-400');
        },

        cmdReload() {
            this.print('Proceed with reload? [confirm]', 'text-slate-500');
            setTimeout(() => {
                this.output = [];
                this.hostname = 'Router';
                this.mode = 'user';
                this.currentIface = null;
                this.enableSecret = '';
                this.awaitingPassword = false;
                this.startupConfig = null;
                this.interfaces = {
                    'GigabitEthernet0/0': { ip: '', mask: '', description: '', adminState: 'down', lineProtocol: 'down', clockRate: null, duplex: 'auto', speed: 'auto' },
                    'GigabitEthernet0/1': { ip: '', mask: '', description: '', adminState: 'down', lineProtocol: 'down', clockRate: null, duplex: 'auto', speed: 'auto' },
                    'GigabitEthernet0/2': { ip: '', mask: '', description: '', adminState: 'down', lineProtocol: 'down', clockRate: null, duplex: 'auto', speed: 'auto' },
                };
                this.routes = [];
                this.motd = '';
                this.history = [];
                this.historyIndex = -1;
                this.currentInput = '';
                this.init();
            }, 1000);
        },

        cmdPing(args) {
            if (!args.length) { this.print('% Incomplete command.', 'text-red-400'); return; }
            const target = args[0];
            this.print(`Type escape sequence to abort.`, 'text-slate-500');
            this.print(`Sending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:`, 'text-slate-500');
            let reachable = target === '127.0.0.1';
            if (!reachable) {
                for (const iface of Object.values(this.interfaces)) {
                    if (iface.ip && iface.mask && iface.adminState === 'up' && this.isInSubnet(target, iface.ip, iface.mask)) { reachable = true; break; }
                }
            }
            if (!reachable) reachable = this.routes.some(r => r.nexthop === target);
            this.print(reachable ? '!!!!!' : '.....', reachable ? 'text-green-400' : 'text-red-400');
            this.print(`Success rate is ${reachable ? 100 : 0} percent (${reachable ? '5/5' : '0/5'}), round-trip min/avg/max = 1/2/4 ms`, 'text-slate-500');
        },

        cmdShowVersion() {
            [
                'Cisco IOS Software, Version 15.2(4)M5, RELEASE SOFTWARE (fc2)',
                'Technical Support: http://www.cisco.com/techsupport',
                'Copyright (c) 1986-2014 by Cisco Systems, Inc.',
                '',
                'ROM: System Bootstrap, Version 15.0(1r)M15, RELEASE SOFTWARE (fc1)',
                '',
                `${this.hostname} uptime is 0 minutes`,
                'System returned to ROM by power-on',
                'System image file is "flash0:c2900-universalk9-mz.SPA.152-4.M5.bin"',
                '',
                'cisco CISCO2911/K9 (revision 1.0) with 483328K/40960K bytes of memory.',
                'Processor board ID FTX15248720',
                '3 Gigabit Ethernet interfaces',
                '1 terminal line',
                'DRAM configuration is 64 bits wide with parity enabled.',
                '255K bytes of non-volatile configuration memory.',
                '256000K bytes of ATA System CompactFlash 0 (Read/Write)',
                '',
                'Configuration register is 0x2102',
            ].forEach(l => this.print(l, 'text-slate-300'));
        },

        cmdShowIpInterfaceBrief() {
            this.print('Interface              IP-Address      OK? Method Status                Protocol', 'text-slate-300');
            for (const [name, iface] of Object.entries(this.interfaces)) {
                const ip     = iface.ip || 'unassigned';
                const method = iface.ip ? 'manual ' : 'unset  ';
                const status = iface.adminState === 'up' ? 'up                    ' : 'administratively down ';
                const proto  = iface.lineProtocol === 'up' ? 'up' : 'down';
                this.print(`${name.padEnd(23)}${ip.padEnd(16)}YES ${method}${status}${proto}`, 'text-slate-300');
            }
        },

        cmdShowInterfaces(args) {
            const filter = args.length ? this.resolveInterface(args.join(' ')) : null;
            const entries = filter ? [[filter, this.interfaces[filter]]] : Object.entries(this.interfaces);
            for (const [name, iface] of entries) {
                if (!iface) { this.printError('% Invalid interface'); continue; }
                const updown = iface.adminState === 'up' ? 'up' : 'administratively down';
                const proto  = iface.lineProtocol === 'up' ? 'up' : 'down';
                this.print(`${name} is ${updown}, line protocol is ${proto}`, 'text-slate-300');
                this.print('  Hardware is CN Gigabit Ethernet', 'text-slate-400');
                if (iface.description) this.print(`  Description: ${iface.description}`, 'text-slate-400');
                if (iface.ip) { this.print(`  Internet address is ${iface.ip}/${this.maskToCidr(iface.mask)}`, 'text-slate-400'); }
                else { this.print('  Internet address is not set', 'text-slate-400'); }
                this.print('  MTU 1500 bytes, BW 1000000 Kbit/sec, DLY 10 usec', 'text-slate-400');
                this.print(`  Duplex: ${iface.duplex}, Speed: ${iface.speed}`, 'text-slate-400');
                this.print('', 'text-slate-400');
            }
        },

        cmdShowIpRoute() {
            this.print('Codes: L - local, C - connected, S - static', 'text-slate-500');
            this.print('');
            this.print('Gateway of last resort is not set', 'text-slate-300');
            this.print('');
            let any = false;
            for (const [name, iface] of Object.entries(this.interfaces)) {
                if (iface.ip && iface.adminState === 'up') {
                    const cidr = this.maskToCidr(iface.mask);
                    const net = iface.ip.split('.').slice(0,3).join('.') + '.0';
                    this.print(`C    ${net}/${cidr} is directly connected, ${name}`, 'text-slate-300');
                    this.print(`L    ${iface.ip}/32 is directly connected, ${name}`, 'text-slate-300');
                    any = true;
                }
            }
            for (const r of this.routes) {
                this.print(`S    ${r.network}/${this.maskToCidr(r.mask)} [${r.ad}/0] via ${r.nexthop}`, 'text-slate-300');
                any = true;
            }
            if (!any) this.print('% No routes found', 'text-slate-500');
        },

        cmdShowRunningConfig() {
            this.print('Building configuration...', 'text-slate-500');
            this.print('');
            this.print('Current configuration:', 'text-slate-300');
            this.print('!');
            this.print('version 15.2', 'text-slate-400');
            this.print('!');
            this.print(`hostname ${this.hostname}`, 'text-slate-200');
            this.print('!');
            if (this.enableSecret) { this.print(`enable secret 5 ${this.enableSecret}`, 'text-slate-200'); this.print('!'); }
            if (this.motd) { this.print(`banner motd ^C${this.motd}^C`, 'text-slate-200'); this.print('!'); }
            for (const [name, iface] of Object.entries(this.interfaces)) {
                this.print(`interface ${name}`, 'text-slate-200');
                if (iface.description) this.print(` description ${iface.description}`, 'text-slate-400');
                this.print(iface.ip ? ` ip address ${iface.ip} ${iface.mask}` : ' no ip address', 'text-slate-400');
                if (iface.duplex !== 'auto') this.print(` duplex ${iface.duplex}`, 'text-slate-400');
                if (iface.speed !== 'auto') this.print(` speed ${iface.speed}`, 'text-slate-400');
                if (iface.clockRate) this.print(` clock rate ${iface.clockRate}`, 'text-slate-400');
                if (iface.adminState === 'down') this.print(' shutdown', 'text-slate-400');
                this.print('!');
            }
            for (const r of this.routes) this.print(`ip route ${r.network} ${r.mask} ${r.nexthop}`, 'text-slate-200');
            if (this.routes.length) this.print('!');
            this.print('end', 'text-slate-200');
            this.print('');
        },

        cmdShowStartupConfig() {
            if (!this.startupConfig) { this.print('startup-config is not present', 'text-slate-400'); return; }
            const sc = this.startupConfig;
            this.print(`hostname ${sc.hostname}`, 'text-slate-300');
            for (const [name, iface] of Object.entries(sc.interfaces)) {
                this.print(`interface ${name}`, 'text-slate-300');
                this.print(iface.ip ? ` ip address ${iface.ip} ${iface.mask}` : ' no ip address', 'text-slate-400');
                if (iface.adminState === 'down') this.print(' shutdown', 'text-slate-400');
                this.print('!');
            }
            this.print('end', 'text-slate-300');
        },

        cmdHelp() {
            const map = {
                user:      [['enable','Turn on privileged commands'],['ping','Send echo messages'],['show','Show running system information'],['logout','Exit from the EXEC']],
                privileged:[['configure','Enter configuration mode'],['copy','Copy from one file to another'],['disable','Turn off privileged commands'],['ping','Send echo messages'],['reload','Halt and perform a cold restart'],['show','Show running system information'],['write','Write running configuration to memory']],
                global:    [['banner','Define a login banner'],['enable','Modify enable password parameters'],['end','Exit to privileged EXEC mode'],['exit','Exit from configure mode'],['hostname',"Set system's network name"],['interface','Select an interface to configure'],['ip','Global IP configuration subcommands'],['no','Negate a command or set its defaults']],
                interface: [['clock','Configure time-of-day clock'],['description','Interface specific description'],['duplex','Configure duplex operation'],['end','Exit to privileged EXEC mode'],['exit','Exit from interface configuration mode'],['ip','Interface Internet Protocol config commands'],['no','Negate a command or set its defaults'],['shutdown','Shutdown the selected interface'],['speed','Configure speed operation']],
            };
            this.print('');
            (map[this.mode] || []).forEach(([cmd, desc]) => this.print(`  ${cmd.padEnd(20)}${desc}`, 'text-slate-300'));
            this.print('');
        },

        tabComplete() {
            const parts = this.currentInput.trim().split(/\s+/);
            const prefix = (parts[parts.length - 1] || '').toLowerCase();
            const matches = this.getValidCommandList().filter(c => c.startsWith(prefix));
            if (matches.length === 1) { parts[parts.length - 1] = matches[0]; this.currentInput = parts.join(' ') + ' '; }
            else if (matches.length > 1) { this.print(matches.join('  '), 'text-slate-400'); }
        },

        toggleTooltip(ifaceName) {
            this.showTooltip = this.showTooltip === ifaceName ? null : ifaceName;
        },

        // ── Utilities ────────────────────────────────────────────────────

        resolveInterface(input) {
            const n = input.toLowerCase().replace(/\s+/g, '');
            if (/^g(i|ig|igabitethernet)?0\/0$/.test(n)) return 'GigabitEthernet0/0';
            if (/^g(i|ig|igabitethernet)?0\/1$/.test(n)) return 'GigabitEthernet0/1';
            if (/^g(i|ig|igabitethernet)?0\/2$/.test(n)) return 'GigabitEthernet0/2';
            return null;
        },

        maskToCidr(mask) {
            if (!mask) return 0;
            return mask.split('.').reduce((a, o) => a + parseInt(o).toString(2).split('').filter(b => b === '1').length, 0);
        },

        isInSubnet(target, ifaceIp, mask) {
            const toNum = ip => ip.split('.').reduce((a, o) => ((a << 8) | parseInt(o)) >>> 0, 0);
            const m = toNum(mask);
            return (toNum(target) & m) === (toNum(ifaceIp) & m);
        },

        print(text, cls = 'text-slate-200') {
            this.output.push({ text: text === '' ? ' ' : text, cls });
        },

        printError(text) { this.print(text, 'text-red-400'); },

        scrollBottom() {
            this.$nextTick(() => { const el = this.$refs.terminal; if (el) el.scrollTop = el.scrollHeight; });
        },
    };
}
```

- [ ] **Step 2: Register in app.js**

Add to `resources/js/app.js` after the existing Alpine.data calls, before `Alpine.start()`:

```js
import routerLabData from './router-sim.js';
Alpine.data('routerLab', routerLabData);
```

- [ ] **Step 3: Build assets**

```bash
npm run build 2>&1 | tail -5
```
Expected: `✓ built in` with no errors.

---

### Task 3: Cisco 2911 SVG Front Panel Component

**Files:**
- Modify: `resources/views/components/lab/router-panel.blade.php`

**Interfaces:**
- Consumes: Alpine state `interfaces['GigabitEthernet0/0|1|2'].adminState`, `showTooltip`, `toggleTooltip()`
- Produces: SVG panel with live LED colors, clickable port tooltips

- [ ] **Step 1: Replace router-panel.blade.php**

```blade
@php
    $ports = [
        ['key' => 'GigabitEthernet0/0', 'short' => 'G0/0', 'x' => 215],
        ['key' => 'GigabitEthernet0/1', 'short' => 'G0/1', 'x' => 310],
        ['key' => 'GigabitEthernet0/2', 'short' => 'G0/2', 'x' => 405],
    ];
@endphp

<div class="relative select-none" @click.away="showTooltip = null">
    <svg viewBox="0 0 900 120" class="w-full h-auto" style="max-height:150px; background:#111111;">

        {{-- Chassis body --}}
        <rect x="0" y="0" width="900" height="120" fill="#1c1c1c"/>
        {{-- Top bezel --}}
        <rect x="0" y="0" width="900" height="7" fill="#252525"/>
        {{-- Bottom bezel --}}
        <rect x="0" y="113" width="900" height="7" fill="#111111"/>
        {{-- Left rack ear --}}
        <rect x="0" y="0" width="14" height="120" fill="#242424" rx="2"/>
        <circle cx="7" cy="28" r="4" fill="#111" stroke="#333" stroke-width="0.5"/>
        <circle cx="7" cy="92" r="4" fill="#111" stroke="#333" stroke-width="0.5"/>
        {{-- Right rack ear --}}
        <rect x="886" y="0" width="14" height="120" fill="#242424" rx="2"/>
        <circle cx="893" cy="28" r="4" fill="#111" stroke="#333" stroke-width="0.5"/>
        <circle cx="893" cy="92" r="4" fill="#111" stroke="#333" stroke-width="0.5"/>

        {{-- System LEDs --}}
        <text x="22" y="26" font-size="7" fill="#4b5563" font-family="monospace" text-anchor="middle">PWR</text>
        <circle cx="22" cy="38" r="5" fill="#22c55e"/>
        <circle cx="22" cy="38" r="8" fill="#22c55e" fill-opacity="0.15"/>

        <text x="40" y="26" font-size="7" fill="#4b5563" font-family="monospace" text-anchor="middle">SYS</text>
        <circle cx="40" cy="38" r="5" fill="#22c55e"/>

        <text x="58" y="26" font-size="7" fill="#4b5563" font-family="monospace" text-anchor="middle">ACT</text>
        <circle cx="58" cy="38" r="5" fill="#f59e0b"/>

        {{-- NM Slot --}}
        <rect x="80" y="14" width="118" height="92" rx="2" fill="#111" stroke="#2a2a2a" stroke-width="0.8"/>
        <rect x="84" y="18" width="110" height="3" rx="1" fill="#1f1f1f"/>
        <rect x="84" y="85" width="110" height="3" rx="1" fill="#1f1f1f"/>
        <text x="139" y="58" text-anchor="middle" font-size="7" fill="#333" font-family="monospace">NM SLOT 0</text>
        <text x="139" y="68" text-anchor="middle" font-size="6" fill="#2a2a2a" font-family="monospace">[ EMPTY ]</text>

        {{-- GigabitEthernet Ports --}}
        @foreach ($ports as $port)
            <g @click="toggleTooltip('{{ $port['key'] }}')" style="cursor:pointer">
                {{-- Long label --}}
                <text x="{{ $port['x'] + 25 }}" y="17" text-anchor="middle" font-size="6" fill="#4b5563" font-family="monospace">{{ $port['key'] }}</text>
                {{-- Port housing --}}
                <rect x="{{ $port['x'] }}" y="20" width="50" height="46" rx="3" fill="#0a0a0a" stroke="#2e2e2e" stroke-width="0.8"/>
                {{-- RJ-45 socket --}}
                <rect x="{{ $port['x'] + 7 }}" y="27" width="36" height="24" rx="1" fill="#050505" stroke="#1a1a1a" stroke-width="0.5"/>
                {{-- RJ-45 tab plastic --}}
                <rect x="{{ $port['x'] + 9 }}" y="29" width="32" height="2.5" rx="0.5" fill="#111"/>
                {{-- Link LED (green when up, grey when down) --}}
                <circle cx="{{ $port['x'] + 40 }}" cy="24"  r="3.5"
                    :fill="interfaces['{{ $port['key'] }}'].adminState === 'up' ? '#22c55e' : '#2d2d2d'"/>
                <circle cx="{{ $port['x'] + 40 }}" cy="24" r="6"
                    :fill="interfaces['{{ $port['key'] }}'].adminState === 'up' ? '#22c55e' : 'none'"
                    :fill-opacity="interfaces['{{ $port['key'] }}'].adminState === 'up' ? '0.15' : '0'"/>
                {{-- Activity LED --}}
                <circle cx="{{ $port['x'] + 47 }}" cy="24" r="3.5" fill="#2d2d2d"/>
                {{-- Short label --}}
                <text x="{{ $port['x'] + 25 }}" y="76" text-anchor="middle" font-size="8.5" fill="#9ca3af" font-family="monospace">{{ $port['short'] }}</text>
            </g>
        @endforeach

        {{-- Console port --}}
        <rect x="468" y="32" width="38" height="26" rx="2" fill="#0a0a0a" stroke="#0ea5e9" stroke-width="1"/>
        <rect x="472" y="36" width="30" height="17" rx="0.5" fill="#050505"/>
        <text x="487" y="70" text-anchor="middle" font-size="7" fill="#0ea5e9" font-family="monospace">CONSOLE</text>

        {{-- AUX port --}}
        <rect x="520" y="32" width="38" height="26" rx="2" fill="#0a0a0a" stroke="#374151" stroke-width="0.8"/>
        <rect x="524" y="36" width="30" height="17" rx="0.5" fill="#050505"/>
        <text x="539" y="70" text-anchor="middle" font-size="7" fill="#6b7280" font-family="monospace">AUX</text>

        {{-- USB port --}}
        <rect x="572" y="30" width="22" height="32" rx="1.5" fill="#0a0a0a" stroke="#374151" stroke-width="0.8"/>
        <rect x="575" y="34" width="16" height="5" rx="0.5" fill="#1a1a1a"/>
        <text x="583" y="74" text-anchor="middle" font-size="7" fill="#6b7280" font-family="monospace">USB</text>

        {{-- Cisco branding --}}
        <text x="810" y="56" text-anchor="middle" font-size="20" fill="#049fd4" font-family="Arial,sans-serif" font-weight="bold" letter-spacing="1">CISCO</text>
        <text x="810" y="71" text-anchor="middle" font-size="11" fill="#6b7280" font-family="Arial,sans-serif">2911</text>
        <text x="810" y="81" text-anchor="middle" font-size="5.5" fill="#374151" font-family="Arial,sans-serif" letter-spacing="0.5">INTEGRATED SERVICES ROUTER</text>

    </svg>

    {{-- Port tooltips --}}
    @foreach ($ports as $i => $port)
        <div x-show="showTooltip === '{{ $port['key'] }}'"
             x-transition:enter="transition ease-out duration-100"
             x-transition:enter-start="opacity-0 scale-95"
             x-transition:enter-end="opacity-100 scale-100"
             class="absolute z-20 w-56 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs shadow-2xl"
             style="left: {{ ($port['x'] + 25) / 900 * 100 }}%; top: 100%; transform: translateX(-50%); margin-top: 6px;">
            <div class="font-semibold text-slate-100 mb-2">{{ $port['key'] }}</div>
            <div class="space-y-1 font-mono">
                <div class="flex justify-between">
                    <span class="text-slate-500">IP Address</span>
                    <span class="text-slate-200" x-text="interfaces['{{ $port['key'] }}'].ip ? interfaces['{{ $port['key'] }}'].ip + ' / ' + interfaces['{{ $port['key'] }}'].mask : 'unassigned'"></span>
                </div>
                <div class="flex justify-between">
                    <span class="text-slate-500">Status</span>
                    <span :class="interfaces['{{ $port['key'] }}'].adminState === 'up' ? 'text-green-400' : 'text-red-400'"
                          x-text="interfaces['{{ $port['key'] }}'].adminState === 'up' ? 'up / up' : 'admin down / down'"></span>
                </div>
                <div x-show="interfaces['{{ $port['key'] }}'].description" class="flex justify-between">
                    <span class="text-slate-500">Desc</span>
                    <span class="text-slate-200" x-text="interfaces['{{ $port['key'] }}'].description"></span>
                </div>
            </div>
        </div>
    @endforeach
</div>
```

- [ ] **Step 2: Verify panel renders**

```bash
curl -s http://localhost:8000/labs/router | grep -c "CISCO"
```
Expected: `1`

```bash
curl -s http://localhost:8000/labs/router | grep -c "GigabitEthernet0/0"
```
Expected: `>= 3` (label, Alpine binding ×2)

---

### Task 4: CLI Terminal UI Component

**Files:**
- Modify: `resources/views/components/lab/cli-terminal.blade.php`

**Interfaces:**
- Consumes: Alpine state `output[]`, `currentInput`, `prompt`, `awaitingPassword`, `history`
- Produces: scrollable terminal with input capture, status bar

- [ ] **Step 1: Replace cli-terminal.blade.php**

```blade
<div class="flex flex-col flex-1 overflow-hidden" style="background:#0a0a0a; min-height:420px;"
     @click="focusInput()">

    {{-- Output area --}}
    <div x-ref="terminal"
         class="flex-1 overflow-y-auto p-4"
         style="font-family:ui-monospace,SFMono-Regular,monospace; font-size:13px; line-height:1.6;">

        <template x-for="(line, idx) in output" :key="idx">
            <div :class="line.cls" x-text="line.text" style="white-space:pre; min-height:1.6em;"></div>
        </template>

        {{-- Active prompt line --}}
        <div class="flex items-center" style="white-space:pre;">
            <span class="text-green-400" x-text="prompt"></span>
            <span x-show="!awaitingPassword" class="text-green-400" x-text="currentInput"></span>
            <span x-show="awaitingPassword" class="text-slate-400" x-text="'*'.repeat(currentInput.length)"></span>
            <span class="inline-block w-[8px] h-[14px] ml-px"
                  style="background:#4ade80; animation:blink 1s step-end infinite;"></span>
        </div>
    </div>

    {{-- Hidden input --}}
    <input x-ref="input"
           type="text"
           x-model="currentInput"
           @keydown="handleKeydown($event)"
           class="sr-only"
           autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"/>

    {{-- Status bar --}}
    <div class="flex items-center justify-between border-t border-slate-800 px-4 py-1.5 text-xs"
         style="background:#111111;">
        <span class="text-slate-600">
            <kbd class="rounded bg-slate-800 px-1 py-0.5 text-slate-400">?</kbd> help &nbsp;·&nbsp;
            <kbd class="rounded bg-slate-800 px-1 py-0.5 text-slate-400">Tab</kbd> complete &nbsp;·&nbsp;
            <kbd class="rounded bg-slate-800 px-1 py-0.5 text-slate-400">↑↓</kbd> history &nbsp;·&nbsp;
            <kbd class="rounded bg-slate-800 px-1 py-0.5 text-slate-400">Ctrl+C</kbd> break
        </span>
        <span class="text-slate-600">
            mode: <span class="text-green-500" x-text="mode"></span>
        </span>
    </div>
</div>

<style>
@keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
</style>
```

- [ ] **Step 2: Build and verify end-to-end**

```bash
npm run build 2>&1 | tail -3
```
Expected: `✓ built in`

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/labs/router
```
Expected: `200`

```bash
curl -s http://localhost:8000/labs/router | grep -c "x-data=\"routerLab\""
```
Expected: `1`

```bash
curl -s http://localhost:8000/labs/router | grep -c "x-ref=\"terminal\""
```
Expected: `1`

---

## Self-Review

**Spec coverage:**
- ✅ Route `GET /labs/router` → Task 1
- ✅ LabController → Task 1
- ✅ Two-panel layout (front panel + CLI) → Tasks 1, 3, 4
- ✅ Cisco 2911 SVG (LEDs, GigE ports, Console, AUX, USB, Cisco branding, rack ears) → Task 3
- ✅ Port LED reacts to `adminState` via Alpine `:fill` → Task 3
- ✅ Port click tooltip (IP, state, description) → Task 3
- ✅ All 4 IOS modes + prompt changes → Task 2
- ✅ All 25+ commands (enable, disable, conf t, interface, ip address, no shutdown, shutdown, hostname, ip route, show ver/run/start/int/ip int brief/ip route, copy/write, reload, ping, ?, Tab, history) → Task 2
- ✅ Tab completion → Task 2 (`tabComplete()`)
- ✅ `?` help per mode → Task 2 (`cmdHelp()`)
- ✅ Arrow key history → Task 2 (`handleKeydown`)
- ✅ Ctrl+C breaks to privileged → Task 2
- ✅ `enable secret` password prompt → Task 2
- ✅ `show running-config` IOS format → Task 2
- ✅ `ping` success/fail based on subnet → Task 2 (`isInSubnet`)
- ✅ `reload` resets state → Task 2
- ✅ Sidebar "Labs" nav link → Task 1
- ✅ Status bar with mode indicator → Task 4

**Placeholder scan:** None found.

**Type consistency:**
- `interfaces['GigabitEthernet0/0']` — identical key in router-sim.js state, router-panel.blade.php bindings, and cli-terminal ✅
- `resolveInterface()` regex covers `g0/0`, `gi0/0`, `gig0/0`, `gigabitethernet0/0` ✅
- `toggleTooltip(ifaceName)` / `showTooltip` — consistent across panel and sim ✅
