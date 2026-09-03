# Router Lab — Sprint 1 Design Spec

**Date:** 2026-08-10
**Status:** Approved
**URL:** `/labs/router`
**Scope:** Standalone page — Cisco 2911 SVG front panel + IOS CLI simulator. No cable drag, no multi-device (Sprint 2/3).

---

## Goal

A standalone `/labs/router` page where CCNA students can practice Cisco IOS CLI commands against a simulated Cisco 2911 router, with a live front-panel SVG whose port LEDs react to CLI state.

---

## Architecture

Single Alpine.js component (`routerLab`) holds all router state. The Blade page renders two panels — front panel SVG (top) and CLI terminal (bottom). No backend involvement: all command parsing, state mutation, and output generation happens in the browser.

```
routes/web.php
  GET /labs/router → LabController@router

app/Http/Controllers/LabController.php
  router() → view('labs.router')

resources/views/labs/router.blade.php
  ├─ <x-lab.router-panel />     ← SVG front panel, reads Alpine state
  └─ <x-lab.cli-terminal />     ← Terminal UI, drives Alpine state

resources/js/router-sim.js      ← Alpine.data('routerLab', ...) — all logic
```

---

## 1. Page Layout

**Route:** `GET /labs/router` — named `labs.router`

**Sidebar link:** Added under a "Labs" heading in `layouts/app.blade.php` nav, below the lesson list.

**Layout:** Full-height two-panel, dark theme matching existing app:

```
┌─────────────────────────────────────────────┐
│  CISCO 2911 front panel SVG  (~140px tall)  │
├─────────────────────────────────────────────┤
│                                             │
│  IOS CLI terminal  (flex-1, scrollable)     │
│                                             │
└─────────────────────────────────────────────┘
```

Page title: "Router Lab — Cisco 2911"
Body bg: `bg-slate-950` (matches app). Panel border: `border-slate-800`.

---

## 2. Cisco 2911 Front Panel SVG

File: `resources/views/components/lab/router-panel.blade.php`

Standalone inline SVG (not using the sprite), `viewBox="0 0 900 120"`, `class="w-full h-auto"`.

### Physical layout (left → right)

```
[PWR SYS ACT]  [blank NM slot]  [G0/0][G0/1][G0/2]  [CON][AUX]  [USB]  [CISCO logo]
```

### Chassis
- Outer rect: `x=0 y=0 w=900 h=120 rx=4` fill `#1a1a1a`, stroke `#333` 0.5px
- Top bezel line: `y=8` height 4, fill `#2a2a2a` — rack-unit visual
- Bottom bezel: `y=108` height 4, fill `#111`

### System LEDs (x=20–70, y=30)
Three small indicator LEDs with labels below:

| LED | x  | Default color | Label |
|-----|----|---------------|-------|
| PWR | 24 | `#22c55e`     | PWR   |
| SYS | 40 | `#22c55e`     | SYS   |
| ACT | 56 | `#f59e0b`     | ACT   |

Each LED: `circle r=5`, label `font-size=7` below.

### NM Slot (x=90–200, y=20)
Empty module slot — dark rect with "NM SLOT 0" label. Decorative only.

### GigabitEthernet Ports (x=220, 310, 400 — each port width=70)
Three identical port groups for G0/0, G0/1, G0/2:

Each group contains:
- **Port housing**: `rect w=50 h=40 rx=3` fill `#0a0a0a` stroke `#444`
- **RJ-45 opening**: `rect w=36 h=22 rx=1` fill `#050505` centered in housing
- **Link LED**: `circle r=4` — color driven by Alpine state:
  - `#374151` (grey) when `adminState === 'down'`
  - `#22c55e` (green) when `adminState === 'up'`
- **Activity LED**: `circle r=4` — `#f59e0b` pulse when active, grey otherwise
- **Short label**: `G0/0` below port, `font-size=9 fill=#9ca3af`
- **Long label**: `GigabitEthernet0/0` above port, `font-size=7 fill=#6b7280`

LED colors bound via Alpine `:fill` binding:
```js
`:fill="iface.adminState === 'up' ? '#22c55e' : '#374151'"`
```

### Console Port (x=510, y=30)
- `rect w=32 h=22 rx=2` fill `#0a0a0a` stroke `#0ea5e9` (light blue — Cisco convention)
- Label: "CONSOLE" `font-size=7 fill=#0ea5e9`

### AUX Port (x=560, y=30)
- Same housing as console, stroke `#6b7280`
- Label: "AUX" `font-size=7 fill=#6b7280`

### USB Port (x=610, y=28)
- `rect w=18 h=26 rx=1` fill `#0a0a0a` stroke `#6b7280`
- Label: "USB" `font-size=7 fill=#6b7280`

### Cisco Branding (x=780–890)
- "CISCO" text `font-size=18 fill=#049fd4 font-weight=bold`
- "2911" text `font-size=12 fill=#6b7280`
- Small "INTEGRATED SERVICES ROUTER" `font-size=6 fill=#4b5563`

### Port click tooltip
Clicking any GigabitEthernet port opens a small floating div (Alpine `x-show`):
```
GigabitEthernet0/0
IP: 192.168.1.1/24
State: up / up
Description: LAN interface
```
Click elsewhere to dismiss.

---

## 3. IOS CLI Simulator

File: `resources/views/components/lab/cli-terminal.blade.php`
Logic: `resources/js/router-sim.js` — `Alpine.data('routerLab', () => ({...}))`

### Terminal UI

```
┌─ IOS CLI ──────────────────────────────────────────┐
│ Cisco IOS Software, Version 15.2(4)M               │  ← boot banner
│ Router>                                             │
│ Router> enable                                      │
│ Router#                                             │
│ Router# _                                           │  ← active input
└─────────────────────────────────────────────────────┘
```

- Background: `#0a0a0a`
- Output text: `#d1d5db` (grey-white)
- Prompt + typed command: `#22c55e` (green)
- Error messages: `#ef4444` (red)
- Font: `font-family: ui-monospace, monospace; font-size: 13px`
- Input: invisible `<input>` full-width, captures keystrokes
- Terminal div: `overflow-y-auto`, auto-scrolls to bottom on new output

### Router State Object

```js
{
  hostname: 'Router',
  mode: 'user',          // 'user' | 'privileged' | 'global' | 'interface'
  currentIface: null,    // 'GigabitEthernet0/0' | '0/1' | '0/2'
  enableSecret: '',      // set by 'enable secret' command
  awaitingPassword: false,
  startupConfig: null,   // snapshot, updated by 'copy run start' / 'write mem'

  interfaces: {
    'GigabitEthernet0/0': { ip: '', mask: '', description: '', adminState: 'down', lineProtocol: 'down', clockRate: null, duplex: 'auto', speed: 'auto' },
    'GigabitEthernet0/1': { ip: '', mask: '', description: '', adminState: 'down', lineProtocol: 'down', clockRate: null, duplex: 'auto', speed: 'auto' },
    'GigabitEthernet0/2': { ip: '', mask: '', description: '', adminState: 'down', lineProtocol: 'down', clockRate: null, duplex: 'auto', speed: 'auto' },
  },

  routes: [],            // [{ network, mask, nexthop, ad: 1 }]
  motd: '',
  history: [],           // last 20 commands
  historyIndex: -1,
  output: [],            // [{text, class}] rendered lines
}
```

### Prompt Computation

```js
get prompt() {
  const h = this.hostname;
  switch (this.mode) {
    case 'user':      return `${h}>`;
    case 'privileged': return `${h}#`;
    case 'global':    return `${h}(config)#`;
    case 'interface': return `${h}(config-if)#`;
  }
}
```

### Full Command Table

**User EXEC** (`mode === 'user'`):

| Command | Action |
|---------|--------|
| `enable` | If `enableSecret` set → prompt password, else → `mode = 'privileged'` |
| `show version` | Print IOS version banner (static string) |
| `show ip interface brief` | Table of all interfaces with IP, status, protocol |
| `ping <ip>` | Print 5 `!` (success) if IP matches a configured interface subnet, else `....U` |
| `logout` / `exit` | Print "Connection closed." |
| `?` | List valid commands in current mode |

**Privileged EXEC** (`mode === 'privileged'`):

| Command | Action |
|---------|--------|
| `disable` | `mode = 'user'` |
| `configure terminal` | `mode = 'global'`, print "Enter configuration commands..." |
| `show running-config` | Generate full IOS config block from current state |
| `show startup-config` | Show `startupConfig` snapshot or "startup config is not present" |
| `show interfaces` | Verbose per-interface output |
| `show ip interface brief` | Same as user EXEC |
| `show ip route` | Print routing table with codes legend |
| `copy running-config startup-config` | `startupConfig = deepCopy(state)`, print "[OK]" |
| `write memory` / `wr` | Same as `copy run start` |
| `ping <ip>` | Same as user EXEC |
| `reload` | Print "Reload confirmed. Resetting..." → reset state to defaults after 1s |
| `?` | List valid commands |

**Global Config** (`mode === 'global'`):

| Command | Action |
|---------|--------|
| `hostname <name>` | `this.hostname = name` |
| `interface <id>` | Resolve interface name → `mode = 'interface'`, `currentIface = resolved` |
| `no interface <id>` | Reset interface to defaults |
| `ip route <net> <mask> <nexthop>` | Add to `routes[]` |
| `no ip route <net> <mask> <nexthop>` | Remove matching route |
| `enable secret <pass>` | `enableSecret = pass` |
| `banner motd # <text> #` | Set MOTD |
| `no hostname` | `hostname = 'Router'` |
| `exit` | `mode = 'privileged'` |
| `end` / `Ctrl+C` | `mode = 'privileged'` |
| `?` | List valid commands |

**Interface Config** (`mode === 'interface'`):

| Command | Action |
|---------|--------|
| `ip address <ip> <mask>` | Set IP + mask on `currentIface` |
| `no ip address` | Clear IP + mask |
| `no shutdown` | `adminState = 'up'`, `lineProtocol = 'up'`, print "%LINK-3-UPDOWN: Interface GigabitEthernet0/0, changed state to up" |
| `shutdown` | `adminState = 'down'`, `lineProtocol = 'down'`, print updown message |
| `description <text>` | Set description |
| `clock rate <rate>` | Set clock rate (DCE interfaces) |
| `duplex <auto\|full\|half>` | Set duplex |
| `speed <10\|100\|1000\|auto>` | Set speed |
| `no ip address` | Clear IP |
| `exit` | `mode = 'global'` |
| `end` / `Ctrl+C` | `mode = 'privileged'` |
| `?` | List valid commands |

### Interface Name Resolution

`interface g0/0`, `interface gi0/0`, `interface gigabitethernet0/0`, `interface gig0/0` all resolve to `GigabitEthernet0/0`. Case-insensitive prefix matching.

### `show running-config` Output Template

```
Building configuration...

Current configuration : 842 bytes
!
version 15.2
!
hostname {hostname}
!
{if enableSecret}enable secret 5 {hash}
{/if}
{if motd}banner motd ^C{motd}^C
{/if}
!
interface GigabitEthernet0/0
 {description ? ' description '+description : ' no description'}
 {ip ? ' ip address '+ip+' '+mask : ' no ip address'}
 {adminState === 'down' ? ' shutdown' : ' no shutdown'}
!
interface GigabitEthernet0/1
 ...
!
interface GigabitEthernet0/2
 ...
!
{routes.map(r => 'ip route '+r.network+' '+r.mask+' '+r.nexthop).join('\n')}
!
end
```

### Tab Completion

On `Tab` keypress: find all commands valid in current mode that start with current input. If exactly one match → complete it. If multiple → print them as a list (IOS-style).

### `?` Help

On `?` or standalone `?` command: print all valid command keywords for current mode, one per line, with short description. Matches real IOS `?` behaviour.

### Error Responses

| Situation | Output |
|-----------|--------|
| Unknown command | `% Unknown command or computer name, or unable to find computer address` |
| Incomplete command | `% Incomplete command.` |
| Invalid input | `% Invalid input detected at '^' marker.` |
| Wrong mode | `% Invalid input detected at '^' marker.` (IOS doesn't tell you the right mode) |

---

## 4. Files Changed / Created

| File | Action |
|------|--------|
| `routes/web.php` | Add `GET /labs/router` → `LabController@router` named `labs.router` |
| `app/Http/Controllers/LabController.php` | New controller, single `router()` method |
| `resources/views/labs/router.blade.php` | New page view — layout, two panels |
| `resources/views/components/lab/router-panel.blade.php` | Cisco 2911 SVG front panel |
| `resources/views/components/lab/cli-terminal.blade.php` | CLI terminal UI |
| `resources/js/router-sim.js` | Alpine.data('routerLab') — all state + command logic |
| `resources/js/app.js` | Import router-sim.js |
| `resources/views/layouts/app.blade.php` | Add "Labs" nav section with router lab link |

---

## 5. Out of Scope (Sprint 2/3)

- Cable drag-to-connect between ports
- Multi-device canvas (switch, PC)
- Saving lab state to database
- OSPF/EIGRP dynamic routing simulation
- Serial interfaces (S0/0/0)
- VLANs / trunk configuration
- Ping between simulated devices

---

## Success Criteria

1. `/labs/router` loads and shows Cisco 2911 front panel + CLI terminal
2. `enable` → `configure terminal` → `interface g0/0` → `ip address 10.0.0.1 255.255.255.0` → `no shutdown` works end-to-end
3. Port LED on front panel turns green after `no shutdown`
4. `show ip interface brief` shows correct table with configured IP and state
5. `show running-config` generates correct IOS-format output reflecting current state
6. `?` and `Tab` completion work in all modes
7. Arrow key command history works
8. "Labs" link appears in sidebar navigation
