@props(['section' => null, 'content' => []])

@php
    $commands = $content['commands'] ?? [];

    // Preserve JSON order while grouping by the optional `group` key.
    $groups = [];
    foreach ($commands as $cmd) {
        $groups[$cmd['group'] ?? ''][] = $cmd;
    }
@endphp

<div class="space-y-4" x-data="{ copied: null }">
    @if (! empty($content['intro']))
        <p class="text-sm leading-relaxed text-zinc-400">{{ $content['intro'] }}</p>
    @endif

    @foreach ($groups as $groupLabel => $groupCommands)
        @if ($groupLabel !== '')
            <div class="flex items-center gap-3 pt-1">
                <h4 class="text-xs font-semibold uppercase tracking-wider text-teal-400">{{ $groupLabel }}</h4>
                <div class="h-px flex-1 bg-zinc-800"></div>
            </div>
        @endif

        <div class="space-y-3">
            @foreach ($groupCommands as $cmd)
                <div class="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
                    {{-- Header: the command itself + the mode it is entered from --}}
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-2.5">
                        <code class="font-mono text-sm font-semibold text-teal-300">{{ $cmd['command'] }}</code>
                        @if (! empty($cmd['mode']))
                            <span class="rounded-full border border-zinc-700 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                                {{ $cmd['mode'] }}
                            </span>
                        @endif
                    </div>

                    <div class="space-y-3 px-4 py-3">
                        {{-- Overall: what the command is for --}}
                        @if (! empty($cmd['description']))
                            <p class="text-sm leading-relaxed text-zinc-300">{{ $cmd['description'] }}</p>
                        @endif

                        {{-- Syntax --}}
                        @if (! empty($cmd['syntax']))
                            <div>
                                <div class="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Syntax</div>
                                <pre class="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-[13px] leading-relaxed text-zinc-300"><code>{{ $cmd['syntax'] }}</code></pre>
                            </div>
                        @endif

                        {{-- Example --}}
                        @if (! empty($cmd['example']))
                            <div>
                                <div class="mb-1 flex items-center justify-between">
                                    <div class="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Example</div>
                                    <button type="button"
                                            class="text-[11px] font-medium text-zinc-500 transition hover:text-teal-400"
                                            @click="navigator.clipboard.writeText($refs.ex{{ $loop->parent->index }}_{{ $loop->index }}.innerText); copied = '{{ $loop->parent->index }}_{{ $loop->index }}'; setTimeout(() => copied = null, 1200)">
                                        <span x-show="copied !== '{{ $loop->parent->index }}_{{ $loop->index }}'">Copy</span>
                                        <span x-show="copied === '{{ $loop->parent->index }}_{{ $loop->index }}'" x-cloak class="text-teal-400">Copied</span>
                                    </button>
                                </div>
                                <pre x-ref="ex{{ $loop->parent->index }}_{{ $loop->index }}"
                                     class="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-[13px] leading-relaxed text-emerald-300"><code>{{ $cmd['example'] }}</code></pre>
                            </div>
                        @endif

                        {{-- Optional extra note --}}
                        @if (! empty($cmd['note']))
                            <p class="border-l-2 border-zinc-700 pl-3 text-xs leading-relaxed text-zinc-500">{{ $cmd['note'] }}</p>
                        @endif
                    </div>
                </div>
            @endforeach
        </div>
    @endforeach
</div>
