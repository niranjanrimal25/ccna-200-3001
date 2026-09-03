@props(['section' => null, 'content' => []])

@php
    $diagramType = $content['diagram_type'] ?? 'topology';
    $steps = $content['steps'] ?? [];
@endphp

@if ($diagramType === 'encapsulation')
    <div x-data="encapsulationAnimation(@js($steps))" class="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <div class="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <button @click="prev()" :disabled="step === 0" class="rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40">← Back</button>
            <span class="text-sm text-slate-400">
                <span x-text="progress"></span> / <span x-text="total"></span>
            </span>
            <button @click="next()" :disabled="step === steps.length - 1" class="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-40">Next →</button>
        </div>

        <div class="p-6">
            <div class="flex flex-col items-center gap-3">
                <div class="w-full max-w-xl space-y-2 font-mono text-sm">
                    <div class="flex" x-show="state === 'app'">
                        <span class="w-28 shrink-0 rounded-l-md bg-slate-800 px-3 py-2 text-slate-400">data</span>
                        <span class="flex-1 rounded-r-md bg-sky-900/40 px-3 py-2 text-sky-200">HTTP request payload</span>
                    </div>
                    <div class="flex" x-show="['transport','internet','local-network','physical'].includes(state)">
                        <span class="w-28 shrink-0 rounded-l-md bg-slate-800 px-3 py-2 text-slate-400">L4 header</span>
                        <span class="flex-1 rounded-r-md bg-sky-900/40 px-3 py-2 text-sky-200">segment / datagram</span>
                    </div>
                    <div class="flex" x-show="['internet','local-network','physical'].includes(state)">
                        <span class="w-28 shrink-0 rounded-l-md bg-slate-800 px-3 py-2 text-slate-400">L3 header</span>
                        <span class="flex-1 rounded-r-md bg-sky-900/40 px-3 py-2 text-sky-200">packet</span>
                    </div>
                    <div class="flex" x-show="['local-network','physical'].includes(state)">
                        <span class="w-28 shrink-0 rounded-l-md bg-slate-800 px-3 py-2 text-slate-400">L2 header</span>
                        <span class="flex-1 rounded-r-md bg-sky-900/40 px-3 py-2 text-sky-200">frame</span>
                        <span class="w-28 shrink-0 rounded-r-md bg-slate-800 px-3 py-2 text-slate-400">L2 trailer</span>
                    </div>
                    <div class="flex" x-show="state === 'physical'">
                        <div class="w-full rounded-md border border-dashed border-amber-700 px-3 py-2 text-center text-amber-300">bits sent as electrical / optical / radio signals</div>
                    </div>
                </div>
            </div>
            <p class="mt-4 text-sm text-slate-400" x-text="steps[step].narration"></p>
        </div>
    </div>
@elseif ($diagramType === 'cli_walkthrough')
    <div x-data="cliAnimation(@js($steps))" class="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
        <div class="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2">
            <span class="h-3 w-3 rounded-full bg-red-500/80"></span>
            <span class="h-3 w-3 rounded-full bg-yellow-500/80"></span>
            <span class="h-3 w-3 rounded-full bg-green-500/80"></span>
            <span class="ml-2 text-xs text-slate-500">Cisco IOS CLI</span>
            <div class="ml-auto flex gap-2">
                <button @click="prev()" :disabled="step === 0" class="rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40">← Back</button>
                <button @click="next()" :disabled="step === steps.length - 1" class="rounded-md bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-40">Next →</button>
            </div>
        </div>
        <div class="p-4 font-mono text-sm leading-relaxed">
            <template x-for="(line, i) in lines()" :key="i">
                <div>
                    <span class="text-emerald-400" x-text="line.command"></span>
                    <span class="text-slate-100" x-text="line.input ? ' ' + line.input : ''"></span>
                    <span x-show="i === step" class="inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-slate-200"></span>
                </div>
            </template>
        </div>
        <div class="border-t border-slate-800 px-4 py-3 text-sm text-slate-400" x-text="steps[step].narration"></div>
    </div>
@else
    @php
        $nodes = $content['nodes'] ?? [];
        $links = $content['links'] ?? [];
        $steps = $content['steps'] ?? [];
        $nodeById = collect($nodes)->keyBy('id');

        $vbWidth  = count($nodes) ? max(1000, max(array_column($nodes, 'x')) + 100) : 1000;
        $vbHeight = count($nodes) ? max(320,  max(array_column($nodes, 'y')) + 120) : 420;

        $statusColor = fn ($status) => $status === 'fail' ? '#ef4444' : ($status === 'ok' ? '#22c55e' : '#3b82f6');
        $packetSlots = [];
        foreach ($steps as $i => $step) {
            $a = $step['animate'] ?? [];
            if (!empty($a['flood'])) {
                $source = $a['packet_from'] ?? null;
                $srcNode = $source ? ($nodeById[$source] ?? null) : null;
                if ($srcNode) {
                    foreach ($nodes as $n) {
                        if ($n['id'] !== $source) {
                            $packetSlots[$i][] = [
                                'from' => $srcNode, 'to' => $n,
                                'label' => $a['label'] ?? 'flood',
                                'color' => $statusColor($a['status'] ?? ''),
                            ];
                        }
                    }
                }
            } elseif (!empty($a['packet_from']) && !empty($a['packet_to'])) {
                $from = $nodeById[$a['packet_from']] ?? null;
                $to = $nodeById[$a['packet_to']] ?? null;
                if ($from && $to) {
                    $packetSlots[$i][] = [
                        'from' => $from, 'to' => $to,
                        'label' => $a['label'] ?? '',
                        'color' => $statusColor($a['status'] ?? ''),
                    ];
                }
            }
        }
    @endphp

    <div x-data="topologyAnimation(@js($content))" class="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <div class="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <button @click="prev()" :disabled="step === 0" class="rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40">← Back</button>
            <span class="text-sm text-slate-400">
                <span x-text="step + 1"></span> / <span x-text="steps.length"></span>
            </span>
            <button @click="next()" :disabled="step === steps.length - 1" class="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-40">Next →</button>
        </div>

        <div class="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div class="p-4">
                <svg viewBox="0 0 {{ $vbWidth }} {{ $vbHeight }}" class="w-full h-auto select-none" role="img">
                    <defs>
                        <pattern id="anim-dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="1" cy="1" r="1" fill="#1e293b"/>
                        </pattern>
                    </defs>

                    {{-- Dot-grid canvas background --}}
                    <rect width="{{ $vbWidth }}" height="{{ $vbHeight }}" fill="url(#anim-dot-grid)"/>

                    {{-- Bezier cables, color-coded by kind --}}
                    <g>
                        @foreach ($links as $link)
                            @php
                                $from = $nodeById[$link['from']] ?? null;
                                $to   = $nodeById[$link['to']] ?? null;
                                if (! $from || ! $to) { continue; }
                                $kind   = $link['kind'] ?? 'ethernet';
                                $isVert = abs($to['y'] - $from['y']) > abs($to['x'] - $from['x']);
                                $cp1x   = $isVert ? $from['x'] + 60 : $from['x'];
                                $cp1y   = $isVert ? $from['y']      : $from['y'] + 60;
                                $cp2x   = $isVert ? $to['x'] + 60   : $to['x'];
                                $cp2y   = $isVert ? $to['y']        : $to['y'] + 60;
                                $stroke = ['ethernet' => '#22c55e', 'wan' => '#f59e0b', 'crossover' => '#f97316'][$kind] ?? '#22c55e';
                                $dash   = $kind === 'wan' ? '8 4' : '';
                            @endphp
                            <path d="M {{ $from['x'] }} {{ $from['y'] }} C {{ $cp1x }} {{ $cp1y }} {{ $cp2x }} {{ $cp2y }} {{ $to['x'] }} {{ $to['y'] }}"
                                  fill="none" stroke="{{ $stroke }}" stroke-width="2"
                                  stroke-opacity="0.7" stroke-dasharray="{{ $dash }}"/>
                        @endforeach
                    </g>

                    <g class="text-slate-500">
                        @foreach ($nodes as $n)
                            <g transform="translate({{ $n['x'] }} {{ $n['y'] }})">
                                <rect x="-40" y="-34" width="80" height="56" rx="6" fill="none"
                                      :class="isHighlighted('{{ $n['id'] }}') ? 'stroke-blue-400' : 'stroke-transparent'"
                                      :stroke-width="isHighlighted('{{ $n['id'] }}') ? 2.5 : 0"
                                      :stroke-dasharray="isHighlighted('{{ $n['id'] }}') ? '5 3' : ''" />
                                <g transform="translate(-32, -24)">
                                    <use href="#dev-{{ $n['icon'] ?? 'pc' }}" width="64" height="48" />
                                </g>
                                {{-- Status LED: glow halo + solid dot --}}
                                <circle cx="30" cy="-28" r="4" fill="#22c55e" fill-opacity="0.2"/>
                                <circle cx="30" cy="-28" r="2" fill="#22c55e"/>
                                <text text-anchor="middle" y="34" class="fill-slate-300 text-[13px] font-medium">{{ $n['label'] }}</text>
                            </g>
                        @endforeach
                    </g>

                    <g class="pointer-events-none">
                        @foreach ($packetSlots as $i => $slots)
                            @foreach ($slots as $j => $p)
                                <g x-show="step === {{ $i }}" :transform="packetTransform({{ $i }}, {{ $j }})">
                                    <circle r="6" fill="{{ $p['color'] }}" />
                                    @if ($p['label'])
                                        <rect x="-28" y="-24" width="56" height="14" rx="7"
                                              fill="#0f172a" stroke="#334155" stroke-width="0.8"/>
                                        <text text-anchor="middle" y="-13" fill="#e2e8f0"
                                              font-size="9" font-family="ui-monospace,monospace">{{ $p['label'] }}</text>
                                    @endif
                                </g>
                            @endforeach
                        @endforeach
                    </g>
                </svg>
            </div>

            @if (collect($steps)->contains(fn ($s) => isset($s['animate']['mac_table_add'])))
                <div class="border-t border-slate-800 p-4 lg:border-l lg:border-t-0">
                    <div class="text-xs font-semibold uppercase tracking-wider text-slate-500">MAC address table</div>
                    <table class="mt-2 w-full text-xs">
                        <thead>
                            <tr class="text-left text-slate-500">
                                <th class="pb-1 pr-3 font-medium">MAC</th>
                                <th class="pb-1 pr-3 font-medium">Port</th>
                                <th class="pb-1 font-medium">Type</th>
                            </tr>
                        </thead>
                        <tbody class="font-mono">
                            <template x-for="(row, i) in macTable" :key="i">
                                <tr>
                                    <td class="py-0.5 pr-3 text-slate-300" x-text="row.mac"></td>
                                    <td class="py-0.5 pr-3 text-slate-300" x-text="row.port"></td>
                                    <td class="py-0.5 text-emerald-400" x-text="row.type"></td>
                                </tr>
                            </template>
                            <tr x-show="macTable.length === 0">
                                <td colspan="3" class="py-1 text-slate-600">empty</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            @endif
        </div>

        <div class="border-t border-slate-800 px-4 py-3 text-sm text-slate-400" x-text="steps[step].narration"></div>
    </div>
@endif
