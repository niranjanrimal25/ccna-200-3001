@props(['section' => null, 'content' => []])

<div class="prose prose-invert prose-zinc max-w-none">
    {!! Illuminate\Support\Str::markdown($content['body'] ?? '') !!}
</div>
