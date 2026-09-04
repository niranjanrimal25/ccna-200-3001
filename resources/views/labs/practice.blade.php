@extends('layouts.app')

@section('title', 'Practice Lab — 3D Network Simulator')

@section('fullwidth', true)

@section('content')
<div x-data="practiceLab"
     class="flex h-[calc(100vh-1.5rem)] flex-col gap-3 px-4 py-3">

    {{-- Header bar --}}
    <div class="flex flex-wrap items-center gap-2">
        <div class="mr-auto">
            <h1 class="text-lg font-bold text-slate-100">🧪 Practice Lab</h1>
            <p class="text-xs text-slate-500">A Packet-Tracer-style 3D workspace — drag to orbit · scroll to zoom · right-drag to pan.</p>
        </div>

        <div class="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 p-1">
            <span class="px-2 text-[11px] uppercase tracking-wide text-slate-500">Tool</span>
            <button @click="setTool('select')"
                    :class="tool==='select' ? 'bg-blue-600/30 text-blue-200 border-blue-500/40' : 'text-slate-400 hover:text-slate-200 border-transparent'"
                    class="rounded-md border px-2.5 py-1 text-sm">🖱 Select</button>
            <button @click="setTool('cable')"
                    :class="tool==='cable' ? 'bg-blue-600/30 text-blue-200 border-blue-500/40' : 'text-slate-400 hover:text-slate-200 border-transparent'"
                    class="rounded-md border px-2.5 py-1 text-sm">🔌 Cable</button>
            <button @click="setTool('delete')"
                    :class="tool==='delete' ? 'bg-red-600/30 text-red-200 border-red-500/40' : 'text-slate-400 hover:text-slate-200 border-transparent'"
                    class="rounded-md border px-2.5 py-1 text-sm">🗑 Delete</button>
        </div>

        <button @click="loadSample()"
                class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700">🏗 Sample Network</button>
        <button @click="clearAll()"
                class="rounded-lg border border-red-900/60 bg-red-900/20 px-3 py-1.5 text-sm text-red-200 hover:bg-red-900/40">Clear all</button>
    </div>

    <div class="flex min-h-0 flex-1 gap-3">

        {{-- Left palette / device / log column --}}
        <aside class="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto">

            <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Device palette</div>
                <div class="grid grid-cols-2 gap-2">
                    <button @click="addDevice('router')" class="rounded-lg border border-slate-700 bg-slate-800 p-2 text-center hover:bg-slate-700">
                        <div class="text-2xl">🖧</div><div class="text-xs text-slate-300">Router</div>
                    </button>
                    <button @click="addDevice('switch')" class="rounded-lg border border-slate-700 bg-slate-800 p-2 text-center hover:bg-slate-700">
                        <div class="text-2xl">🔀</div><div class="text-xs text-slate-300">Switch</div>
                    </button>
                    <button @click="addDevice('pc')" class="rounded-lg border border-slate-700 bg-slate-800 p-2 text-center hover:bg-slate-700">
                        <div class="text-2xl">🖥</div><div class="text-xs text-slate-300">PC</div>
                    </button>
                    <button @click="addDevice('server')" class="rounded-lg border border-slate-700 bg-slate-800 p-2 text-center hover:bg-slate-700">
                        <div class="text-2xl">🗄</div><div class="text-xs text-slate-300">Server</div>
                    </button>
                </div>
            </div>

            <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Devices</div>
                <ul class="space-y-1">
                    <template x-for="d in deviceList" :key="d.id">
                        <li>
                            <div @click="selectDevice(d.id)"
                                 @dblclick="openConsole(d.id)"
                                 :class="selectedId===d.id ? 'border-blue-500/40 bg-blue-600/15' : 'border-transparent hover:bg-slate-800'"
                                 class="flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5">
                                <span class="text-lg" x-text="d.icon"></span>
                                <div class="min-w-0 flex-1">
                                    <div class="truncate text-sm font-medium text-slate-200" x-text="d.name"></div>
                                    <div class="text-[11px] text-slate-500" x-text="d.type + ' · ' + d.upPorts + '/' + d.totalPorts + ' up'"></div>
                                </div>
                                <button @click.stop="openConsole(d.id)" title="Open console"
                                        class="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700">⌨</button>
                            </div>
                        </li>
                    </template>
                    <li x-show="!deviceList.length" class="px-2 py-1 text-xs text-slate-600">No devices yet.</li>
                </ul>
            </div>

            <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Inspector</div>
                <template x-if="selectedDetail">
                    <div class="space-y-2.5">
                        <div class="flex items-center gap-2">
                            <span class="text-lg" x-text="selectedDetail.icon"></span>
                            <div class="min-w-0">
                                <div class="truncate text-sm font-semibold text-slate-200" x-text="selectedDetail.name"></div>
                                <div class="text-[11px] capitalize text-slate-500" x-text="selectedDetail.type"></div>
                            </div>
                        </div>

                        <div x-show="selectedDetail.interfaces.length">
                            <div class="text-[10px] uppercase tracking-wide text-slate-600">Interfaces</div>
                            <ul class="mt-1 space-y-0.5 font-mono text-[11px]">
                                <template x-for="i in selectedDetail.interfaces" :key="i.name">
                                    <li class="flex items-center gap-1.5">
                                        <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="i.up ? 'bg-emerald-400' : 'bg-slate-600'"></span>
                                        <span class="shrink-0 text-slate-300" x-text="i.name"></span>
                                        <span x-show="i.tag" class="shrink-0 rounded bg-sky-900/60 px-1 text-[9px] text-sky-300" x-text="i.tag"></span>
                                        <span class="ml-auto truncate pl-2 text-slate-500" x-text="i.ip"></span>
                                    </li>
                                </template>
                            </ul>
                        </div>

                        <div x-show="selectedDetail.routes.length">
                            <div class="text-[10px] uppercase tracking-wide text-slate-600">Routing table</div>
                            <ul class="mt-1 space-y-0.5 font-mono text-[11px]">
                                <template x-for="r in selectedDetail.routes" :key="r.code + r.prefix">
                                    <li class="flex items-center gap-1.5">
                                        <span class="shrink-0 rounded bg-slate-800 px-1 text-[9px] font-bold text-blue-300" x-text="r.code"></span>
                                        <span class="shrink-0 text-slate-300" x-text="r.prefix"></span>
                                        <span class="ml-auto truncate pl-2 text-slate-500" x-text="r.via"></span>
                                    </li>
                                </template>
                            </ul>
                        </div>

                        <div x-show="selectedDetail.vlans.length">
                            <div class="text-[10px] uppercase tracking-wide text-slate-600">VLANs</div>
                            <ul class="mt-1 flex flex-wrap gap-1 font-mono text-[11px]">
                                <template x-for="v in selectedDetail.vlans" :key="v.id">
                                    <li class="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300"><span class="font-semibold text-blue-300" x-text="v.id"></span> <span x-text="v.name"></span></li>
                                </template>
                            </ul>
                        </div>

                        <div x-show="selectedDetail.neighbors.length">
                            <div class="text-[10px] uppercase tracking-wide text-slate-600">CDP neighbors</div>
                            <ul class="mt-1 space-y-0.5 font-mono text-[11px] text-slate-400">
                                <template x-for="n in selectedDetail.neighbors" :key="n"><li x-text="n"></li></template>
                            </ul>
                        </div>
                    </div>
                </template>
                <div x-show="!selectedDetail" class="px-2 py-1 text-xs text-slate-600">Select a device to inspect its interfaces, routes and VLANs.</div>
            </div>

            <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Links</div>
                <ul class="space-y-1">
                    <template x-for="l in linkList" :key="l.id">
                        <li class="flex items-center gap-2 px-2 py-1 text-xs">
                            <span class="inline-block h-2 w-2 rounded-full"
                                  :class="l.up ? 'bg-emerald-400' : 'bg-amber-400'"></span>
                            <span class="truncate text-slate-400" x-text="l.a + ' ⇄ ' + l.b"></span>
                        </li>
                    </template>
                    <li x-show="!linkList.length" class="px-2 py-1 text-xs text-slate-600">No cables yet.</li>
                </ul>
            </div>

            <div class="min-h-24 flex-1 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Event log</div>
                <ul class="space-y-0.5 font-mono text-[11px] leading-snug">
                    <template x-for="(line, i) in logLines" :key="i">
                        <li class="text-slate-400" x-text="line"></li>
                    </template>
                    <li x-show="!logLines.length" class="text-slate-600">Events will appear here.</li>
                </ul>
            </div>
        </aside>

        {{-- 3D canvas --}}
        <div class="flex min-w-0 flex-1 flex-col gap-3">
            <div class="relative flex-1 overflow-hidden rounded-xl border border-slate-800 bg-[#0b1220]">
                <div x-ref="canvas" class="absolute inset-0"></div>

                <div class="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-2">
                    <div class="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-400"
                         x-text="statusHint"></div>
                </div>

                <div x-show="tool==='cable'" class="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-200">
                    Cable mode: pick a source port, then a target port
                </div>

                {{-- legend --}}
                <div class="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-slate-800 bg-slate-900/80 p-2 text-[10px] text-slate-500">
                    <div><span class="text-emerald-400">●</span> link up</div>
                    <div><span class="text-amber-400">●</span> admin down / no IP</div>
                </div>
            </div>

            {{-- CLI console --}}
            <template x-if="cli">
                <div x-cloak
                     class="flex h-56 flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0a0a0a]">
                    <div class="flex items-center justify-between border-b border-slate-800 px-3 py-1.5">
                        <span class="font-mono text-xs text-slate-400" x-text="cliTitle"></span>
                        <div class="flex items-center gap-2">
                            <span class="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500" x-text="cli.mode"></span>
                            <button @click="closeConsole()" class="rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200">✕</button>
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
                         class="border-t border-slate-800 px-3 py-1.5 text-[10px] text-slate-600">
                        Type <kbd class="rounded bg-slate-800 px-1 text-slate-400">?</kbd> for help · routers/switches use Cisco IOS, PCs use Windows commands
                    </div>
                </div>
            </template>
        </div>
    </div>
</div>

<style>
[x-cloak] { display: none !important; }
@keyframes termBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
</style>
@endsection
