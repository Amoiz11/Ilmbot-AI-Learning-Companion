/**
 * Utility function to format timestamps into 12-hour format with AM/PM (e.g., "12:09 AM", "2:15 PM").
 * Always enforces 'en-US' locale to avoid system/browser locale 24-hour format fallbacks.
 */
export function formatTime12Hour(dateInput = new Date()) {
  const date = typeof dateInput === 'number' || typeof dateInput === 'string'
    ? new Date(dateInput)
    : dateInput;

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
