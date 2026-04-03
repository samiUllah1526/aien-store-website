import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientRustPanicError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from '@prisma/client-runtime-utils';

export type PublicErrorBody = { status: number; message: string };

/**
 * Maps Prisma errors to HTTP status + safe, user-facing messages.
 * Never forwards Prisma `error.message` (query/SQL/constraint details) to clients.
 */
export function getPublicPrismaErrorResponse(
  err: unknown,
): PublicErrorBody | null {
  if (err instanceof PrismaClientKnownRequestError) {
    return mapKnownRequestError(err);
  }
  if (err instanceof PrismaClientValidationError) {
    return {
      status: 400,
      message: 'Invalid request data.',
    };
  }
  if (err instanceof PrismaClientUnknownRequestError) {
    return {
      status: 500,
      message: 'A server error occurred. Please try again.',
    };
  }
  if (err instanceof PrismaClientInitializationError) {
    return {
      status: 503,
      message: 'Service temporarily unavailable. Please try again later.',
    };
  }
  if (err instanceof PrismaClientRustPanicError) {
    return {
      status: 500,
      message: 'A server error occurred. Please try again.',
    };
  }
  return null;
}

function mapKnownRequestError(
  err: PrismaClientKnownRequestError,
): PublicErrorBody {
  const meta = err.meta as Record<string, unknown> | undefined;
  switch (err.code) {
    case 'P2002':
      return { status: 409, message: uniqueViolationMessage(meta) };
    case 'P2003':
      return {
        status: 400,
        message:
          'Referenced record does not exist or cannot be linked. Check related IDs.',
      };
    case 'P2011':
    case 'P2012':
      return {
        status: 400,
        message: 'A required value is missing.',
      };
    case 'P2014':
      return {
        status: 400,
        message: 'This change conflicts with related data.',
      };
    case 'P2015':
      return {
        status: 400,
        message: 'A related record could not be found.',
      };
    case 'P2025':
      return { status: 404, message: 'Record not found.' };
    default:
      return {
        status: 400,
        message: 'The request could not be completed.',
      };
  }
}

/** Uses only meta.target shape/hints — no raw SQL or engine text. */
function uniqueViolationMessage(
  meta: Record<string, unknown> | undefined,
): string {
  const raw = meta?.target;
  const parts: string[] = Array.isArray(raw)
    ? raw.map(String)
    : typeof raw === 'string'
      ? [raw]
      : [];
  const t = parts.join(' ').toLowerCase();

  if (t.includes('sku')) {
    return 'This SKU is already in use. Choose a different SKU.';
  }
  if (t.includes('slug')) {
    return 'This URL slug is already taken. Choose a different slug.';
  }
  if (t.includes('email')) {
    return 'This email is already in use.';
  }
  if (t.includes('code')) {
    return 'This code is already in use.';
  }
  if (
    t.includes('color') ||
    t.includes('size') ||
    t.includes('product_id') ||
    t.includes('product_variants')
  ) {
    return 'A variant with this color and size already exists for this product.';
  }
  return 'This value is already in use.';
}
