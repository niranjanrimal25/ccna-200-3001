@props(['section' => null, 'content' => []])

<div class="overflow-x-auto rounded-xl border border-zinc-800">
    <table class="w-full text-sm">
        <thead>
            <tr class="border-b border-zinc-800 bg-zinc-900 text-left">
                @foreach ($content['headers'] as $header)
                    <th class="px-4 py-2.5 font-semibold text-zinc-300">{{ $header }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody class="divide-y divide-zinc-800 bg-zinc-900/40">
            @foreach ($content['rows'] as $row)
                <tr>
                    @foreach ($row as $i => $cell)
                        <td @class(['px-4 py-2.5 text-zinc-300', 'font-medium text-zinc-100' => $i === 0])>
                            {{ $cell }}
                        </td>
                    @endforeach
                </tr>
            @endforeach
        </tbody>
    </table>
</div>
