# Interactive Router Lab — Cisco 2911 ISR Documentation

## Overview

The Interactive Router Lab is a browser-based Cisco IOS CLI simulator that replicates the experience of configuring a Cisco 2911 Integrated Services Router running IOS 15.2(4)M5. It provides a fully functional command-line interface with three GigabitEthernet interfaces, supporting all major configuration tasks required for CCNA 200-301 study.

**Route:** `/labs/router`  
**Controller:** `App\Http\Controllers\LabController@router`  
**View:** `resources/views/labs/router.blade.php`  
**Alpine Component:** `routerLab` (in `resources/js/router-sim.js`)

---

## Architecture

### Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│  router.blade.php (Layout)                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  x-lab.router-panel (SVG Router Visualization)      │   │
│  │  - 3 GigabitEthernet ports with live LED status     │   │
│  │  - Console, AUX, USB ports                          │   │
│  │  - Interactive tooltips showing interface config    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  x-lab.cli-terminal (CLI Simulator)                 │   │
│  │  - Full Cisco IOS command parser                    │   │
│  │  - 4-mode state machine (user/privileged/global/if) │   │
│  │  - History, tab completion, help system             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Alpine.js Component** (`routerLab`) holds all state in a single reactive object
2. **SVG Panel** binds to `interfaces` state for real-time LED updates
3. **CLI Terminal** reads/writes to the same state object
4. **No backend persistence** — state resets on page reload or `reload` command

---

## State Machine Design

### Four CLI Modes

| Mode | Prompt | Entry Command | Exit Command | Purpose |
|------|--------|---------------|--------------|---------|
| **User EXEC** | `Router>` | Default / `disable` | `enable` / `logout` | Basic monitoring, ping, show (limited) |
| **Privileged EXEC** | `Router#` | `enable` | `disable` / `exit` | Full show, copy, write, reload, configure |
| **Global Config** | `Router(config)#` | `configure terminal` | `exit` / `end` | System-wide config (hostname, IP routes, banner) |
| **Interface Config** | `Router(config-if)#` | `interface Gi0/0` | `exit` / `end` | Per-interface config (IP, shutdown, description) |

### State Object (from `router-sim.js`)

```javascript
{
  // Identity
  hostname: 'Router',
  enableSecret: '',           // Encrypted password for enable
  
  // Mode management
  mode: 'user',               // 'user' | 'privileged' | 'global' | 'interface'
  currentIface: null,         // Active interface in interface mode
  
  // Interfaces (3x GigabitEthernet)
  interfaces: {
    'GigabitEthernet0/0': { ip: '', mask: '', description: '', 
                            adminState: 'down', lineProtocol: 'down',
                            clockRate: null, duplex: 'auto', speed: 'auto' },
    'GigabitEthernet0/1': { ... },
    'GigabitEthernet0/2': { ... },
  },
  
  // Routing
  routes: [],                 // Static routes: [{network, mask, nexthop, ad}]
  
  // System
  motd: '',                   // Message of the Day banner
  startupConfig: null,        // Saved config (copy run start)
  
  // Terminal
  output: [],                 // [{text, cls}] - scrollback buffer
  history: [],                // Command history
  historyIndex: -1,           // Current history position
  currentInput: '',           // Current command line
  awaitingPassword: false,    // Enable secret prompt state
  showTooltip: null,          // Active port tooltip
}
```

---

## Command Set Reference

### User EXEC Mode (`Router>`)

| Command | Description |
|---------|-------------|
| `enable` | Enter privileged mode (prompts for secret if set) |
| `ping <ip>` | Send ICMP echo requests |
| `show version` | Display IOS version, hardware, uptime |
| `show running-config` | Display current configuration |
| `show startup-config` | Display saved configuration |
| `show ip interface brief` | Interface summary table |
| `show ip route` | Routing table |
| `show interfaces [name]` | Detailed interface status |
| `logout` / `exit` | Close connection |

### Privileged EXEC Mode (`Router#`)

| Command | Description |
|---------|-------------|
| `disable` | Return to user mode |
| `configure terminal` | Enter global configuration mode |
| `copy running-config startup-config` | Save config to NVRAM |
| `write` | Alias for copy run start |
| `reload` | Reboot router (resets all state) |
| All User EXEC commands | Plus full show command set |

### Global Configuration Mode (`Router(config)#`)

| Command | Description |
|---------|-------------|
| `hostname <name>` | Set device hostname |
| `interface <name>` | Enter interface configuration mode |
| `ip route <network> <mask> <next-hop>` | Add static route |
| `no ip route <network> <mask> <next-hop>` | Remove static route |
| `enable secret <password>` | Set encrypted enable password |
| `banner motd <delim> <message> <delim>` | Set Message of the Day |
| `no banner motd` | Remove banner |
| `no hostname` | Reset hostname to 'Router' |
| `exit` / `end` | Return to privileged mode |

### Interface Configuration Mode (`Router(config-if)#`)

| Command | Description |
|---------|-------------|
| `ip address <ip> <mask>` | Assign IP address |
| `no ip address` | Remove IP address |
| `shutdown` | Administratively disable interface |
| `no shutdown` | Enable interface (shows link/line protocol messages) |
| `description <text>` | Set interface description |
| `no description` | Remove description |
| `clock rate <bps>` | Set DCE clock rate (serial) |
| `duplex <auto\|full\|half>` | Set duplex mode |
| `speed <10\|100\|1000\|auto>` | Set speed |
| `exit` | Return to global config mode |
| `end` | Return to privileged mode |

### Special Commands

| Command | Context | Description |
|---------|---------|-------------|
| `?` | Any | Context-sensitive help |
| `Tab` | Any | Command completion |
| `↑` / `↓` | Any | History navigation |
| `Ctrl+C` | Any | Break current command |

---

## SVG Panel Implementation

### Visual Design (`router-panel.blade.php`)

The router panel is a **900×120 SVG** rendered inline with the following elements:

#### Chassis
- Dark body (`#1c1c1c`) with top/bottom bezels
- Rack ears with mounting holes (left/right)

#### System LEDs (Left Side)
| LED | Color | Meaning |
|-----|-------|---------|
| PWR | Green (`#22c55e`) | Power on (always lit) |
| SYS | Green | System OK (always lit) |
| ACT | Amber (`#f59e0b`) | Activity indicator |

#### NM Slot (Slot 0)
- Empty module bay with label "NM SLOT 0 [ EMPTY ]"

#### GigabitEthernet Ports (3×)
Each port at x-positions: **215, 310, 405**

```
┌─────────────────────────────────────┐
│ GigabitEthernet0/0  (long label)    │
│ ┌─────────────────────────────┐     │
│ │  ████████████████████████  │     │  ← RJ-45 socket
│ │  ████████████████████████  │     │
│ │  ● Link LED  ● Act LED    │     │
│ └─────────────────────────────┘     │
│ G0/0  (short label)                 │
└─────────────────────────────────────┘
```

**Link LED Behavior:**
- **Green + glow** (`#22c55e` + 15% opacity) when `adminState === 'up'`
- **Dark grey** (`#2d2d2d`) when `adminState === 'down'`

#### Management Ports
| Port | Color | Position |
|------|-------|----------|
| CONSOLE | Light blue (`#0ea5e9`) | x=468 |
| AUX | Dark grey (`#374151`) | x=520 |
| USB | Dark grey | x=572 |

#### Branding
- "CISCO" in Cisco blue (`#049fd4`)
- "2911" model number
- "INTEGRATED SERVICES ROUTER" tagline

### Interactive Tooltips

Clicking any GigabitEthernet port shows a tooltip with live data:

```html
<div x-show="showTooltip === 'GigabitEthernet0/0'" ...>
  <div class="font-semibold">GigabitEthernet0/0</div>
  <div>IP: 192.168.1.1 / 255.255.255.0</div>
  <div>Status: up / up</div>  <!-- Green when up, red when down -->
  <div>Desc: LAN Connection</div>  <!-- Only if description set -->
</div>
```

**Tooltip Positioning:** Calculated as percentage of SVG width:
```php
style="left: {{ ($port['x'] + 25) / 900 * 100 }}%; top: 100%; transform: translateX(-50%)"
```

---

## Terminal UI Implementation

### Component Structure (`cli-terminal.blade.php`)

```html
<div class="flex flex-col flex-1 overflow-hidden" style="background:#0a0a0a;">
  
  <!-- Scrollable Output Area -->
  <div x-ref="terminal" class="flex-1 overflow-y-auto p-4" style="font-family:monospace;">
    <template x-for="(line, idx) in output" :key="idx">
      <div :class="line.cls" x-text="line.text" style="white-space:pre;"></div>
    </template>
    
    <!-- Active Input Line -->
    <div class="flex items-baseline">
      <span class="text-green-400" x-text="prompt"></span>
      <span x-show="!awaitingPassword" class="text-green-400" x-text="currentInput"></span>
      <span x-show="awaitingPassword" class="text-slate-500" x-text="'*'.repeat(currentInput.length)"></span>
      <span class="blinking-cursor"></span>
    </div>
  </div>

  <!-- Hidden Input Capture -->
  <input x-ref="input" type="text" x-model="currentInput" 
         @keydown="handleKeydown($event)" class="sr-only" .../>

  <!-- Status Bar -->
  <div class="border-t border-slate-800 px-4 py-2 text-xs" style="background:#111111;">
    <span>Keys: <kbd>?</kbd>help <kbd>Tab</kbd>complete <kbd>↑↓</kbd>history <kbd>Ctrl+C</kbd>break</span>
    <span>mode: <span class="text-green-500" x-text="mode"></span></span>
  </div>
</div>
```

### Key Features

#### 1. Blinking Cursor
```css
@keyframes termBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
```

#### 2. Password Masking
When `awaitingPassword` is true, input shows asterisks:
```html
<span x-show="awaitingPassword" x-text="'*'.repeat(currentInput.length)"></span>
```

#### 3. Auto-scroll
```javascript
scrollBottom() {
  this.$nextTick(() => {
    const el = this.$refs.terminal;
    if (el) el.scrollTop = el.scrollHeight;
  });
}
```

#### 4. Command History
- `↑` / `↓` navigate through `history` array
- `historyIndex` tracks position
- `currentInput` restored on navigation

#### 5. Tab Completion
```javascript
tabComplete() {
  const prefix = lastWord.toLowerCase();
  const matches = validCommands.filter(c => c.startsWith(prefix));
  if (matches.length === 1) {
    // Auto-complete
    this.currentInput = completedCommand + ' ';
  } else if (matches.length > 1) {
    // Show all matches
    this.print(matches.join('  '), 'text-slate-400');
  }
}
```

#### 6. Command Expansion (Abbreviation Support)
```javascript
expandCmd(input, list) {
  const matches = list.filter(c => c.startsWith(input));
  if (matches.length === 1) return matches[0];  // Unique match
  if (matches.includes(input)) return input;    // Exact match
  if (matches.length > 1) {                     // Ambiguous
    this.print(`% Ambiguous command: "${input}"`, 'text-red-400');
    return null;
  }
  return null;  // Unknown
}
```

---

## Command Parsing & Dispatch

### Entry Point: `submitCommand()`

```javascript
submitCommand() {
  const raw = this.currentInput.trim();
  this.history.push(raw);
  this.historyIndex = this.history.length;
  this.currentInput = '';
  
  if (!raw) return;
  if (raw === '?') { this.cmdHelp(); return; }
  
  this.dispatch(raw.toLowerCase());
}
```

### Dispatch Flow

```
dispatch(raw)
  ├─ Split into parts: [command, ...args]
  ├─ Handle 'no' prefix → dispatchNo(args)
  ├─ Expand abbreviation → expandCmd()
  ├─ Switch on mode:
  │   ├─ 'user'       → dispatchUser()
  │   ├─ 'privileged' → dispatchPrivileged()
  │   ├─ 'global'     → dispatchGlobal()
  │   └─ 'interface'  → dispatchIface()
  └─ Unknown command → printError()
```

### Show Command Dispatcher

```javascript
dispatchShow(args) {
  const sub = args[0];
  if (sub.startsWith('ver'))       → cmdShowVersion()
  else if (sub.startsWith('run'))  → cmdShowRunningConfig()
  else if (sub.startsWith('start'))→ cmdShowStartupConfig()
  else if (sub==='ip' && args[1]?.startsWith('int')) → cmdShowIpInterfaceBrief()
  else if (sub==='ip' && args[1]?.startsWith('ro'))  → cmdShowIpRoute()
  else if (sub.startsWith('int'))  → cmdShowInterfaces(args.slice(1))
  else → printError()
}
```

---

## Key Algorithms

### Interface Name Resolution

Supports abbreviated interface names (Cisco-style):

```javascript
resolveInterface(input) {
  const n = input.toLowerCase().replace(/\s+/g, '');
  // Matches: g0/0, gi0/0, gig0/0, giga0/0, gigab0/0, gigabi0/0, 
  //          gigabit0/0, gigabite0/0, gigabitet0/0, gigabitethe0/0,
  //          gigabitether0/0, gigabitethern0/0, gigabitetherne0/0,
  //          gigabitethernet0/0
  if (/^g(e|i|ig|iga|igab|igabi|igabit|igabite|igabiteth|igabitether|igabitethe|igabitethern|igabitetherne|igabitethernet)?0\/0$/.test(n))
    return 'GigabitEthernet0/0';
  // ... similar for 0/1 and 0/2
}
```

### Subnet Mask → CIDR Conversion

```javascript
maskToCidr(mask) {
  return mask.split('.').reduce((a, o) => 
    a + parseInt(o).toString(2).split('').filter(b => b === '1').length, 0);
}
```

### IP Subnet Membership Test

```javascript
isInSubnet(target, ifaceIp, mask) {
  const toNum = ip => ip.split('.').reduce((a, o) => ((a << 8) | parseInt(o)) >>> 0, 0);
  const m = toNum(mask);
  return (toNum(target) & m) === (toNum(ifaceIp) & m);
}
```

### Ping Simulation

```javascript
cmdPing(args) {
  const target = args[0];
  // Check local interfaces
  let reachable = target === '127.0.0.1';
  if (!reachable) {
    for (const iface of Object.values(this.interfaces)) {
      if (iface.ip && iface.adminState === 'up' && 
          this.isInSubnet(target, iface.ip, iface.mask)) {
        reachable = true; break;
      }
    }
  }
  // Check static routes
  if (!reachable) reachable = this.routes.some(r => r.nexthop === target);
  
  this.print(reachable ? '!!!!!' : '.....', reachable ? 'text-green-400' : 'text-red-400');
}
```

---

## Integration with Lesson System

### Navigation

The router lab is accessible via the main navigation under "Labs" section. The `LabController` provides `navDomains` for the sidebar:

```php
// LabController.php
public function router()
{
    $navDomains = Domain::with('topics.lessons')->get();
    return view('labs.router', compact('navDomains'));
}
```

### Route Registration

```php
// routes/web.php
Route::get('/labs/router', [LabController::class, 'router'])->name('labs.router');
```

### Potential Lesson Integration Points

1. **Lab Exercises** — Lessons could reference specific router configurations
2. **Progress Tracking** — Could save `startupConfig` to `UserProgress` model
3. **Assessment** — Quiz questions could verify router configuration state
4. **Guided Labs** — Step-by-step instructions with validation

---

## Extending the Router Lab

### Adding New Commands

1. Add command to `getValidCommandList()` for the appropriate mode
2. Add case in the corresponding `dispatch*()` method
3. Implement `cmdNewCommand()` method
4. Update `cmdHelp()` with description

### Adding New Interface Types

1. Add interface to `interfaces` object in `init()`
2. Add port to `$ports` array in `router-panel.blade.php`
3. Add SVG elements for the new port
4. Add tooltip template in the `@foreach` loop

### Adding Persistence

```javascript
// Save to localStorage
saveConfig() {
  localStorage.setItem('routerLab', JSON.stringify({
    hostname: this.hostname,
    interfaces: this.interfaces,
    routes: this.routes,
    motd: this.motd,
    enableSecret: this.enableSecret,
  }));
}

// Load from localStorage
loadConfig() {
  const saved = localStorage.getItem('routerLab');
  if (saved) Object.assign(this, JSON.parse(saved));
}
```

### Multi-Device Support

For future expansion (see roadmap item 8):
- Create `RouterDevice` class encapsulating state
- Canvas-based topology view
- Inter-device ping/routing simulation
- Drag-and-drop cable connections

---

## Testing Checklist

### Functional Tests
- [ ] All 4 modes accessible and exitable
- [ ] `enable` with/without secret password
- [ ] Interface IP assignment and removal
- [ ] `shutdown` / `no shutdown` with syslog messages
- [ ] Static route add/remove
- [ ] `copy run start` / `write` persistence
- [ ] `reload` full state reset
- [ ] Ping to local interface, remote via static route, unreachable
- [ ] All `show` commands produce correct output
- [ ] Tab completion works in all modes
- [ ] Command abbreviation works (e.g., `conf t`, `sh run`, `int g0/0`)
- [ ] `no` form of commands works
- [ ] History navigation (↑/↓)
- [ ] Ctrl+C breaks current input
- [ ] Help (`?`) context-sensitive in all modes

### Visual Tests
- [ ] Link LEDs green when interface up, grey when down
- [ ] Tooltips show correct IP, status, description
- [ ] Prompt changes with mode and hostname
- [ ] Status bar shows current mode
- [ ] Blinking cursor visible
- [ ] Password input masked with asterisks
- [ ] Scrollback works for long outputs

### Edge Cases
- [ ] Ambiguous command detection
- [ ] Incomplete command errors
- [ ] Invalid interface name handling
- [ ] Duplicate static route prevention
- [ ] Subnet mask validation (CIDR conversion)
- [ ] Banner delimiter parsing

---

## File Reference

| File | Purpose |
|------|---------|
| `app/Http/Controllers/LabController.php` | Route handler, passes navDomains |
| `resources/views/labs/router.blade.php` | Main layout, includes panel + terminal |
| `resources/views/components/lab/router-panel.blade.php` | SVG router visualization with tooltips |
| `resources/views/components/lab/cli-terminal.blade.php` | Terminal UI with input capture |
| `resources/js/router-sim.js` | Alpine.js component — full CLI logic |
| `routes/web.php` | Route definition |

---

## Related Documentation

- [08-roadmap.md](../08-roadmap.md) — Project roadmap (Item 7: ✅ Interactive Router Lab)
- [PROGRESS.md](../PROGRESS.md) — Implementation progress log
- [03-database-schema.md](../03-database-schema.md) — Database models
- [07-project-structure.md](../07-project-structure.md) — Codebase organization
