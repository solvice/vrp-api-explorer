/**
 * Input Sanitization Utility
 *
 * Validates and sanitizes user input to prevent:
 * - Injection attacks (SQL, NoSQL, command injection)
 * - XSS attacks
 * - Malformed data that could crash the system
 */

import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp';

export interface SanitizationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitized?: Vrp.VrpSyncSolveParams;
}

/**
 * Pattern for safe names (alphanumeric, common punctuation)
 * Prevents injection attacks via job/resource names
 * Allows: letters, numbers, spaces, underscore, dash, dot, comma, parentheses, colon
 */
const SAFE_NAME_PATTERN = /^[a-zA-Z0-9_\- .,():#@]+$/;
const MAX_NAME_LENGTH = 100;

/**
 * Check if a string contains suspicious patterns
 */
function containsSuspiciousPattern(value: string): boolean {
  const suspiciousPatterns = [
    /[<>]/,                    // HTML tags
    /javascript:/i,            // JavaScript protocol
    /on\w+=/i,                 // Event handlers (onclick, onload, etc.)
    /\${/,                     // Template literals
    /`/,                       // Backticks
    /<script/i,                // Script tags
    /exec|eval|system/i,       // Command execution
  ];

  return suspiciousPatterns.some(pattern => pattern.test(value));
}

/**
 * Sanitize a name string
 */
function sanitizeName(name: string, context: string): { valid: boolean; error?: string; sanitized: string } {
  if (!name || typeof name !== 'string') {
    return {
      valid: false,
      error: `${context}: Name is required and must be a string`,
      sanitized: '',
    };
  }

  // Trim whitespace
  const trimmed = name.trim();

  // Check length
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: `${context}: Name cannot be empty`,
      sanitized: '',
    };
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: `${context}: Name too long (max ${MAX_NAME_LENGTH} characters)`,
      sanitized: '',
    };
  }

  // Check for suspicious patterns
  if (containsSuspiciousPattern(trimmed)) {
    return {
      valid: false,
      error: `${context}: Name contains invalid characters`,
      sanitized: '',
    };
  }

  // Check against safe pattern
  if (!SAFE_NAME_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: `${context}: Name contains invalid characters (only alphanumeric and .,()-_:#@ allowed)`,
      sanitized: '',
    };
  }

  return {
    valid: true,
    sanitized: trimmed,
  };
}

/**
 * Sanitize VRP request data
 */
export function sanitizeVrpInput(vrpData: Vrp.VrpSyncSolveParams): SanitizationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Create a copy to sanitize
  const sanitized = JSON.parse(JSON.stringify(vrpData)) as Vrp.VrpSyncSolveParams;

  // Validate and sanitize job names
  if (Array.isArray(sanitized.jobs)) {
    const jobNames = new Set<string>();

    sanitized.jobs = sanitized.jobs.map((job, idx) => {
      const nameResult = sanitizeName(job.name || '', `Job ${idx}`);

      if (!nameResult.valid) {
        errors.push(nameResult.error || 'Invalid job name');
        return job;
      }

      // Check for duplicate names
      if (jobNames.has(nameResult.sanitized)) {
        errors.push(`Job ${idx}: Duplicate name "${nameResult.sanitized}"`);
      }
      jobNames.add(nameResult.sanitized);

      // Sanitize time windows
      if (job.windows && job.windows.length > 5) {
        warnings.push(`Job "${nameResult.sanitized}": Many time windows (${job.windows.length}) may slow optimization`);
      }

      return {
        ...job,
        name: nameResult.sanitized,
      };
    });
  }

  // Validate and sanitize resource names
  if (Array.isArray(sanitized.resources)) {
    const resourceNames = new Set<string>();

    sanitized.resources = sanitized.resources.map((resource, idx) => {
      const nameResult = sanitizeName(resource.name || '', `Resource ${idx}`);

      if (!nameResult.valid) {
        errors.push(nameResult.error || 'Invalid resource name');
        return resource;
      }

      // Check for duplicate names
      if (resourceNames.has(nameResult.sanitized)) {
        errors.push(`Resource ${idx}: Duplicate name "${nameResult.sanitized}"`);
      }
      resourceNames.add(nameResult.sanitized);

      return {
        ...resource,
        name: nameResult.sanitized,
      };
    });
  }

  // Validate coordinates if present
  if (Array.isArray(sanitized.jobs)) {
    sanitized.jobs.forEach((job, idx) => {
      if (job.location) {
        const { latitude, longitude } = job.location;

        if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
          errors.push(`Job "${job.name || idx}": Invalid latitude (must be -90 to 90)`);
        }

        if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
          errors.push(`Job "${job.name || idx}": Invalid longitude (must be -180 to 180)`);
        }
      }
    });
  }

  // Validate resource shift locations
  if (Array.isArray(sanitized.resources)) {
    sanitized.resources.forEach((resource, idx) => {
      resource.shifts?.forEach((shift, shiftIdx) => {
        if (shift.start) {
          const { latitude, longitude } = shift.start;

          if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
            errors.push(`Resource "${resource.name || idx}" shift ${shiftIdx}: Invalid start latitude`);
          }

          if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
            errors.push(`Resource "${resource.name || idx}" shift ${shiftIdx}: Invalid start longitude`);
          }
        }
      });
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitized: errors.length === 0 ? sanitized : undefined,
  };
}

/**
 * Sanitize generic string input (for OpenAI prompts, etc.)
 */
export function sanitizeTextInput(text: string, maxLength: number = 10000): { valid: boolean; error?: string; sanitized: string } {
  if (typeof text !== 'string') {
    return {
      valid: false,
      error: 'Input must be a string',
      sanitized: '',
    };
  }

  // Check length
  if (text.length > maxLength) {
    return {
      valid: false,
      error: `Input too long (max ${maxLength} characters)`,
      sanitized: '',
    };
  }

  // Check for suspicious patterns
  if (containsSuspiciousPattern(text)) {
    return {
      valid: false,
      error: 'Input contains potentially unsafe content',
      sanitized: '',
    };
  }

  // Trim excessive whitespace
  const sanitized = text.trim();

  return {
    valid: true,
    sanitized,
  };
}