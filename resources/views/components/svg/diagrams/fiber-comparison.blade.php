@props(['content' => []])

<div class="space-y-4">
    @foreach ($content['modes'] as $mode)
        <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div class="flex items-center gap-4">
                <div class="shrink-0 w-40">
                    <div class="text-sm font-semibold text-slate-100">{{ $mode['label'] }}</div>
                </div>
                <svg viewBox="0 0 120 24" class="h-12 w-32 text-sky-300" role="img" aria-label="{{ $mode['label'] }} core">
                    <rect x="4" y="12" width="{{ $mode['core_width'] }}" height="5" rx="2" fill="currentColor" fill-opacity="0.4"/>
                    <rect x="0" y="9" width="120" height="11" rx="2" stroke="currentColor" stroke-width="1" fill="none"/>
                    @if ($mode['id'] === 'multimode')
                        <path d="M8 12 L26 12 M8 12 L22 5 M8 12 L22 19 M8 12 L26 17" stroke="currentColor" stroke-width="1" opacity="0.7" fill="none"/>
                    @else
                        <path d="M8 12 L30 12" stroke="currentColor" stroke-width="1" opacity="0.9" fill="none"/>
                        <circle cx="3" cy="14.5" r="2" fill="none" stroke="currentColor" stroke-width="1"/>
                    @endif
                </svg>
            </div>
            <p class="mt-2 text-sm text-slate-400">{{ $mode['description'] }}</p>
        </div>
    @endforeach
</div>
