@props(['section' => null, 'content' => []])

<div class="prose prose-invert prose-slate max-w-none">
    {!! Illuminate\Support\Str::markdown($content['body'] ?? '') !!}
</div>
