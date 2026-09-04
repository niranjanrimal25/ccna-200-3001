@extends('layouts.app')

@section('title', 'Practice Lab — 3D Network Simulator')

@section('fullwidth', true)

@section('content')
<div x-data="practiceLab"
     class="flex h-[calc(100vh-1.5rem)] flex-col gap-3 bg-zinc-950 px-4 py-3">

    {{-- Header — everything in one slim bar --}}
    <header class="flex flex-wrap items-center gap-3">
        <div class="mr-auto">
            <h1 class="text-lg font-bold text-zinc-100">🧪 Practice Lab</h1>
            <p class="text-xs text-zinc-500">Build, cable, configure and ping a virtual network.</p>
        </div>

        {{-- Add devices --}}
        <div class="flex items-center gap-0.5 rounded-xl border border-zinc-800 bg-zinc-900/70 p-1">
            <button @click="addDevice('router')" title="Add router"
                    class="rounded-lg px-2.5 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">🖧 Router</button>
            <button @click="addDevice('switch')" title="Add switch"
                    class="rounded-lg px-2.5 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">🔀 Switch</button>
            <button @click="addDevice('pc')" title="Add PC"
                    class="rounded-lg px-2.5 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">🖥 PC</button>
            <button @click="addDevice('server')" title="Add server"
                    class="rounded-lg px-2.5 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">🗄 Server</button>
        </div>

        {{-- Tools --}}
        <div class="flex items-center gap-0.5 rounded-xl border border-zinc-800 bg-zinc-900/70 p-1">
            <button @click="setTool('select')"
                    :class="tool==='select' ? 'bg-teal-500/20 text-teal-200 border-teal-500/40' : 'text-zinc-400 hover:text-zinc-200 border-transparent'"
                    class="rounded-lg border px-2.5 py-1.5 text-sm">🖱 Select</button>
            <button @click="setTool('cable')"
                    :class="tool==='cable' ? 'bg-teal-500/20 text-teal-200 border-teal-500/40' : 'text-zinc-400 hover:text-zinc-200 border-transparent'"
                    class="rounded-lg border px-2.5 py-1.5 text-sm">🔌 Cable</button>
            <button @click="setTool('delete')"
                    :class="tool==='delete' ? 'bg-rose-500/20 text-rose-200 border-rose-500/40' : 'text-zinc-400 hover:text-zinc-200 border-transparent'"
                    class="rounded-lg border px-2.5 py-1.5 text-sm">🗑 Delete</button>
        </div>

        <button @click="practice.picking = true"
                class="rounded-lg border border-teal-700/60 bg-teal-500/10 px-3 py-1.5 text-sm text-teal-200 hover:bg-teal-500/20">🧪 Scenarios</button>
        <button @click="loadSample()"
                class="rounded-lg border border-zinc-700 bg-zinc-800/70 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700">🏗 Sample</button>
        <button @click="clearAll()"
                class="rounded-lg border border-rose-900/60 bg-rose-900/20 px-3 py-1.5 text-sm text-rose-200 hover:bg-rose-900/40">Clear</button>
    </header>

    <div class="flex min-h-0 flex-1 gap-3">

        {{-- Sidebar: network (devices + inspector) and activity log --}}
        <aside class="flex w-60 shrink-0 flex-col gap-3 overflow-y-auto">

            <div class="rounded-xl border border-zinc-800 bg-zinc-900/60">
                <div class="border-b border-zinc-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Network</div>
                <ul class="space-y-0.5 p-2">
                    <template x-for="d in deviceList" :key="d.id">
                        <li>
                            <div @click="selectDevice(d.id)"
                                 @dblclick="openConsole(d.id)"
                                 :class="selectedId===d.id ? 'border-teal-500/40 bg-teal-500/10' : 'border-transparent hover:bg-zinc-800/70'"
                                 class="flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5">
                                <span class="text-base" x-text="d.icon"></span>
                                <div class="min-w-0 flex-1">
                                    <div class="truncate text-sm font-medium text-zinc-200" x-text="d.name"></div>
                                    <div class="text-[11px] text-zinc-500" x-text="d.type + ' · ' + d.upPorts + '/' + d.totalPorts + ' up'"></div>
                                </div>
                                <button @click.stop="openConsole(d.id)" title="Open console"
                                        class="rounded-md border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-700">⌨</button>
                            </div>
                        </li>
                    </template>
                    <li x-show="!deviceList.length" class="px-2 py-1 text-xs text-zinc-500">No devices yet — add one above.</li>
                </ul>

                {{-- Inspector for the selected device --}}
                <template x-if="selectedDetail">
                    <div class="space-y-2.5 border-t border-zinc-800 p-3">
                        <div class="flex items-center gap-2">
                            <span class="text-base" x-text="selectedDetail.icon"></span>
                            <div class="min-w-0">
                                <div class="truncate text-sm font-semibold text-zinc-200" x-text="selectedDetail.name"></div>
                                <div class="text-[11px] capitalize text-zinc-500" x-text="selectedDetail.type"></div>
                            </div>
                        </div>

                        <div class="flex items-center gap-1.5">
                            <span class="text-[10px] uppercase tracking-wide text-zinc-500">Rotate</span>
                            <button @click="rotateDevice(selectedDetail.id, -1)" title="Rotate 90° counter-clockwise"
                                    class="rounded-md border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-800">⟲</button>
                            <button @click="rotateDevice(selectedDetail.id, 1)" title="Rotate 90° clockwise (or press R)"
                                    class="rounded-md border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-800">⟳</button>
                            <span class="ml-auto font-mono text-[11px] text-zinc-500" x-text="selectedDetail.rotDeg + '°'"></span>
                        </div>

                        <div x-show="selectedDetail.interfaces.length">
                            <div class="text-[10px] uppercase tracking-wide text-zinc-500">Interfaces</div>
                            <ul class="mt-1 space-y-0.5 font-mono text-[11px]">
                                <template x-for="i in selectedDetail.interfaces" :key="i.name">
                                    <li class="flex items-center gap-1.5">
                                        <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="i.up ? 'bg-emerald-400' : 'bg-zinc-600'"></span>
                                        <span class="shrink-0 text-zinc-300" x-text="i.name"></span>
                                        <span x-show="i.tag" class="shrink-0 rounded bg-teal-500/10 px-1 text-[9px] text-teal-300" x-text="i.tag"></span>
                                        <span class="ml-auto truncate pl-2 text-zinc-500" x-text="i.ip"></span>
                                    </li>
                                </template>
                            </ul>
                        </div>

                        <div x-show="selectedDetail.routes.length">
                            <div class="text-[10px] uppercase tracking-wide text-zinc-500">Routing table</div>
                            <ul class="mt-1 space-y-0.5 font-mono text-[11px]">
                                <template x-for="r in selectedDetail.routes" :key="r.code + r.prefix">
                                    <li class="flex items-center gap-1.5">
                                        <span class="shrink-0 rounded bg-zinc-800 px-1 text-[9px] font-bold text-teal-300" x-text="r.code"></span>
                                        <span class="shrink-0 text-zinc-200" x-text="r.prefix"></span>
                                        <span class="ml-auto truncate pl-2 text-zinc-500" x-text="r.via"></span>
                                    </li>
                                </template>
                            </ul>
                        </div>

                        <div x-show="selectedDetail.vlans.length">
                            <div class="text-[10px] uppercase tracking-wide text-zinc-500">VLANs</div>
                            <ul class="mt-1 flex flex-wrap gap-1 font-mono text-[11px]">
                                <template x-for="v in selectedDetail.vlans" :key="v.id">
                                    <li class="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300"><span class="font-semibold text-teal-300" x-text="v.id"></span> <span x-text="v.name"></span></li>
                                </template>
                            </ul>
                        </div>

                        <div x-show="selectedDetail.neighbors.length">
                            <div class="text-[10px] uppercase tracking-wide text-zinc-500">CDP neighbors</div>
                            <ul class="mt-1 space-y-0.5 font-mono text-[11px] text-zinc-400">
                                <template x-for="n in selectedDetail.neighbors" :key="n"><li x-text="n"></li></template>
                            </ul>
                        </div>
                    </div>
                </template>
            </div>

            <div class="min-h-24 flex-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <div class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Activity</div>
                <ul class="space-y-0.5 font-mono text-[11px] leading-snug">
                    <template x-for="(line, i) in logLines" :key="i">
                        <li class="text-zinc-400" x-text="line"></li>
                    </template>
                    <li x-show="!logLines.length" class="text-zinc-500">Events will appear here.</li>
                </ul>
            </div>
        </aside>

        {{-- 3D canvas --}}
        <div class="flex min-w-0 flex-1 flex-col gap-3">
            <div class="relative flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-[#0a0c0d]">
                <div x-ref="canvas" class="absolute inset-0"></div>

                <div class="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-2">
                    <div class="rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-[11px] text-zinc-400"
                         x-text="statusHint"></div>
                </div>

                <div x-show="tool==='cable'" class="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-[11px] text-orange-200">
                    Cable mode: pick a source port, then a target port
                </div>

                {{-- legend --}}
                <div class="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-zinc-800 bg-zinc-900/80 p-2 text-[10px] text-zinc-500">
                    <div><span class="text-emerald-400">●</span> link up</div>
                    <div><span class="text-amber-400">●</span> admin down / no IP</div>
                    <template x-if="practice.scenarioId">
                        <div class="mt-1.5 border-t border-zinc-800 pt-1.5">
                            <div><span class="text-amber-300">●</span> frame in (learn)</div>
                            <div><span class="text-orange-400">●</span> flood</div>
                            <div><span class="text-teal-300">●</span> forward</div>
                        </div>
                    </template>
                </div>
            </div>

            {{-- CLI console --}}
            <template x-if="cli">
                <div x-cloak
                     class="flex h-56 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#0a0b0c]">
                    <div class="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5">
                        <span class="font-mono text-xs text-zinc-400" x-text="cliTitle"></span>
                        <div class="flex items-center gap-2">
                            <span class="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500" x-text="cli.mode"></span>
                            <button @click="closeConsole()" class="rounded px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">✕</button>
                        </div>
                    </div>

                    <div x-ref="cliScroll" class="flex-1 overflow-y-auto p-3 font-mono text-[12.5px] leading-relaxed">
                        <template x-for="(line, idx) in cli.output" :key="idx">
                            <div :class="line.cls" x-text="line.text" style="white-space:pre-wrap; min-height:1.1em;"></div>
                        </template>
                        <div class="flex items-baseline" style="white-space:pre;">
                            <span class="text-green-400" x-text="cliPrompt"></span>
                            <span class="text-green-400" x-text="cliInputEcho"></span>
                            <span class="ml-0.5 inline-block h-[14px] w-[7px] align-middle bg-green-400" style="animation:termBlink 1.1s step-end infinite;"></span>
                        </div>
                    </div>

                    <input x-ref="cliInput"
                           :type="cli.prompt && cli.prompt.kind === 'password' ? 'password' : 'text'"
                           x-model="cli.input"
                           @keydown="cliKeydown($event)"
                           class="sr-only"
                           autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"/>
                    <div @click="$refs.cliInput.focus()"
                         class="border-t border-zinc-800 px-3 py-1.5 text-[10px] text-zinc-600">
                        Type <kbd class="rounded bg-zinc-800 px-1 text-zinc-400">?</kbd> for help · routers/switches use Cisco IOS, PCs use Windows commands
                    </div>
                </div>
            </template>
        </div>

        {{-- Practice scenario panel (docked, step-by-step) --}}
        <aside x-show="practice.scenarioId" x-cloak
               class="flex w-80 shrink-0 flex-col overflow-y-auto">
            <div class="rounded-xl border border-zinc-800 bg-zinc-900/60">
                <div class="flex items-start gap-2 border-b border-zinc-800 px-3 py-2.5">
                    <span class="text-lg" x-text="practice.icon"></span>
                    <div class="min-w-0 flex-1">
                        <div class="truncate text-sm font-semibold text-zinc-100" x-text="practice.title"></div>
                        <div class="text-[11px] text-teal-400" x-text="practice.tag"></div>
                    </div>
                    <button @click="exitPractice()" title="Exit scenario"
                            class="rounded px-1.5 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">✕</button>
                </div>

                <div class="space-y-3 p-3">
                    <p class="text-xs leading-relaxed text-zinc-400" x-text="practice.objective"></p>

                    {{-- steps --}}
                    <div>
                        <div class="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-500">Steps</div>
                        <ol class="space-y-1">
                            <template x-for="(s, i) in practice.steps" :key="i">
                                <li class="flex items-start gap-2 text-xs">
                                    <span class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                                          :class="i < practice.stepIndex ? 'bg-emerald-500/20 text-emerald-300' : (i === practice.stepIndex ? 'bg-teal-500/30 text-teal-200' : 'bg-zinc-800 text-zinc-500')"
                                          x-text="i < practice.stepIndex ? '✓' : (i + 1)"></span>
                                    <div class="min-w-0">
                                        <div class="font-medium" :class="i === practice.stepIndex ? 'text-zinc-100' : 'text-zinc-400'" x-text="s.title"></div>
                                        <div class="mt-0.5 leading-snug text-zinc-500" x-show="i === practice.stepIndex" x-text="s.desc"></div>
                                    </div>
                                </li>
                            </template>
                        </ol>
                    </div>

                    {{-- what happened on the last step --}}
                    <div x-show="practice.narration.length">
                        <div class="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-500">What just happened</div>
                        <ul class="space-y-0.5 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2 font-mono text-[11px] leading-snug text-zinc-300">
                            <template x-for="(l, i) in practice.narration" :key="i"><li x-text="l"></li></template>
                        </ul>
                    </div>

                    {{-- live tables --}}
                    <template x-for="t in practice.tables" :key="t.id">
                        <div>
                            <div class="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-500" x-text="t.title"></div>
                            <div class="overflow-hidden rounded-lg border border-zinc-800">
                                <table class="w-full text-left font-mono text-[11px]">
                                    <thead class="bg-zinc-950/60 text-zinc-500">
                                        <tr>
                                            <template x-for="c in t.columns" :key="c.key"><th class="px-2 py-1 font-semibold" x-text="c.label"></th></template>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-zinc-800/70 text-zinc-300">
                                        <template x-for="(r, i) in t.rows" :key="i">
                                            <tr>
                                                <template x-for="c in t.columns" :key="c.key"><td class="px-2 py-1" x-text="r[c.key]"></td></template>
                                            </tr>
                                        </template>
                                        <tr x-show="!t.rows.length"><td class="px-2 py-1.5 text-zinc-600" :colspan="t.columns.length">— empty —</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </template>

                    {{-- controls --}}
                    <div class="flex items-center gap-2 border-t border-zinc-800 pt-3">
                        <button x-show="!practice.done" @click="practiceStep()"
                                class="flex-1 rounded-lg bg-teal-500/90 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-teal-400">
                            Next step <span class="font-normal opacity-70" x-text="'(' + (practice.stepIndex + 1) + '/' + practice.steps.length + ')'"></span>
                        </button>
                        <div x-show="practice.done"
                             class="flex-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-center text-sm font-semibold text-emerald-300">✅ Complete</div>
                        <button @click="practiceReset()"
                                class="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800">↺ Restart</button>
                    </div>
                    <p x-show="practice.done" class="text-xs text-zinc-400" x-text="practice.doneText"></p>
                </div>
            </div>
        </aside>
    </div>

    {{-- Scenario picker modal --}}
    <div x-show="practice.picking" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/70" @click="practice.picking = false"></div>
        <div class="relative z-10 max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
            <div class="mb-4 flex items-center justify-between">
                <div>
                    <h2 class="text-base font-bold text-zinc-100">Practice scenarios</h2>
                    <p class="text-xs text-zinc-500">Pick a topic and step through it with animation and live tables.</p>
                </div>
                <button @click="practice.picking = false"
                        class="rounded-lg border border-zinc-700 px-2.5 py-1 text-sm text-zinc-300 hover:bg-zinc-800">✕</button>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <template x-for="s in scenarioList" :key="s.id">
                    <button @click="openPractice(s.id)"
                            class="group rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-left hover:border-teal-500/50 hover:bg-teal-500/5">
                        <div class="text-2xl" x-text="s.icon"></div>
                        <div class="mt-2 text-sm font-semibold text-zinc-100 group-hover:text-teal-200" x-text="s.title"></div>
                        <div class="text-[11px] text-teal-400" x-text="s.tag"></div>
                        <div class="mt-1 text-xs leading-snug text-zinc-500" x-text="s.summary"></div>
                    </button>
                </template>
            </div>

            <div class="mt-5">
                <div class="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Coming soon</div>
                <div class="mt-2 flex flex-wrap gap-1.5">
                    <template x-for="p in plannedList" :key="p.title">
                        <span class="rounded-full border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-[11px] text-zinc-500">
                            <span x-text="p.icon"></span> <span x-text="p.title"></span>
                        </span>
                    </template>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
[x-cloak] { display: none !important; }
@keyframes termBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
</style>
@endsection
