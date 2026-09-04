@extends('layouts.app')

@section('title', 'Home')

@section('content')
    <h1 class="text-3xl font-bold text-zinc-100">CCNA 200-301 Study Platform</h1>
    <p class="mt-3 text-zinc-400 leading-relaxed">
        Structured, interactive lessons converted from Jeremy's IT Lab transcripts — explanations, animated
        diagrams, and quizzes, all rendered in your browser.
    </p>

    @foreach ($domains as $domain)
        <section class="mt-10">
            <h2 class="text-lg font-semibold text-zinc-200">
                {{ $domain->code }} — {{ $domain->title }}
            </h2>

            <div class="mt-4 space-y-6">
                @foreach ($domain->topics as $topic)
                    <div>
                        <h3 class="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                            {{ $topic->title }}
                        </h3>
                        <ul class="mt-2 grid gap-2 sm:grid-cols-2">
                            @foreach ($topic->lessons as $lesson)
                                <li>
                                    <a href="{{ route('lessons.show', [$topic, $lesson]) }}"
                                       class="group block rounded-lg bg-zinc-900/50 p-4 transition-colors hover:bg-zinc-900">
                                        <div class="font-medium text-zinc-100 group-hover:text-teal-300">
                                            {{ $lesson->title }}
                                        </div>
                                        @if ($lesson->summary)
                                            <p class="mt-1 text-sm text-zinc-400">{{ $lesson->summary }}</p>
                                        @endif
                                        <div class="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                                            <span>{{ $lesson->sections_count }} sections</span>
                                            @if ($lesson->quiz)
                                                <span>· quiz</span>
                                            @endif
                                        </div>
                                    </a>
                                </li>
                            @endforeach
                        </ul>
                    </div>
                @endforeach
            </div>
        </section>
    @endforeach
@endsection
