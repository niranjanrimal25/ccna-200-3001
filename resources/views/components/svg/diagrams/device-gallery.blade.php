@props(['content' => []])

<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    @foreach ($content['nodes'] as $node)
        <div class="rounded-xl border border-stone-800 bg-stone-900/60 p-4 text-center">
            <div class="mx-auto flex h-16 items-center justify-center">
                <svg viewBox="0 0 64 48" class="h-14 w-20">
                    <use href="#dev-{{ $node['icon'] ?? 'pc' }}" width="64" height="48"/>
                </svg>
            </div>
            <div class="mt-2 font-medium text-stone-100">{{ $node['label'] }}</div>
            <p class="mt-1 text-sm text-stone-400">{{ $node['description'] }}</p>
        </div>
    @endforeach
</div>
