@props(['section' => null, 'content' => []])

@php
    $style = $content['style'] ?? 'note';
    $styles = [
        'note' => 'border-zinc-600/60 bg-zinc-900/40 text-zinc-200',
        'warning' => 'border-amber-700/50 bg-amber-950/40 text-amber-200',
        'exam_tip' => 'border-emerald-700/50 bg-emerald-950/40 text-emerald-200',
    ];
    $labels = [
        'note' => 'Note',
        'warning' => 'Warning',
        'exam_tip' => 'Exam tip',
    ];
@endphp

<div class="rounded-r-xl border-l-4 px-4 py-3 {{ $styles[$style] }}">
    <div class="text-xs font-semibold uppercase tracking-wider opacity-70">{{ $labels[$style] }}</div>
    <div class="mt-1 text-sm leading-relaxed">{{ $content['body'] ?? '' }}</div>
</div>
