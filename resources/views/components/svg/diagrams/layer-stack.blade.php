@props(['content' => []])

<div class="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
    <div class="space-y-1.5">
        @foreach ($content['layers'] as $layer)
            <div class="flex items-stretch gap-2">
                <div class="flex w-44 shrink-0 items-center rounded-md px-3 py-2 text-sm font-semibold"
                     style="background-color: rgb(29 78 216 / 0.18);">
                    <span class="text-amber-300">
                        L{{ $layer['level'] }} · {{ $layer['label'] }}
                    </span>
                </div>
                <div class="min-w-0 flex-1 rounded-md border border-stone-800 bg-stone-900 px-3 py-2">
                    <div class="text-xs font-medium text-stone-300">{{ $layer['protocols'] }}</div>
                    <div class="text-xs text-stone-500">{{ $layer['role'] }}</div>
                </div>
            </div>
        @endforeach
    </div>
</div>
