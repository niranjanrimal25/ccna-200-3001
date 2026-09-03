@props([
    'nodes'      => [],
    'links'      => [],
    'highlights' => [],
    'packets'    => [],
    'viewBox'    => '0 0 1000 420',
])

@php
    $highlights = collect($highlights)->map(fn ($id) => (string) $id)->all();
    $nodeMap    = collect($nodes)->keyBy('id');
@endphp

<svg viewBox="{{ $viewBox }}" class="w-full h-auto select-none" role="img">
    <defs>
        <pattern id="topo-dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#1e293b"/>
        </pattern>
    </defs>

    {{-- Dot-grid canvas background --}}
    <rect width="100%" height="100%" fill="url(#topo-dot-grid)"/>

    {{-- Bezier cables --}}
    <g>
        @foreach ($links as $link)
            @php
                $from = $nodeMap[$link['from']] ?? null;
                $to   = $nodeMap[$link['to']] ?? null;
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

    {{-- Device nodes --}}
    <g>
        @foreach ($nodes as $node)
            <g transform="translate({{ $node['x'] }}, {{ $node['y'] }})">
                <rect x="-40" y="-34" width="80" height="56" rx="6" fill="none"
                    @if (in_array((string) $node['id'], $highlights, true))
                        stroke="#60a5fa" stroke-width="2.5" stroke-dasharray="5 3"
                    @else
                        stroke="transparent" stroke-width="0"
                    @endif
                />
                <g transform="translate(-32, -24)">
                    <use href="#dev-{{ $node['icon'] ?? 'pc' }}" width="64" height="48"/>
                </g>
                {{-- Status LED --}}
                <circle cx="30" cy="-28" r="4" fill="#22c55e" fill-opacity="0.2"/>
                <circle cx="30" cy="-28" r="2" fill="#22c55e"/>
                <text text-anchor="middle" y="34" fill="#cbd5e1" font-size="13" font-weight="500">
                    {{ $node['label'] }}
                </text>
            </g>
        @endforeach
    </g>

    {{-- Optional static packets --}}
    @if (count($packets))
        <g class="pointer-events-none">
            @foreach ($packets as $packet)
                <g transform="translate({{ $packet['x'] }}, {{ $packet['y'] }})">
                    <circle r="6" fill="{{ $packet['color'] ?? '#3b82f6' }}"/>
                    @if (! empty($packet['label']))
                        <rect x="-28" y="-24" width="56" height="14" rx="7"
                              fill="#0f172a" stroke="#334155" stroke-width="0.8"/>
                        <text text-anchor="middle" y="-13" fill="#e2e8f0"
                              font-size="9" font-family="ui-monospace,monospace">{{ $packet['label'] }}</text>
                    @endif
                </g>
            @endforeach
        </g>
    @endif
</svg>
