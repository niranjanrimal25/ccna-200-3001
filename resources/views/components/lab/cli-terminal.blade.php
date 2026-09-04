<div class="flex flex-col flex-1 overflow-hidden" style="background:#0a0a0a; min-height:420px;"
     @click="focusInput()">

    {{-- Scrollable output area --}}
    <div x-ref="terminal"
         class="flex-1 overflow-y-auto p-4"
         style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:13px; line-height:1.65;">

        <template x-for="(line, idx) in output" :key="idx">
            <div :class="line.cls" x-text="line.text" style="white-space:pre; min-height:1.1em;"></div>
        </template>

        {{-- Active input line --}}
        <div class="flex items-baseline" style="white-space:pre;">
            <span class="text-green-400" x-text="prompt"></span>
            <span x-show="!awaitingPassword" class="text-green-400" x-text="currentInput"></span>
            <span x-show="awaitingPassword"  class="text-zinc-500" x-text="'*'.repeat(currentInput.length)"></span>
            <span class="inline-block w-[8px] h-[14px] ml-[1px] align-middle"
                  style="background:#4ade80; animation:termBlink 1.1s step-end infinite;"></span>
        </div>
    </div>

    {{-- Hidden input captures keystrokes --}}
    <input x-ref="input"
           type="text"
           x-model="currentInput"
           @keydown="handleKeydown($event)"
           class="sr-only"
           autocomplete="off"
           autocorrect="off"
           autocapitalize="off"
           spellcheck="false"/>

    {{-- Status bar --}}
    <div class="flex items-center justify-between border-t border-zinc-800 px-4 py-2 text-xs"
         style="background:#111111;">
        <span class="text-zinc-600 space-x-2">
            <kbd class="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400 font-mono">?</kbd><span class="text-zinc-700">help</span>
            <kbd class="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400 font-mono">Tab</kbd><span class="text-zinc-700">complete</span>
            <kbd class="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400 font-mono">↑↓</kbd><span class="text-zinc-700">history</span>
            <kbd class="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400 font-mono">Ctrl+C</kbd><span class="text-zinc-700">break</span>
        </span>
        <span class="text-zinc-600">
            mode: <span class="text-green-500 font-mono" x-text="mode"></span>
        </span>
    </div>
</div>

<style>
@keyframes termBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
</style>
