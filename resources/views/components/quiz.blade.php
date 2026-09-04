@props(['quiz'])

@php
    $questions = $quiz->questions->map(fn ($q) => [
        'id' => $q->id,
        'question' => $q->question,
        'explanation' => $q->explanation,
        'options' => $q->options->map(fn ($o) => [
            'id' => $o->id,
            'label' => $o->label,
            'text' => $o->text,
            'is_correct' => $o->is_correct,
        ])->values(),
    ])->values();
@endphp

<div x-data="quizApp(@js($questions))" class="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
    <div class="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div class="text-sm font-semibold text-zinc-200">End-of-lesson quiz</div>
        <div class="flex items-center gap-3 text-xs text-zinc-400">
            <span x-show="!finished">
                Question <span x-text="current + 1"></span> / <span x-text="total"></span>
            </span>
            <span x-show="answered || finished" class="text-emerald-400">
                Score: <span x-text="score"></span> / <span x-text="total"></span>
            </span>
        </div>
    </div>

    <div class="p-5">
        <template x-if="finished">
            <div class="text-center py-8">
                <div class="text-2xl font-bold text-zinc-100">Quiz complete</div>
                <p class="mt-2 text-zinc-400">
                    You scored <span class="text-emerald-400 font-semibold" x-text="score"></span> out of
                    <span x-text="total"></span>.
                </p>
                <button @click="restart()" class="mt-6 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500">
                    Retake quiz
                </button>
            </div>
        </template>

        <template x-if="!finished">
            <div>
                <p class="font-medium text-zinc-100 leading-relaxed" x-text="question.question"></p>

                <div class="mt-4 space-y-2">
                    <template x-for="opt in question.options" :key="opt.id">
                        <button
                            @click="select(opt.id)"
                            :disabled="answered"
                            :class="{
                                'border-emerald-600 bg-emerald-950/50 text-emerald-200': optionState(opt) === 'correct',
                                'border-rose-600 bg-rose-950/50 text-rose-200': optionState(opt) === 'wrong',
                                'opacity-50 border-zinc-700': optionState(opt) === 'muted',
                                'border-zinc-700 hover:border-zinc-500 text-zinc-300': optionState(opt) === 'idle',
                            }"
                            class="flex w-full items-start gap-3 rounded-lg border bg-zinc-950/50 px-4 py-3 text-left text-sm transition-colors">
                            <span class="font-semibold" x-text="opt.label"></span>
                            <span x-text="opt.text"></span>
                            <span x-show="optionState(opt) === 'correct'" class="ml-auto">✓</span>
                            <span x-show="optionState(opt) === 'wrong'" class="ml-auto">✗</span>
                        </button>
                    </template>
                </div>

                <div x-show="answered" class="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-400">
                    <div x-show="optionState(question.options.find(o => o.id === selected)) === 'correct'" class="mb-2 font-medium text-emerald-400">
                        Correct!
                    </div>
                    <div x-show="optionState(question.options.find(o => o.id === selected)) === 'wrong'" class="mb-2 font-medium text-rose-400">
                        Incorrect.
                    </div>
                    <p x-text="question.explanation"></p>
                </div>

                <div class="mt-4 flex justify-end">
                    <button x-show="answered" @click="next()"
                            :disabled="current === total - 1 ? false : false"
                            class="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500">
                        <span x-text="current === total - 1 ? 'Finish' : 'Next question'"></span>
                    </button>
                </div>
            </div>
        </template>
    </div>
</div>
