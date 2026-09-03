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
                case 'user':       return `${this.hostname}>`;
                case 'privileged': return `${this.hostname}#`;
                case 'global':     return `${this.hostname}(config)#`;
                case 'interface':  return `${this.hostname}(config-if)#`;
                default:           return `${this.hostname}>`;
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
            const rest  = parts.slice(1);

            if (first === 'no') { this.dispatchNo(rest); return; }

            const expanded = this.expandCmd(first, this.getValidCommandList());
            if (!expanded) { this.printError('% Unknown command or computer name, or unable to find computer address'); return; }

            switch (this.mode) {
                case 'user':       this.dispatchUser(expanded, rest); break;
                case 'privileged': this.dispatchPrivileged(expanded, rest); break;
                case 'global':     this.dispatchGlobal(expanded, rest); break;
                case 'interface':  this.dispatchIface(expanded, rest); break;
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
                case 'user':       return ['enable', 'show', 'ping', 'logout', 'exit'];
                case 'privileged': return ['disable', 'configure', 'show', 'copy', 'write', 'ping', 'reload', 'logout', 'exit'];
                case 'global':     return ['hostname', 'interface', 'ip', 'enable', 'banner', 'no', 'exit', 'end'];
                case 'interface':  return ['ip', 'no', 'shutdown', 'description', 'clock', 'duplex', 'speed', 'exit', 'end'];
                default: return [];
            }
        },

        dispatchNo(args) {
            if (!args.length) { this.print('% Incomplete command.', 'text-red-400'); return; }
            const sub  = args[0];
            const rest = args.slice(1);
            if (this.mode === 'interface') {
                if (sub === 'ip' && rest[0] === 'address') {
                    this.interfaces[this.currentIface].ip   = '';
                    this.interfaces[this.currentIface].mask = '';
                } else if (sub === 'shutdown') {
                    this.cmdNoShutdown();
                } else if (sub === 'description') {
                    this.interfaces[this.currentIface].description = '';
                } else {
                    this.printError('% Unknown command or computer name, or unable to find computer address');
                }
            } else if (this.mode === 'global') {
                if (sub === 'ip' && rest[0] === 'route') { this.cmdNoIpRoute(rest.slice(1)); }
                else if (sub === 'hostname') { this.hostname = 'Router'; }
                else if (sub === 'banner')   { this.motd = ''; }
                else { this.printError('% Unknown command or computer name, or unable to find computer address'); }
            } else {
                this.printError('% Unknown command or computer name, or unable to find computer address');
            }
        },

        dispatchUser(cmd, args) {
            if      (cmd === 'enable')  { this.cmdEnable(); }
            else if (cmd === 'show')    { this.dispatchShow(args); }
            else if (cmd === 'ping')    { this.cmdPing(args); }
            else if (cmd === 'logout' || cmd === 'exit') { this.print('Connection closed by foreign host.', 'text-slate-400'); }
            else { this.printError('% Unknown command or computer name, or unable to find computer address'); }
        },

        dispatchPrivileged(cmd, args) {
            if      (cmd === 'disable')   { this.mode = 'user'; }
            else if (cmd === 'configure') { this.cmdConfigureTerminal(); }
            else if (cmd === 'show')      { this.dispatchShow(args); }
            else if (cmd === 'copy')      { this.cmdCopyRunStart(); }
            else if (cmd === 'write')     { this.cmdCopyRunStart(); }
            else if (cmd === 'ping')      { this.cmdPing(args); }
            else if (cmd === 'reload')    { this.cmdReload(); }
            else if (cmd === 'logout' || cmd === 'exit') { this.print('Connection closed by foreign host.', 'text-slate-400'); }
            else { this.printError('% Unknown command or computer name, or unable to find computer address'); }
        },

        dispatchGlobal(cmd, args) {
            if      (cmd === 'hostname')  { this.cmdHostname(args); }
            else if (cmd === 'interface') { this.cmdInterface(args); }
            else if (cmd === 'ip')        { args[0] === 'route' ? this.cmdIpRoute(args.slice(1)) : this.print('% Incomplete command.', 'text-red-400'); }
            else if (cmd === 'enable')    { args[0] === 'secret' && args[1] ? this.enableSecret = args.slice(1).join(' ') : this.print('% Incomplete command.', 'text-red-400'); }
            else if (cmd === 'banner')    { this.cmdBanner(args); }
            else if (cmd === 'exit')      { this.mode = 'privileged'; }
            else if (cmd === 'end')       { this.mode = 'privileged'; }
            else { this.printError('% Unknown command or computer name, or unable to find computer address'); }
        },

        dispatchIface(cmd, args) {
            if (cmd === 'ip') {
                if (args[0] === 'address' && args.length >= 3) {
                    this.interfaces[this.currentIface].ip   = args[1];
                    this.interfaces[this.currentIface].mask = args[2];
                } else { this.print('% Incomplete command.', 'text-red-400'); }
            } else if (cmd === 'shutdown')    { this.cmdShutdown(); }
            else if (cmd === 'description')   { args.length ? (this.interfaces[this.currentIface].description = args.join(' ')) : this.print('% Incomplete command.', 'text-red-400'); }
            else if (cmd === 'clock')         { args[0] === 'rate' && args[1] ? (this.interfaces[this.currentIface].clockRate = parseInt(args[1])) : this.print('% Incomplete command.', 'text-red-400'); }
            else if (cmd === 'duplex')        { ['auto','full','half'].includes(args[0]) ? (this.interfaces[this.currentIface].duplex = args[0]) : this.print('% Invalid input detected.', 'text-red-400'); }
            else if (cmd === 'speed')         { ['10','100','1000','auto'].includes(args[0]) ? (this.interfaces[this.currentIface].speed = args[0]) : this.print('% Invalid input detected.', 'text-red-400'); }
            else if (cmd === 'exit')          { this.mode = 'global'; this.currentIface = null; }
            else if (cmd === 'end')           { this.mode = 'privileged'; this.currentIface = null; }
            else { this.printError('% Unknown command or computer name, or unable to find computer address'); }
        },

        dispatchShow(args) {
            if (!args.length) { this.print('% Incomplete command.', 'text-red-400'); return; }
            const sub  = args[0];
            const rest = args.slice(1);
            if      (sub.startsWith('ver'))                            { this.cmdShowVersion(); }
            else if (sub.startsWith('run'))                            { this.cmdShowRunningConfig(); }
            else if (sub.startsWith('start'))                          { this.cmdShowStartupConfig(); }
            else if (sub.startsWith('ip') && rest[0]?.startsWith('int')) { this.cmdShowIpInterfaceBrief(); }
            else if (sub.startsWith('ip') && rest[0]?.startsWith('ro'))  { this.cmdShowIpRoute(); }
            else if (sub.startsWith('int') && rest[0]?.startsWith('ip')) { this.cmdShowIpInterfaceBrief(); }
            else if (sub.startsWith('int'))                            { this.cmdShowInterfaces(rest); }
            else { this.printError('% Unknown command or computer name, or unable to find computer address'); }
        },

        // ── Commands ─────────────────────────────────────────────────────

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
            if (!name) { this.print("% Invalid input detected at '^' marker.", 'text-red-400'); return; }
            this.currentIface = name;
            this.mode = 'interface';
        },

        cmdBanner(args) {
            if (args[0] !== 'motd' || args.length < 2) { this.print('% Incomplete command.', 'text-red-400'); return; }
            const raw   = args.slice(1).join(' ');
            const delim = raw[0];
            const end   = raw.lastIndexOf(delim, raw.length - 1);
            this.motd   = end > 0 ? raw.slice(1, end).trim() : raw.slice(1).trim();
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
            iface.adminState    = 'up';
            iface.lineProtocol  = 'up';
            this.print(`%LINK-3-UPDOWN: Interface ${this.currentIface}, changed state to up`, 'text-slate-500');
            this.print(`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${this.currentIface}, changed state to up`, 'text-slate-500');
        },

        cmdShutdown() {
            const iface = this.interfaces[this.currentIface];
            iface.adminState   = 'down';
            iface.lineProtocol = 'down';
            this.print(`%LINK-5-CHANGED: Interface ${this.currentIface}, changed state to administratively down`, 'text-slate-500');
            this.print(`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${this.currentIface}, changed state to down`, 'text-slate-500');
        },

        cmdCopyRunStart() {
            this.startupConfig = JSON.parse(JSON.stringify({
                hostname: this.hostname, interfaces: this.interfaces,
                routes: this.routes, motd: this.motd, enableSecret: this.enableSecret,
            }));
            this.print('Destination filename [startup-config]? ', 'text-slate-500');
            this.print('Building configuration...', 'text-slate-500');
            this.print('[OK]', 'text-green-400');
        },

        cmdReload() {
            this.print('Proceed with reload? [confirm]', 'text-slate-500');
            setTimeout(() => {
                this.output      = [];
                this.hostname    = 'Router';
                this.mode        = 'user';
                this.currentIface = null;
                this.enableSecret = '';
                this.awaitingPassword = false;
                this.startupConfig = null;
                this.interfaces  = {
                    'GigabitEthernet0/0': { ip: '', mask: '', description: '', adminState: 'down', lineProtocol: 'down', clockRate: null, duplex: 'auto', speed: 'auto' },
                    'GigabitEthernet0/1': { ip: '', mask: '', description: '', adminState: 'down', lineProtocol: 'down', clockRate: null, duplex: 'auto', speed: 'auto' },
                    'GigabitEthernet0/2': { ip: '', mask: '', description: '', adminState: 'down', lineProtocol: 'down', clockRate: null, duplex: 'auto', speed: 'auto' },
                };
                this.routes      = [];
                this.motd        = '';
                this.history     = [];
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
                    if (iface.ip && iface.mask && iface.adminState === 'up' && this.isInSubnet(target, iface.ip, iface.mask)) {
                        reachable = true; break;
                    }
                }
            }
            if (!reachable) reachable = this.routes.some(r => r.nexthop === target);
            this.print(reachable ? '!!!!!' : '.....', reachable ? 'text-green-400' : 'text-red-400');
            this.print(
                `Success rate is ${reachable ? 100 : 0} percent (${reachable ? '5/5' : '0/5'}), round-trip min/avg/max = 1/2/4 ms`,
                'text-slate-500'
            );
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
            const filter  = args.length ? this.resolveInterface(args.join(' ')) : null;
            const entries = filter
                ? (this.interfaces[filter] ? [[filter, this.interfaces[filter]]] : [])
                : Object.entries(this.interfaces);
            if (filter && !this.interfaces[filter]) { this.printError('% Invalid interface'); return; }
            for (const [name, iface] of entries) {
                const updown = iface.adminState === 'up' ? 'up' : 'administratively down';
                const proto  = iface.lineProtocol === 'up' ? 'up' : 'down';
                this.print(`${name} is ${updown}, line protocol is ${proto}`, 'text-slate-300');
                this.print('  Hardware is CN Gigabit Ethernet', 'text-slate-400');
                if (iface.description) this.print(`  Description: ${iface.description}`, 'text-slate-400');
                this.print(iface.ip ? `  Internet address is ${iface.ip}/${this.maskToCidr(iface.mask)}` : '  Internet address is not set', 'text-slate-400');
                this.print('  MTU 1500 bytes, BW 1000000 Kbit/sec, DLY 10 usec', 'text-slate-400');
                this.print(`  Duplex: ${iface.duplex}, Speed: ${iface.speed}`, 'text-slate-400');
                this.print('');
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
                    const net  = iface.ip.split('.').slice(0, 3).join('.') + '.0';
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
            this.print('!', 'text-slate-500');
            this.print('version 15.2', 'text-slate-400');
            this.print('!', 'text-slate-500');
            this.print(`hostname ${this.hostname}`, 'text-slate-200');
            this.print('!', 'text-slate-500');
            if (this.enableSecret) { this.print(`enable secret 5 ${this.enableSecret}`, 'text-slate-200'); this.print('!', 'text-slate-500'); }
            if (this.motd)         { this.print(`banner motd ^C${this.motd}^C`, 'text-slate-200'); this.print('!', 'text-slate-500'); }
            for (const [name, iface] of Object.entries(this.interfaces)) {
                this.print(`interface ${name}`, 'text-slate-200');
                if (iface.description) this.print(` description ${iface.description}`, 'text-slate-400');
                this.print(iface.ip ? ` ip address ${iface.ip} ${iface.mask}` : ' no ip address', 'text-slate-400');
                if (iface.duplex !== 'auto')   this.print(` duplex ${iface.duplex}`, 'text-slate-400');
                if (iface.speed !== 'auto')    this.print(` speed ${iface.speed}`, 'text-slate-400');
                if (iface.clockRate)           this.print(` clock rate ${iface.clockRate}`, 'text-slate-400');
                if (iface.adminState === 'down') this.print(' shutdown', 'text-slate-400');
                this.print('!', 'text-slate-500');
            }
            for (const r of this.routes) this.print(`ip route ${r.network} ${r.mask} ${r.nexthop}`, 'text-slate-200');
            if (this.routes.length) this.print('!', 'text-slate-500');
            this.print('end', 'text-slate-200');
            this.print('');
        },

        cmdShowStartupConfig() {
            if (!this.startupConfig) { this.print('startup-config is not present', 'text-slate-400'); return; }
            const sc = this.startupConfig;
            this.print('!', 'text-slate-500');
            this.print(`hostname ${sc.hostname}`, 'text-slate-300');
            this.print('!', 'text-slate-500');
            for (const [name, iface] of Object.entries(sc.interfaces)) {
                this.print(`interface ${name}`, 'text-slate-300');
                this.print(iface.ip ? ` ip address ${iface.ip} ${iface.mask}` : ' no ip address', 'text-slate-400');
                if (iface.adminState === 'down') this.print(' shutdown', 'text-slate-400');
                this.print('!', 'text-slate-500');
            }
            this.print('end', 'text-slate-300');
        },

        cmdHelp() {
            const map = {
                user: [
                    ['enable',  'Turn on privileged commands'],
                    ['ping',    'Send echo messages'],
                    ['show',    'Show running system information'],
                    ['logout',  'Exit from the EXEC'],
                ],
                privileged: [
                    ['configure', 'Enter configuration mode'],
                    ['copy',      'Copy from one file to another'],
                    ['disable',   'Turn off privileged commands'],
                    ['ping',      'Send echo messages'],
                    ['reload',    'Halt and perform a cold restart'],
                    ['show',      'Show running system information'],
                    ['write',     'Write running configuration to memory'],
                ],
                global: [
                    ['banner',    'Define a login banner'],
                    ['enable',    'Modify enable password parameters'],
                    ['end',       'Exit to privileged EXEC mode'],
                    ['exit',      'Exit from configure mode'],
                    ['hostname',  "Set system's network name"],
                    ['interface', 'Select an interface to configure'],
                    ['ip',        'Global IP configuration subcommands'],
                    ['no',        'Negate a command or set its defaults'],
                ],
                interface: [
                    ['clock',       'Configure time-of-day clock'],
                    ['description', 'Interface specific description'],
                    ['duplex',      'Configure duplex operation'],
                    ['end',         'Exit to privileged EXEC mode'],
                    ['exit',        'Exit from interface configuration mode'],
                    ['ip',          'Interface Internet Protocol config commands'],
                    ['no',          'Negate a command or set its defaults'],
                    ['shutdown',    'Shutdown the selected interface'],
                    ['speed',       'Configure speed operation'],
                ],
            };
            this.print('');
            (map[this.mode] || []).forEach(([cmd, desc]) => this.print(`  ${cmd.padEnd(20)}${desc}`, 'text-slate-300'));
            this.print('');
        },

        tabComplete() {
            const parts   = this.currentInput.trim().split(/\s+/);
            const prefix  = (parts[parts.length - 1] || '').toLowerCase();
            const matches = this.getValidCommandList().filter(c => c.startsWith(prefix));
            if (matches.length === 1) {
                parts[parts.length - 1] = matches[0];
                this.currentInput = parts.join(' ') + ' ';
            } else if (matches.length > 1) {
                this.print(matches.join('  '), 'text-slate-400');
            }
        },

        toggleTooltip(ifaceName) {
            this.showTooltip = this.showTooltip === ifaceName ? null : ifaceName;
        },

        // ── Utilities ──────────────────────────────────────────────────

        resolveInterface(input) {
            const n = input.toLowerCase().replace(/\s+/g, '');
            if (/^g(e|i|ig|iga|igab|igabi|igabit|igabite|igabiteth|igabitether|igabitethe|igabitethern|igabitetherne|igabitethernet)?0\/0$/.test(n)) return 'GigabitEthernet0/0';
            if (/^g(e|i|ig|iga|igab|igabi|igabit|igabite|igabiteth|igabitether|igabitethe|igabitethern|igabitetherne|igabitethernet)?0\/1$/.test(n)) return 'GigabitEthernet0/1';
            if (/^g(e|i|ig|iga|igab|igabi|igabit|igabite|igabiteth|igabitether|igabitethe|igabitethern|igabitetherne|igabitethernet)?0\/2$/.test(n)) return 'GigabitEthernet0/2';
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
            this.output.push({ text: text === '' ? ' ' : text, cls });
        },

        printError(text) { this.print(text, 'text-red-400'); },

        scrollBottom() {
            this.$nextTick(() => {
                const el = this.$refs.terminal;
                if (el) el.scrollTop = el.scrollHeight;
            });
        },
    };
}
