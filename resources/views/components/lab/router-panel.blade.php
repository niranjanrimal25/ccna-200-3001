@php
    $ports = [
        ['key' => 'GigabitEthernet0/0', 'short' => 'G0/0', 'x' => 215],
        ['key' => 'GigabitEthernet0/1', 'short' => 'G0/1', 'x' => 310],
        ['key' => 'GigabitEthernet0/2', 'short' => 'G0/2', 'x' => 405],
    ];
@endphp

<div class="relative select-none" @click.away="showTooltip = null">
    <svg viewBox="0 0 900 120" class="w-full h-auto" style="max-height:150px; background:#111111; display:block;">

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
        <circle cx="22" cy="38" r="9" fill="#22c55e" fill-opacity="0.12"/>
        <text x="42" y="26" font-size="7" fill="#4b5563" font-family="monospace" text-anchor="middle">SYS</text>
        <circle cx="42" cy="38" r="5" fill="#22c55e"/>
        <text x="62" y="26" font-size="7" fill="#4b5563" font-family="monospace" text-anchor="middle">ACT</text>
        <circle cx="62" cy="38" r="5" fill="#f59e0b"/>

        {{-- NM Slot --}}
        <rect x="82" y="14" width="118" height="92" rx="2" fill="#111" stroke="#2a2a2a" stroke-width="0.8"/>
        <rect x="86" y="18" width="110" height="3" rx="1" fill="#1f1f1f"/>
        <rect x="86" y="85" width="110" height="3" rx="1" fill="#1f1f1f"/>
        <text x="141" y="56" text-anchor="middle" font-size="7" fill="#2d2d2d" font-family="monospace">NM SLOT 0</text>
        <text x="141" y="66" text-anchor="middle" font-size="6" fill="#242424" font-family="monospace">[ EMPTY ]</text>

        {{-- GigabitEthernet Ports --}}
        @foreach ($ports as $port)
            <g @click="toggleTooltip('{{ $port['key'] }}')" style="cursor:pointer">
                {{-- Long label above --}}
                <text x="{{ $port['x'] + 25 }}" y="17" text-anchor="middle" font-size="6" fill="#4b5563" font-family="monospace">{{ $port['key'] }}</text>
                {{-- Port housing --}}
                <rect x="{{ $port['x'] }}" y="20" width="50" height="46" rx="3" fill="#0a0a0a" stroke="#2e2e2e" stroke-width="0.8"/>
                {{-- RJ-45 socket opening --}}
                <rect x="{{ $port['x'] + 7 }}" y="27" width="36" height="24" rx="1" fill="#050505" stroke="#1a1a1a" stroke-width="0.5"/>
                {{-- RJ-45 retainer tab --}}
                <rect x="{{ $port['x'] + 9 }}" y="29" width="32" height="2.5" rx="0.5" fill="#111"/>
                {{-- Link LED — green when adminState=up, grey when down --}}
                <circle cx="{{ $port['x'] + 40 }}" cy="24" r="3.5"
                    :fill="interfaces['{{ $port['key'] }}'].adminState === 'up' ? '#22c55e' : '#2d2d2d'"/>
                <circle cx="{{ $port['x'] + 40 }}" cy="24" r="7"
                    :fill="interfaces['{{ $port['key'] }}'].adminState === 'up' ? '#22c55e' : 'none'"
                    :fill-opacity="interfaces['{{ $port['key'] }}'].adminState === 'up' ? '0.15' : '0'"/>
                {{-- Activity LED --}}
                <circle cx="{{ $port['x'] + 47 }}" cy="24" r="3.5" fill="#2d2d2d"/>
                {{-- Short label below --}}
                <text x="{{ $port['x'] + 25 }}" y="76" text-anchor="middle" font-size="8.5" fill="#9ca3af" font-family="monospace">{{ $port['short'] }}</text>
            </g>
        @endforeach

        {{-- Console port (light blue — Cisco convention) --}}
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
        <text x="790" y="56" text-anchor="middle" font-size="20" fill="#049fd4"
              font-family="Arial,Helvetica,sans-serif" font-weight="bold" letter-spacing="1">CISCO</text>
        <text x="790" y="71" text-anchor="middle" font-size="11" fill="#6b7280"
              font-family="Arial,Helvetica,sans-serif">2911</text>
        <text x="790" y="81" text-anchor="middle" font-size="5.5" fill="#374151"
              font-family="Arial,Helvetica,sans-serif" letter-spacing="0.5">INTEGRATED SERVICES ROUTER</text>

    </svg>

    {{-- Port tooltips (positioned below each port) --}}
    @foreach ($ports as $port)
        <div x-show="showTooltip === '{{ $port['key'] }}'"
             x-transition:enter="transition ease-out duration-100"
             x-transition:enter-start="opacity-0 scale-95"
             x-transition:enter-end="opacity-100 scale-100"
             class="absolute z-20 w-56 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs shadow-2xl"
             style="left: {{ ($port['x'] + 25) / 900 * 100 }}%; top: 100%; transform: translateX(-50%); margin-top: 4px;">
            <div class="mb-2 font-semibold text-slate-100">{{ $port['key'] }}</div>
            <div class="space-y-1 font-mono">
                <div class="flex justify-between gap-2">
                    <span class="text-slate-500">IP</span>
                    <span class="text-slate-200"
                          x-text="interfaces['{{ $port['key'] }}'].ip
                              ? interfaces['{{ $port['key'] }}'].ip + ' / ' + interfaces['{{ $port['key'] }}'].mask
                              : 'unassigned'">
                    </span>
                </div>
                <div class="flex justify-between gap-2">
                    <span class="text-slate-500">Status</span>
                    <span :class="interfaces['{{ $port['key'] }}'].adminState === 'up' ? 'text-green-400' : 'text-red-400'"
                          x-text="interfaces['{{ $port['key'] }}'].adminState === 'up' ? 'up / up' : 'admin down / down'">
                    </span>
                </div>
                <div x-show="interfaces['{{ $port['key'] }}'].description" class="flex justify-between gap-2">
                    <span class="text-slate-500">Desc</span>
                    <span class="text-slate-200 truncate"
                          x-text="interfaces['{{ $port['key'] }}'].description">
                    </span>
                </div>
            </div>
        </div>
    @endforeach
</div>
