import { NextResponse } from 'next/server'

// Standardized API error response format
export interface ApiError {
  success: false
  error: string
  details?: any
  code?: string
}

// Standardized API success response format
export interface ApiSuccess<T> {
  success: true
  data: T
}

// Union type for API responses
export type ApiResponse<T> = ApiSuccess<T> | ApiError

// Standardized error response helper
export function createErrorResponse(
  error: string,
  status: number = 500,
  details?: any,
  code?: string
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details && { details }),
      ...(code && { code }),
    },
    { status }
  )
}

// Standardized success response helper
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  )
}

// Common error types and status codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const