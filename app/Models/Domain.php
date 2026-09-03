<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Domain extends Model
{
    protected $fillable = ['code', 'title', 'order'];

    protected $casts = ['order' => 'integer'];

    public function topics(): HasMany
    {
        return $this->hasMany(Topic::class);
    }
}
