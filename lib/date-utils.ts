/**
 * Utility functions for date handling
 */

/**
 * Parse a date string in the format "18 August 2025 at 14:48:33 UTC-4"
 * @param dateString - The date string to parse
 * @returns Date object or null if parsing fails
 */
export function parseGrantedAtDate(dateString: string): Date | null {
  if (!dateString) return null;
  
  try {
    // Handle the format "18 August 2025 at 14:48:33 UTC-4"
    const match = dateString.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2}):(\d{2})\s+(UTC[+-]\d{1,2})$/);
    
    if (match) {
      const [, day, month, year, hour, minute, second, timezone] = match;
      
      // Convert month name to number
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthIndex = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase());
      
      if (monthIndex === -1) {
        throw new Error(`Invalid month: ${month}`);
      }
      
      // Create date string in ISO format
      const isoDateString = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:${second}${timezone.replace('UTC', '')}:00`;
      
      return new Date(isoDateString);
    }
    
    // Fallback to standard Date parsing
    return new Date(dateString);
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return null;
  }
}

/**
 * Convert any date-like value to a Date object
 * @param dateValue - Date object, string, or Firestore timestamp
 * @returns Date object or null if conversion fails
 */
export function convertToDate(dateValue: unknown): Date | null {
  if (!dateValue) return null;
  
  // If it's already a Date object
  if (dateValue instanceof Date) {
    return dateValue;
  }
  
  // If it's a string, try to parse it
  if (typeof dateValue === 'string') {
    // First try the specific format "18 August 2025 at 14:48:33 UTC-4"
    const parsed = parseGrantedAtDate(dateValue);
    if (parsed) return parsed;
    
    // Then try standard Date parsing
    const standardParsed = new Date(dateValue);
    if (!isNaN(standardParsed.getTime())) {
      return standardParsed;
    }
    
    console.error('Unable to parse date string:', dateValue);
    return null;
  }
  
  // If it's a Firestore timestamp (has toDate method)
  if (dateValue && typeof (dateValue as any).toDate === 'function') {
    return (dateValue as any).toDate();
  }
  
  // If it's a timestamp number
  if (typeof dateValue === 'number') {
    return new Date(dateValue);
  }
  
  // If it's an object with seconds/nanoseconds (Firestore timestamp)
  if (dateValue && typeof dateValue === 'object' && (dateValue as any).seconds) {
    return new Date((dateValue as any).seconds * 1000);
  }
  
  console.error('Unable to convert to Date:', dateValue, 'Type:', typeof dateValue);
  return null;
}

/**
 * Format a date for display
 * @param date - Date object or date string
 * @returns Formatted date string
 */
export function formatGrantedAtDate(date: unknown): string {
  if (!date) return 'Not set';
  
  const dateObj = convertToDate(date);
  
  if (!dateObj) return 'Invalid date';
  
  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });
}

/**
 * Format a date for display in a shorter format
 * @param date - Date object or date string
 * @returns Formatted date string
 */
export function formatGrantedAtDateShort(date: unknown): string {
  if (!date) return 'Not set';
  
  const dateObj = convertToDate(date);
  
  if (!dateObj) return 'Invalid date';
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Create a date string in the format "18 August 2025 at 14:48:33 UTC-4"
 * @param date - Date object
 * @returns Formatted date string
 */
export function createGrantedAtDateString(date: Date): string {
  const day = date.getDate();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  // Get timezone offset
  const offset = date.getTimezoneOffset();
  const offsetHours = Math.abs(Math.floor(offset / 60));
  const offsetSign = offset > 0 ? '-' : '+';
  
  return `${day} ${month} ${year} at ${hours}:${minutes}:${seconds} UTC${offsetSign}${offsetHours}`;
}
