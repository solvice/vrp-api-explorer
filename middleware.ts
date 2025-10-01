import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware for request validation and security
 *
 * Enforces:
 * - Request size limits (prevent DoS via large payloads)
 * - Content-Type validation for API routes
 */

// Maximum request body size in bytes (1MB)
const MAX_REQUEST_SIZE = 1_000_000; // 1MB

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check Content-Length header
  const contentLength = request.headers.get('content-length');

  if (contentLength) {
    const size = parseInt(contentLength, 10);

    if (size > MAX_REQUEST_SIZE) {
      console.warn(`⚠️  Request too large: ${size} bytes (max: ${MAX_REQUEST_SIZE})`);

      return NextResponse.json(
        {
          error: 'Request too large',
          message: `Request body exceeds maximum size of ${(MAX_REQUEST_SIZE / 1_000_000).toFixed(1)}MB`,
          type: 'payload_too_large',
          maxSize: MAX_REQUEST_SIZE,
          actualSize: size,
        },
        { status: 413 } // Payload Too Large
      );
    }
  }

  // For POST/PUT/PATCH requests to API routes, validate Content-Type
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');

    if (!contentType) {
      return NextResponse.json(
        {
          error: 'Missing Content-Type header',
          message: 'API requests must include a Content-Type header',
          type: 'invalid_request',
        },
        { status: 400 }
      );
    }

    // Allow application/json and multipart/form-data (for file uploads)
    const isValidContentType =
      contentType.includes('application/json') ||
      contentType.includes('multipart/form-data');

    if (!isValidContentType) {
      return NextResponse.json(
        {
          error: 'Invalid Content-Type',
          message: 'API requests must use application/json or multipart/form-data',
          type: 'invalid_request',
        },
        { status: 415 } // Unsupported Media Type
      );
    }
  }

  return NextResponse.next();
}

// Configure which routes this middleware applies to
export const config = {
  matcher: '/api/:path*',
};