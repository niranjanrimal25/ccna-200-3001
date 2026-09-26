@extends('layouts.app')

@section('title', 'Cisco Commands')

@section('content')
    <div x-data="commandReference(@js($allHaystacks))">
        {{-- Header --}}
        <header class="mb-6">
            <div class="text-xs font-semibold uppercase tracking-wider text-teal-400">Reference</div>
            <h1 class="mt-1 text-3xl font-bold text-zinc-100">Cisco Commands</h1>
            <p class="mt-2 text-sm leading-relaxed text-zinc-400">
                Every command used across the {{ count($days) }} lessons, organised by topic, plus the other
                commands you are expected to know for each one. {{ $total }} commands in total.
            </p>
        </header>

        {{-- Search --}}
        <div class="sticky top-0 z-20 -mx-5 mb-5 border-b border-zinc-900 bg-zinc-950/95 px-5 py-3 backdrop-blur">
            <div class="relative">
                <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-600">⌕</span>
                <input type="search"
                       x-model="q"
                       placeholder="Search commands, syntax or description…"
                       class="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-24 text-sm text-zinc-200 placeholder-zinc-600 focus:border-teal-600 focus:outline-none">
                <button type="button" x-show="q" x-cloak @click="q = ''"
                        class="absolute inset-y-0 right-3 my-auto h-6 rounded px-2 text-xs text-zinc-500 hover:text-zinc-300">
                    Clear
                </button>
            </div>

            {{-- Topic jump links --}}
            <div class="mt-3 flex flex-wrap gap-1.5" x-show="!q" x-cloak>
                @foreach ($topicBlocks as $block)
                    <a href="#topic-{{ $block['topic']->slug }}"
                       class="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-400 transition hover:border-teal-700 hover:text-teal-300">
                        {{ $block['topic']->title }}
                        <span class="ml-1 text-zinc-600">{{ $block['count'] }}</span>
                    </a>
                @endforeach
            </div>
        </div>

        {{-- No results --}}
        <div x-show="q && visible === 0" x-cloak class="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center">
            <p class="text-sm text-zinc-400">No commands match “<span class="text-zinc-200" x-text="q"></span>”.</p>
        </div>

        {{-- Topics --}}
        <div class="space-y-4">
            @foreach ($topicBlocks as $block)
                <section id="topic-{{ $block['topic']->slug }}"
                         x-data="{ open: true }"
                         x-show="matches(@js($block['haystack']))"
                         class="scroll-mt-32 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">

                    {{-- Topic header --}}
                    <button type="button" @click="open = !open"
                            class="flex w-full items-center justify-between gap-3 bg-zinc-900 px-4 py-3 text-left transition hover:bg-zinc-800/70">
                        <div class="min-w-0">
                            <h2 class="truncate text-base font-semibold text-zinc-100">{{ $block['topic']->title }}</h2>
                            <div class="mt-0.5 text-xs text-zinc-500">
                                {{ $block['count'] }} {{ \Illuminate\Support\Str::plural('command', $block['count']) }}
                                @if ($block['extra_count'] > 0)
                                    · {{ $block['extra_count'] }} beyond the lessons
                                @endif
                            </div>
                        </div>
                        <span class="shrink-0 text-zinc-500 transition-transform" :class="open && 'rotate-90'">▸</span>
                    </button>

                    <div x-show="open || q">
                        <div class="space-y-5 px-4 py-4">
                            @foreach ($block['groups'] as $groupLabel => $groupCommands)
                                @php $groupHaystack = mb_strtolower($groupLabel) . ' ' . implode(' ', array_column($groupCommands, 'haystack')); @endphp
                                <div x-show="matches(@js($groupHaystack))">
                                    <div class="mb-2.5 flex items-center gap-3">
                                        <h3 class="text-xs font-semibold uppercase tracking-wider text-teal-400">{{ $groupLabel }}</h3>
                                        <div class="h-px flex-1 bg-zinc-800"></div>
                                    </div>

                                    <div class="space-y-2.5">
                                        @foreach ($groupCommands as $cmd)
                                            @php $cmdId = $block['topic']->slug . '-' . $loop->parent->index . '-' . $loop->index; @endphp

                                            <article x-show="matches(@js($cmd['haystack']))"
                                                     x-data="{ show: false }"
                                                     class="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50">

                                                {{-- Row: command + badges --}}
                                                {{-- A div, not a button: the day badges below are links,
                                                     and a link inside a button is invalid HTML. --}}
                                                <div role="button" tabindex="0"
                                                     @click="show = !show"
                                                     @keydown.enter.prevent="show = !show"
                                                     @keydown.space.prevent="show = !show"
                                                     :aria-expanded="show"
                                                     class="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5 text-left transition hover:bg-zinc-800/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-600">
                                                    <code class="font-mono text-sm font-semibold text-teal-300">{{ $cmd['command'] }}</code>

                                                    @if (! empty($cmd['mode']))
                                                        <span class="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                                                            {{ $cmd['mode'] }}
                                                        </span>
                                                    @endif

                                                    <span class="ml-auto flex shrink-0 items-center gap-1.5">
                                                        @foreach ($cmd['days'] as $dayNumber => $dayLesson)
                                                            <a href="{{ route('lessons.show', [$block['topic'], $dayLesson]) }}"
                                                               @click.stop
                                                               title="{{ $dayLesson->title }}"
                                                               class="rounded border border-zinc-700 bg-zinc-800/60 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 transition hover:border-teal-600 hover:text-teal-300">
                                                                D{{ $dayNumber }}
                                                            </a>
                                                        @endforeach

                                                        @if ($cmd['extra'])
                                                            <span title="Important command not covered by a lesson yet"
                                                                  class="rounded border border-amber-800/60 bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
                                                                EXTRA
                                                            </span>
                                                        @endif

                                                        <span class="text-zinc-600 transition-transform" :class="show && 'rotate-90'">▸</span>
                                                    </span>
                                                </div>

                                                {{-- Detail --}}
                                                <div x-show="show">
                                                    <div class="space-y-3 border-t border-zinc-800 px-3.5 py-3">
                                                        @if (! empty($cmd['description']))
                                                            <p class="text-sm leading-relaxed text-zinc-300">{{ $cmd['description'] }}</p>
                                                        @endif

                                                        @if (! empty($cmd['syntax']))
                                                            <div>
                                                                <div class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Syntax</div>
                                                                <pre class="overflow-x-auto rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-[12.5px] leading-relaxed text-zinc-300"><code>{{ $cmd['syntax'] }}</code></pre>
                                                            </div>
                                                        @endif

                                                        @if (! empty($cmd['example']))
                                                            <div>
                                                                <div class="mb-1 flex items-center justify-between">
                                                                    <div class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Example</div>
                                                                    <button type="button"
                                                                            class="text-[10px] font-medium text-zinc-500 transition hover:text-teal-400"
                                                                            @click="copy($refs.ex{{ $loop->index }}, '{{ $cmdId }}')">
                                                                        <span x-show="copied !== '{{ $cmdId }}'">Copy</span>
                                                                        <span x-show="copied === '{{ $cmdId }}'" x-cloak class="text-teal-400">Copied</span>
                                                                    </button>
                                                                </div>
                                                                <pre x-ref="ex{{ $loop->index }}"
                                                                     class="overflow-x-auto rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-[12.5px] leading-relaxed text-emerald-300"><code>{{ $cmd['example'] }}</code></pre>
                                                            </div>
                                                        @endif

                                                        @if (! empty($cmd['note']))
                                                            <p class="border-l-2 border-zinc-700 pl-3 text-xs leading-relaxed text-zinc-500">{{ $cmd['note'] }}</p>
                                                        @endif
                                                    </div>
                                                </div>
                                            </article>
                                        @endforeach
                                    </div>
                                </div>
                            @endforeach
                        </div>
                    </div>
                </section>
            @endforeach
        </div>

        <p class="mt-8 text-xs leading-relaxed text-zinc-600">
            Commands marked <span class="text-amber-600">EXTRA</span> are not taught in a lesson yet but are
            important for the topic. A <span class="text-zinc-400">D-number</span> links to the lesson the
            command is taught in.
        </p>
    </div>
@endsection
