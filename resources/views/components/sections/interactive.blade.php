@props(['section' => null, 'content' => []])

<div class="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-4 text-center">
    <p class="text-sm text-zinc-500">
        Interactive widget <span class="font-mono text-zinc-400">{{ $content['widget'] ?? 'unknown' }}</span>
        is planned but not yet built for this section.
    </p>
</div>
