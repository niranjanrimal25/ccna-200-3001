@props(['content' => []])

<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
    <div class="flex flex-col items-center gap-2 sm:flex-row sm:items-stretch sm:justify-center sm:gap-0">
        @foreach ($content['modes'] as $i => $mode)
            <div class="w-52 rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
                <div class="text-sm font-semibold text-zinc-100">{{ $mode['label'] }}</div>
                <div class="mt-1 font-mono text-sm text-teal-300">{{ $mode['prompt'] }}</div>
                @if (! empty($mode['command']))
                    <div class="mt-2 text-xs text-zinc-500">
                        enter: <span class="font-mono text-zinc-300">{{ $mode['command'] }}</span>
                    </div>
                @endif
            </div>
            @if ($i < count($content['modes']) - 1)
                <div class="flex items-center px-2 text-zinc-500">
                    <span class="text-lg">→</span>
                </div>
            @endif
        @endforeach
    </div>
    @if (! empty($content['note']))
        <p class="mt-3 text-center text-xs text-zinc-500">{{ $content['note'] }}</p>
    @endif
</div>
