@props(['content' => []])

@php
    // Parse byte count from length string e.g. "7 bytes" → 7, "1 byte" → 1
    $parseBytes = fn(string $len): int => (int) $len;
    $total = array_sum(array_map(fn($f) => $parseBytes($f['length']), $content['fields']));
    $total = max($total, 1);
@endphp

<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
    <div class="overflow-x-auto rounded-md">
        <div class="flex min-w-[600px]">
            @foreach ($content['fields'] as $field)
                @php
                    $bytes = $parseBytes($field['length']);
                    $pct   = round($bytes / $total * 100, 2);
                    $isTrailer = in_array($field['name'], ['FCS', 'Trailer']);
                @endphp
                <div class="shrink-0 border border-zinc-700 p-3 text-center"
                     style="width: {{ $pct }}%; min-width: {{ max(64, $bytes * 14) }}px;">
                    <div class="text-xs font-semibold text-zinc-200">{{ $field['name'] }}</div>
                    <div class="mt-1 text-[10px] text-zinc-500">{{ $field['length'] }}</div>
                    @if (!empty($field['purpose']))
                        <div class="mt-1 text-[10px] leading-snug text-zinc-500">{{ $field['purpose'] }}</div>
                    @endif
                    @if ($isTrailer)
                        <div class="mt-1 text-[9px] uppercase tracking-wide text-teal-600">trailer</div>
                    @endif
                </div>
            @endforeach
        </div>
    </div>
    @if (! empty($content['note']))
        <p class="mt-3 text-xs text-zinc-500">{{ $content['note'] }}</p>
    @endif
</div>
