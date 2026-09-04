@extends('layouts.app')

@section('title', 'Router Lab — Cisco 2911')

@section('content')
<div x-data="routerLab" class="flex flex-col" style="min-height: calc(100vh - 6rem)">
    <div class="mb-4">
        <h1 class="text-2xl font-bold text-zinc-100">Router Lab</h1>
        <p class="mt-1 text-sm text-zinc-400">Cisco 2911 ISR — IOS 15.2(4)M5 &nbsp;·&nbsp; Type <kbd class="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300 text-xs">?</kbd> for help</p>
    </div>

    <div class="flex flex-col flex-1 overflow-hidden rounded-xl border border-zinc-800">
        <x-lab.router-panel />
        <x-lab.cli-terminal />
    </div>
</div>
@endsection
