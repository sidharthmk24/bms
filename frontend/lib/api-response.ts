import { NextResponse } from 'next/server';
import { HttpError } from './errors';

export function apiSuccess<T>(data: T, message?: string, statusCode = 200) {
  return NextResponse.json(
    {
      success: true,
      statusCode,
      message,
      data,
    },
    { status: statusCode }
  );
}

export function apiError(error: unknown) {
  const isHttpErr =
    error instanceof HttpError ||
    (error && typeof error === 'object' && 'statusCode' in error && typeof (error as any).statusCode === 'number');

  if (isHttpErr) {
    const errObj = error as any;
    const statusCode = errObj.statusCode || 500;
    const name = errObj.name || 'HttpError';
    return NextResponse.json(
      {
        success: false,
        statusCode,
        message: errObj.message,
        error: name.replace('Exception', ''),
      },
      { status: statusCode }
    );
  }

  // Handle JSON parse errors
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return NextResponse.json(
      {
        success: false,
        statusCode: 400,
        message: 'Invalid JSON payload',
        error: 'BadRequest',
      },
      { status: 400 }
    );
  }

  // Handle generic errors
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  console.error('[API Error]', error);
  return NextResponse.json(
    {
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
      error: message,
    },
    { status: 500 }
  );
}
