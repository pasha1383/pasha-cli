<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;

class Handler extends ExceptionHandler
{
    protected function shouldReturnJson($request, \Throwable $e): bool
    {
        return $request->expectsJson() || $request->is('api/*');
    }
}
