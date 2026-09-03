@props(['lesson', 'day' => null])

@php
    $day = $day ?? $lesson->order;
    $slug = $lesson->slug;
    $filename = 'CCNA-Day' . str_pad((string) $day, 2, '0', STR_PAD_LEFT) . '-' . $slug . '.pdf';
@endphp

<div id="notes-print" data-filename="{{ $filename }}" class="notes-print" aria-hidden="true">
    <div class="notes-sheet">
        <div class="notes-header">
            <div class="notes-kicker">CCNA 200-301 &middot; Day {{ $day }} &middot; {{ $lesson->topic->title }}</div>
            <div class="notes-title">{{ $lesson->title }}</div>
            @if ($lesson->summary)
                <div class="notes-subtitle">{{ $lesson->summary }}</div>
            @endif
        </div>

        @foreach ($lesson->sections as $section)
            @php $content = $section->content; @endphp

            <div class="notes-section">
                @if ($section->title)
                    <div class="notes-h2">{{ $section->title }}</div>
                @endif

                {{-- Explanation: markdown prose, hand-styled --}}
                @if ($section->type === 'explanation')
                    <div class="notes-prose">{!! Illuminate\Support\Str::markdown($content['body'] ?? '') !!}</div>

                {{-- Table --}}
                @elseif ($section->type === 'table')
                    <table class="notes-table">
                        <thead>
                            <tr>
                                @foreach ($content['headers'] as $header)
                                    <th>{{ $header }}</th>
                                @endforeach
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($content['rows'] as $row)
                                <tr>
                                    @foreach ($row as $cell)
                                        <td>{{ $cell }}</td>
                                    @endforeach
                                </tr>
                            @endforeach
                        </tbody>
                    </table>

                {{-- Callout --}}
                @elseif ($section->type === 'callout')
                    @php
                        $labels = ['note' => 'Note', 'warning' => 'Warning', 'exam_tip' => 'Exam tip'];
                        $label = $labels[$content['style'] ?? 'note'] ?? 'Note';
                    @endphp
                    <div class="notes-callout">
                        <span class="notes-label">{{ $label }}:</span>
                        {{ $content['body'] ?? '' }}
                    </div>

                {{-- Diagram: static topology / device gallery sketches --}}
                @elseif ($section->type === 'diagram')
                    @if (($content['diagram_type'] ?? '') === 'topology')
                        @include('components.notes.sketch-topology', ['content' => $content])

                    @elseif (($content['diagram_type'] ?? '') === 'device_gallery')
                        <div class="notes-gallery">
                            @foreach ($content['nodes'] as $node)
                                <div class="notes-gallery-item">
                                    <div class="notes-gallery-label">{{ $node['label'] }}</div>
                                    <div class="notes-gallery-desc">{{ $node['description'] ?? '' }}</div>
                                </div>
                            @endforeach
                        </div>

                    @elseif (($content['diagram_type'] ?? '') === 'frame_fields')
                        <table class="notes-table">
                            <thead>
                                <tr><th>Field</th><th>Length</th><th>Purpose</th></tr>
                            </thead>
                            <tbody>
                                @foreach ($content['fields'] as $field)
                                    <tr>
                                        <td>{{ $field['name'] }}</td>
                                        <td>{{ $field['length'] }}</td>
                                        <td>{{ $field['purpose'] }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>

                    @elseif (($content['diagram_type'] ?? '') === 'layer_stack')
                        <ul class="notes-steps">
                            @foreach (collect($content['layers'])->sortByDesc('level') as $layer)
                                <li>
                                    <strong>{{ $layer['label'] }}</strong>
                                    @if (! empty($layer['protocols'])) ({{ $layer['protocols'] }})@endif
                                    — {{ $layer['role'] ?? '' }}
                                </li>
                            @endforeach
                        </ul>

                    @elseif (($content['diagram_type'] ?? '') === 'fiber_comparison')
                        <ul class="notes-steps">
                            @foreach ($content['modes'] as $mode)
                                <li>
                                    <strong>{{ $mode['label'] }}:</strong>
                                    {{ $mode['description'] ?? '' }}
                                </li>
                            @endforeach
                        </ul>

                    @elseif (($content['diagram_type'] ?? '') === 'mode_transition')
                        <ul class="notes-steps">
                            @foreach ($content['modes'] as $mode)
                                <li>
                                    <strong>{{ $mode['label'] }}</strong> ({{ $mode['prompt'] ?? '' }})
                                    @if (! empty($mode['command'])) ← {{ $mode['command'] }}@endif
                                </li>
                            @endforeach
                        </ul>
                        @if (! empty($content['note']))
                            <div class="notes-callout">{{ str_replace('`', '', $content['note']) }}</div>
                        @endif

                    @else
                        <div class="notes-callout">
                            <span class="notes-label">Diagram:</span>
                            {{ $section->title ?? 'See the interactive diagram in the app.' }}
                        </div>
                    @endif

                {{-- Animation: sketched topology + step narration --}}
                @elseif ($section->type === 'animation')
                    @if (($content['diagram_type'] ?? '') === 'topology')
                        @include('components.notes.sketch-topology', ['content' => $content])
                    @endif
                    @if (! empty($content['steps']))
                        <ol class="notes-steps">
                            @foreach ($content['steps'] as $step)
                                <li>{{ str_replace('`', '', $step['narration'] ?? '') }}</li>
                            @endforeach
                        </ol>
                    @endif

                {{-- Interactive / anything else --}}
                @else
                    <div class="notes-callout">
                        <span class="notes-label">{{ ucfirst($section->type) }}:</span>
                        {{ $section->title ?? 'Interactive content — see it in the app.' }}
                    </div>
                @endif
            </div>
        @endforeach

        @if ($lesson->quiz && $lesson->quiz->questions->isNotEmpty())
            <div class="notes-section">
                <div class="notes-h2">Quiz review</div>
                @foreach ($lesson->quiz->questions as $q)
                    <div class="notes-q">
                        <div class="notes-q-text">{{ $q->order }}. {{ $q->question }}</div>
                        <ul class="notes-q-opts">
                            @foreach ($q->options as $opt)
                                <li @class(['notes-q-correct' => $opt->is_correct])>
                                    {{ $opt->label }}. {{ $opt->text }}@if ($opt->is_correct) ✓@endif
                                </li>
                            @endforeach
                        </ul>
                    </div>
                @endforeach
            </div>
        @endif

        <div class="notes-footer">— end of Day {{ $day }} notes —</div>
    </div>
</div>
