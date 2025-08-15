import { ApiError } from "./api-client"

export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return "Please log in to continue"
      case 403:
        return "You don't have permission to perform this action"
      case 404:
        return "The requested resource was not found"
      case 422:
        return "Please check your input and try again"
      case 500:
        return "Server error. Please try again later"
      default:
        return error.message || "An unexpected error occurred"
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return "An unexpected error occurred"
}

export function showErrorToast(error: unknown) {
  const message = handleApiError(error)
  // You can integrate with your toast system here
  console.error("Error:", message)
  return message
}
