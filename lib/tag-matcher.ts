/**
 * Result of matching job tags against resource tags
 */
export interface TagMatchResult {
  /** All hard-constraint tags are present on the resource */
  allHardMatched: boolean
  /** All soft-constraint tags are present on the resource */
  allSoftMatched: boolean
  /** Tags that were required and matched */
  matchedTags: string[]
  /** Hard-constraint tags that are missing (should not happen in valid solution) */
  missingHardTags: string[]
  /** Soft-constraint tags that are missing (acceptable but not ideal) */
  missingSoftTags: string[]
  /** Extra tags the resource has but the job doesn't require */
  extraTags: string[]
  /** Whether there are any tag requirements */
  hasRequirements: boolean
}

/**
 * Match job tags against resource tags to determine compatibility
 *
 * @param jobTags - Tags required by the job (with hard/soft constraint info)
 * @param resourceTags - Tags available on the resource (simple string array)
 * @returns Detailed tag matching result
 */
export function matchTags(
  jobTags: Array<{ name: string; hard?: boolean; weight?: number }> | undefined,
  resourceTags: string[] | undefined
): TagMatchResult {
  // Handle undefined or empty cases
  const jobTagList = jobTags || []
  const resourceTagSet = new Set(resourceTags || [])

  // If no tags required, it's a perfect match
  if (jobTagList.length === 0) {
    return {
      allHardMatched: true,
      allSoftMatched: true,
      matchedTags: [],
      missingHardTags: [],
      missingSoftTags: [],
      extraTags: Array.from(resourceTagSet),
      hasRequirements: false
    }
  }

  // Separate hard and soft tags
  const hardTags = jobTagList.filter(tag => tag.hard !== false) // Default to hard if not specified
  const softTags = jobTagList.filter(tag => tag.hard === false)

  // Check which tags match
  const matchedTags: string[] = []
  const missingHardTags: string[] = []
  const missingSoftTags: string[] = []

  for (const tag of hardTags) {
    if (resourceTagSet.has(tag.name)) {
      matchedTags.push(tag.name)
      resourceTagSet.delete(tag.name) // Remove from set to track extras
    } else {
      missingHardTags.push(tag.name)
    }
  }

  for (const tag of softTags) {
    if (resourceTagSet.has(tag.name)) {
      matchedTags.push(tag.name)
      resourceTagSet.delete(tag.name)
    } else {
      missingSoftTags.push(tag.name)
    }
  }

  // Remaining tags in resourceTagSet are extras
  const extraTags = Array.from(resourceTagSet)

  return {
    allHardMatched: missingHardTags.length === 0,
    allSoftMatched: missingSoftTags.length === 0,
    matchedTags,
    missingHardTags,
    missingSoftTags,
    extraTags,
    hasRequirements: true
  }
}

/**
 * Get a human-readable summary of tag match quality
 */
export function getTagMatchSummary(result: TagMatchResult): string {
  if (!result.hasRequirements) {
    return 'No tag requirements'
  }

  if (result.allHardMatched && result.allSoftMatched) {
    return 'Perfect match'
  }

  if (!result.allHardMatched) {
    return 'Hard constraint violation'
  }

  if (!result.allSoftMatched) {
    return 'Soft constraint violation'
  }

  return 'Unknown'
}

/**
 * Get variant for Shadcn Badge component based on match result
 */
export function getTagMatchBadgeVariant(result: TagMatchResult): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!result.hasRequirements) {
    return 'outline'
  }

  if (!result.allHardMatched) {
    return 'destructive' // Red for hard constraint violations
  }

  if (!result.allSoftMatched) {
    return 'default' // Default (usually blue/primary) for soft constraint violations
  }

  return 'secondary' // Gray for perfect match (but we won't show badge for perfect matches)
}
