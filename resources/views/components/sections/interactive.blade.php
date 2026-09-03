@props(['section' => null, 'content' => []])

<div class="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-4 text-center">
    <p class="text-sm text-slate-500">
        Interactive widget <span class="font-mono text-slate-400">{{ $content['widget'] ?? 'unknown' }}</span>
        is planned but not yet built for this section.
    </p>
</div>
