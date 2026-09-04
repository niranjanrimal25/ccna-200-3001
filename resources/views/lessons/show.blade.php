@extends('layouts.app')

@section('title', $lesson->title)

@section('content')
    <nav class="text-sm text-stone-500">
        <a href="{{ route('home') }}" class="hover:text-stone-300">Home</a>
        <span class="mx-1">/</span>
        <span>{{ $lesson->topic->domain->title }}</span>
        <span class="mx-1">/</span>
        <span>{{ $lesson->topic->title }}</span>
    </nav>

    <div class="mt-4 flex flex-wrap items-center gap-3">
        <span class="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
            Day {{ $day }}
        </span>
        <span class="text-xs text-stone-500">{{ $lesson->topic->title }}</span>
    </div>

    <h1 class="mt-3 text-3xl font-bold text-stone-100">{{ $lesson->title }}</h1>

    @if ($lesson->summary)
        <p class="mt-3 text-stone-400 leading-relaxed">{{ $lesson->summary }}</p>
    @endif

    @if ($lesson->source_ref)
        <p class="mt-2 text-xs text-stone-600">Source: {{ $lesson->source_ref }}</p>
    @endif

    <div x-data="notesPdf" class="mt-5">
        <button @click="download()" :disabled="busy"
                class="inline-flex items-center gap-2 rounded-md border border-stone-700 bg-stone-900 px-4 py-2 text-sm font-medium text-stone-200 transition-colors hover:border-amber-600 hover:bg-stone-800 disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
            </svg>
            <span x-show="!busy">Download PDF notes</span>
            <span x-show="busy">Preparing notes…</span>
        </button>
        <p class="mt-2 text-xs text-stone-600">Handwritten notebook-style notes with diagrams, tables, and quiz review.</p>
        <p x-show="error" x-cloak class="mt-2 rounded-md border border-rose-900/60 bg-rose-900/20 px-3 py-2 text-xs text-rose-200" x-text="error"></p>
    </div>

    <div class="mt-8 space-y-8">
        @foreach ($lesson->sections as $section)
            <section id="section-{{ $section->id }}" class="scroll-mt-8">
                @if ($section->title)
                    <h2 class="mb-3 text-xl font-semibold text-stone-200">{{ $section->title }}</h2>
                @endif

                @include('components.sections.'.$section->type, ['section' => $section, 'content' => $section->content])
            </section>
        @endforeach
    </div>

    @if ($lesson->quiz && $lesson->quiz->questions->isNotEmpty())
        <div class="mt-12 border-t border-stone-800 pt-8">
            <x-quiz :quiz="$lesson->quiz" />
        </div>
    @endif

    <nav class="mt-12 flex items-center justify-between border-t border-stone-800 pt-6">
        @if ($prev)
            <a href="{{ route('lessons.show', [$prev->topic, $prev]) }}"
               class="rounded-md border border-stone-700 px-4 py-2 text-sm text-stone-300 hover:bg-stone-800">
                ← {{ $prev->title }}
            </a>
        @else
            <span></span>
        @endif

        @if ($next)
            <a href="{{ route('lessons.show', [$next->topic, $next]) }}"
               class="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500">
                {{ $next->title }} →
            </a>
        @endif
    </nav>

    <x-notes.notebook :lesson="$lesson" :day="$day" />
@endsection
