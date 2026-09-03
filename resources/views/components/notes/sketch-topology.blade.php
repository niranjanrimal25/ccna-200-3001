@php
    $nodes = $content['nodes'] ?? [];
    $links = $content['links'] ?? [];

    $vbWidth  = count($nodes) ? max(800, max(array_column($nodes, 'x')) + 120) : 800;
    $vbHeight = count($nodes) ? max(300, max(array_column($nodes, 'y')) + 140) : 360;

    $nodeById = collect($nodes)->keyBy('id');
    $ink = '#1b2a52';
@endphp

<div class="notes-sketch">
    <svg viewBox="0 0 {{ $vbWidth }} {{ $vbHeight }}" class="notes-sketch-svg" role="img">
        {{-- Ruled sketch background --}}
        <rect width="100%" height="100%" fill="#fffdf5"/>
        @for ($y = 24; $y < $vbHeight; $y += 24)
            <line x1="0" y1="{{ $y }}" x2="{{ $vbWidth }}" y2="{{ $y }}" stroke="#c8d6e8" stroke-width="1"/>
        @endfor

        {{-- Links --}}
        @foreach ($links as $link)
            @php
                $from = $nodeById[$link['from']] ?? null;
                $to   = $nodeById[$link['to']] ?? null;
                if (! $from || ! $to) { continue; }
                $kind = $link['kind'] ?? 'ethernet';
                $stroke = $kind === 'wan' ? '#b3541e' : '#1b2a52';
                $dash = $kind === 'wan' ? '6 4' : '';
            @endphp
            <line x1="{{ $from['x'] }}" y1="{{ $from['y'] }}" x2="{{ $to['x'] }}" y2="{{ $to['y'] }}"
                  stroke="{{ $stroke }}" stroke-width="2" stroke-dasharray="{{ $dash }}" stroke-linecap="round"/>
        @endforeach

        {{-- Nodes --}}
        @foreach ($nodes as $node)
            <g transform="translate({{ $node['x'] }}, {{ $node['y'] }})">
                <rect x="-46" y="-20" width="92" height="40" rx="8"
                      fill="#fffdf5" stroke="{{ $ink }}" stroke-width="2"/>
                <circle cx="0" cy="-20" r="3" fill="#1b2a52"/>
                <text text-anchor="middle" y="4" font-family="'Caveat', cursive" font-size="18"
                      font-weight="700" fill="{{ $ink }}">{{ $node['label'] }}</text>
            </g>
        @endforeach
    </svg>
</div>
