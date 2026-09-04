@props(['section' => null, 'content' => []])

@php
    $type = $content['diagram_type'] ?? 'topology';
@endphp

@if ($type === 'device_gallery')
    @include('components.svg.diagrams.device-gallery', ['content' => $content])
@elseif ($type === 'topology')
    <div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <x-svg.topology :nodes="$content['nodes']" :links="$content['links'] ?? []" />
    </div>
@elseif ($type === 'fiber_comparison')
    @include('components.svg.diagrams.fiber-comparison', ['content' => $content])
@elseif ($type === 'layer_stack')
    @include('components.svg.diagrams.layer-stack', ['content' => $content])
@elseif ($type === 'frame_fields')
    @include('components.svg.diagrams.frame-fields', ['content' => $content])
@elseif ($type === 'mode_transition')
    @include('components.svg.diagrams.mode-transition', ['content' => $content])
@else
    <div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <p class="text-sm text-zinc-400">Unknown diagram type: {{ $type }}</p>
    </div>
@endif
