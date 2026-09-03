@props(['section' => null, 'content' => []])

<div class="overflow-x-auto rounded-xl border border-slate-800">
    <table class="w-full text-sm">
        <thead>
            <tr class="border-b border-slate-800 bg-slate-900 text-left">
                @foreach ($content['headers'] as $header)
                    <th class="px-4 py-2.5 font-semibold text-slate-300">{{ $header }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-800 bg-slate-900/40">
            @foreach ($content['rows'] as $row)
                <tr>
                    @foreach ($row as $i => $cell)
                        <td @class(['px-4 py-2.5 text-slate-300', 'font-medium text-slate-100' => $i === 0])>
                            {{ $cell }}
                        </td>
                    @endforeach
                </tr>
            @endforeach
        </tbody>
    </table>
</div>
