@extends('layouts.app')

@section('title', $lesson->title)

@section('content')
    <nav class="text-sm text-slate-500">
        <a href="{{ route('home') }}" class="hover:text-slate-300">Home</a>
        <span class="mx-1">/</span>
        <span>{{ $lesson->topic->domain->title }}</span>
        <span class="mx-1">/</span>
        <span>{{ $lesson->topic->title }}</span>
    </nav>

    <h1 class="mt-3 text-3xl font-bold text-slate-100">{{ $lesson->title }}</h1>

    @if ($lesson->summary)
        <p class="mt-3 text-slate-400 leading-relaxed">{{ $lesson->summary }}</p>
    @endif

    @if ($lesson->source_ref)
        <p class="mt-2 text-xs text-slate-600">Source: {{ $lesson->source_ref }}</p>
    @endif

    <div class="mt-8 space-y-8">
        @foreach ($lesson->sections as $section)
            <section id="section-{{ $section->id }}" class="scroll-mt-8">
                @if ($section->title)
                    <h2 class="mb-3 text-xl font-semibold text-slate-200">{{ $section->title }}</h2>
                @endif

                @include('components.sections.'.$section->type, ['section' => $section, 'content' => $section->content])
            </section>
        @endforeach
    </div>

    @if ($lesson->quiz && $lesson->quiz->questions->isNotEmpty())
        <div class="mt-12 border-t border-slate-800 pt-8">
            <x-quiz :quiz="$lesson->quiz" />
        </div>
    @endif

    <nav class="mt-12 flex items-center justify-between border-t border-slate-800 pt-6">
        @if ($prev)
            <a href="{{ route('lessons.show', [$prev->topic, $prev]) }}"
               class="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                ← {{ $prev->title }}
            </a>
        @else
            <span></span>
        @endif

        @if ($next)
            <a href="{{ route('lessons.show', [$next->topic, $next]) }}"
               class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
                {{ $next->title }} →
            </a>
        @endif
    </nav>
@endsection
