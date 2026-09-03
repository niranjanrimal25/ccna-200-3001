<?php

use App\Http\Controllers\LabController;
use App\Http\Controllers\LessonController;
use Illuminate\Support\Facades\Route;

Route::get('/', [LessonController::class, 'index'])->name('home');

Route::get('/topics/{topic:slug}/lessons/{lesson:slug}', [LessonController::class, 'show'])
    ->name('lessons.show');

Route::get('/labs/router', [LabController::class, 'router'])->name('labs.router');
