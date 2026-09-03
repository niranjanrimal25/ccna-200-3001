<?php

namespace App\Http\Controllers;

use Illuminate\View\View;

class LabController extends Controller
{
    public function router(): View
    {
        $navDomains = \App\Models\Domain::with('topics.lessons')->orderBy('order')->get();

        return view('labs.router', compact('navDomains'));
    }
}
