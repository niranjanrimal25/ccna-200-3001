@props(['section' => null, 'content' => []])

<div class="prose prose-invert prose-stone max-w-none">
    {!! Illuminate\Support\Str::markdown($content['body'] ?? '') !!}
</div>
