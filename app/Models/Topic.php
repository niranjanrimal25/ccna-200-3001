<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Topic extends Model
{
    protected $fillable = ['domain_id', 'slug', 'title', 'order'];

    protected $casts = ['order' => 'integer'];

    public function domain(): BelongsTo
    {
        return $this->belongsTo(Domain::class);
    }

    public function lessons(): HasMany
    {
        return $this->hasMany(Lesson::class)->orderBy('order');
    }
}
