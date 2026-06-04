// Standard API response envelope
// All endpoints return { success, data } or { success, message, errors? }
// to provide a consistent contract for frontend consumers.

export const successResponse = <T>(data: T): { success: true; data: T } => ({
  success: true,
  data,
});

export const errorResponse = (
  message: string,
  errors?: Record<string, string[] | undefined>,
): { success: false; message: string; errors?: Record<string, string[] | undefined> } => ({
  success: false,
  message,
  ...(errors !== undefined && { errors }),
});
