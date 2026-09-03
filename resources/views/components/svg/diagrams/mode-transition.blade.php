@props(['content' => []])

<div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
    <div class="flex flex-col items-center gap-2 sm:flex-row sm:items-stretch sm:justify-center sm:gap-0">
        @foreach ($content['modes'] as $i => $mode)
            <div class="w-52 rounded-lg border border-slate-700 bg-slate-900 p-3 text-center">
                <div class="text-sm font-semibold text-slate-100">{{ $mode['label'] }}</div>
                <div class="mt-1 font-mono text-sm text-blue-300">{{ $mode['prompt'] }}</div>
                @if (! empty($mode['command']))
                    <div class="mt-2 text-xs text-slate-500">
                        enter: <span class="font-mono text-slate-300">{{ $mode['command'] }}</span>
                    </div>
                @endif
            </div>
            @if ($i < count($content['modes']) - 1)
                <div class="flex items-center px-2 text-slate-500">
                    <span class="text-lg">→</span>
                </div>
            @endif
        @endforeach
    </div>
    @if (! empty($content['note']))
        <p class="mt-3 text-center text-xs text-slate-500">{{ $content['note'] }}</p>
    @endif
</div>
