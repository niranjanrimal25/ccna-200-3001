@props(['content' => []])

<div class="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
    <div class="flex flex-col items-center gap-2 sm:flex-row sm:items-stretch sm:justify-center sm:gap-0">
        @foreach ($content['modes'] as $i => $mode)
            <div class="w-52 rounded-lg border border-stone-700 bg-stone-900 p-3 text-center">
                <div class="text-sm font-semibold text-stone-100">{{ $mode['label'] }}</div>
                <div class="mt-1 font-mono text-sm text-amber-300">{{ $mode['prompt'] }}</div>
                @if (! empty($mode['command']))
                    <div class="mt-2 text-xs text-stone-500">
                        enter: <span class="font-mono text-stone-300">{{ $mode['command'] }}</span>
                    </div>
                @endif
            </div>
            @if ($i < count($content['modes']) - 1)
                <div class="flex items-center px-2 text-stone-500">
                    <span class="text-lg">→</span>
                </div>
            @endif
        @endforeach
    </div>
    @if (! empty($content['note']))
        <p class="mt-3 text-center text-xs text-stone-500">{{ $content['note'] }}</p>
    @endif
</div>
