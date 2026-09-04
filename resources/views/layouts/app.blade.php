<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>@yield('title', 'CCNA Study Platform') · CCNA 200-301</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Patrick+Hand&display=swap" rel="stylesheet">
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body class="bg-stone-950 text-stone-200 antialiased">
        <x-svg.sprite />
        <div class="min-h-screen lg:flex">
            <aside class="lg:w-72 lg:shrink-0 border-b lg:border-b-0 lg:border-r border-stone-900 bg-stone-950 lg:h-screen lg:sticky lg:top-0 lg:overflow-y-auto">
                <div class="p-5">
                    <a href="{{ route('home') }}" class="flex items-center gap-3">
                        <span class="text-2xl">🌐</span>
                        <div>
                            <div class="font-semibold text-stone-100">CCNA 200-301</div>
                            <div class="text-xs text-stone-400">Jeremy's IT Lab · Transcripts → Lessons</div>
                        </div>
                    </a>
                </div>

                @if (isset($days))
                    <nav class="px-3 pb-6">
                        <div class="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">
                            Lessons by day
                        </div>
                        <ul class="space-y-0.5">
                            @foreach ($days as $navLesson)
                                @php
                                    $navTopic = $navLesson->topic;
                                    $isActive = request()->routeIs('lessons.show')
                                        && request()->route('lesson')?->is($navLesson);
                                @endphp
                                <li>
                                    <a href="{{ route('lessons.show', [$navTopic, $navLesson]) }}"
                                       @class([
                                           'group flex items-start gap-2.5 rounded-md px-2.5 py-1.5 transition-colors',
                                           'bg-amber-600/20 text-amber-200' => $isActive,
                                           'text-stone-400 hover:bg-stone-800 hover:text-stone-200' => ! $isActive,
                                       ])>
                                        <span @class([
                                            'mt-0.5 w-9 shrink-0 rounded border px-1 py-0.5 text-center text-[10px] font-bold leading-none',
                                            'border-amber-500/40 bg-amber-500/15 text-amber-300' => $isActive,
                                            'border-stone-700 bg-stone-800/60 text-stone-500 group-hover:text-stone-300' => ! $isActive,
                                        ])>
                                            D{{ $navLesson->order }}
                                        </span>
                                        <span class="min-w-0">
                                            <span class="block truncate text-sm font-medium">
                                                {{ $navLesson->title }}
                                            </span>
                                            <span class="block truncate text-xs text-stone-500">
                                                {{ $navTopic->title }}
                                            </span>
                                        </span>
                                    </a>
                                </li>
                            @endforeach
                        </ul>

                        <div class="mt-6 px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">
                            Labs
                        </div>
                        <ul class="mt-0.5 space-y-0.5">
                            <li>
                                <a href="{{ route('labs.router') }}"
                                   @class([
                                       'block rounded-md px-3 py-1.5 text-sm transition-colors',
                                       'bg-amber-600/20 text-amber-300' => request()->routeIs('labs.router'),
                                       'text-stone-400 hover:bg-stone-800 hover:text-stone-200' => !request()->routeIs('labs.router'),
                                   ])>
                                    🖥 Cisco 2911 Router
                                </a>
                            </li>
                            <li>
                                <a href="{{ route('labs.practice') }}"
                                   @class([
                                       'block rounded-md px-3 py-1.5 text-sm transition-colors',
                                       'bg-amber-600/20 text-amber-300' => request()->routeIs('labs.practice'),
                                       'text-stone-400 hover:bg-stone-800 hover:text-stone-200' => !request()->routeIs('labs.practice'),
                                   ])>
                                    🧪 Practice Lab
                                </a>
                            </li>
                        </ul>
                    </nav>
                @elseif (isset($navDomains))
                    <nav class="px-3 pb-6">
                        @foreach ($navDomains as $navDomain)
                            <div class="px-2 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">
                                {{ $navDomain->code }} · {{ $navDomain->title }}
                            </div>
                            @foreach ($navDomain->topics as $navTopic)
                                <div class="mt-1">
                                    <div class="px-2 py-1.5 text-sm font-medium text-stone-300">{{ $navTopic->title }}</div>
                                    <ul class="mt-0.5 space-y-0.5">
                                        @foreach ($navTopic->lessons as $navLesson)
                                            <li>
                                                <a href="{{ route('lessons.show', [$navTopic, $navLesson]) }}"
                                                   @class([
                                                       'block rounded-md px-3 py-1.5 text-sm transition-colors',
                                                       'bg-amber-600/20 text-amber-300' => request()->routeIs('lessons.show') && request()->route('lesson')?->is($navLesson),
                                                       'text-stone-400 hover:bg-stone-800 hover:text-stone-200' => ! (request()->routeIs('lessons.show') && request()->route('lesson')?->is($navLesson)),
                                                   ])>
                                                    {{ $navLesson->title }}
                                                </a>
                                            </li>
                                        @endforeach
                                    </ul>
                                </div>
                            @endforeach
                        @endforeach

                        <div class="mt-6 px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">
                            Labs
                        </div>
                        <ul class="mt-0.5 space-y-0.5">
                            <li>
                                <a href="{{ route('labs.router') }}"
                                   @class([
                                       'block rounded-md px-3 py-1.5 text-sm transition-colors',
                                       'bg-amber-600/20 text-amber-300' => request()->routeIs('labs.router'),
                                       'text-stone-400 hover:bg-stone-800 hover:text-stone-200' => !request()->routeIs('labs.router'),
                                   ])>
                                    🖥 Cisco 2911 Router
                                </a>
                            </li>
                            <li>
                                <a href="{{ route('labs.practice') }}"
                                   @class([
                                       'block rounded-md px-3 py-1.5 text-sm transition-colors',
                                       'bg-amber-600/20 text-amber-300' => request()->routeIs('labs.practice'),
                                       'text-stone-400 hover:bg-stone-800 hover:text-stone-200' => !request()->routeIs('labs.practice'),
                                   ])>
                                    🧪 Practice Lab
                                </a>
                            </li>
                        </ul>
                    </nav>
                @endif
            </aside>

            <main class="flex-1 min-w-0">
                @hasSection('fullwidth')
                    @yield('content')
                @else
                    <div class="mx-auto max-w-3xl px-5 py-8 lg:py-12">
                        @yield('content')
                    </div>
                @endif
            </main>
        </div>
    </body>
</html>
