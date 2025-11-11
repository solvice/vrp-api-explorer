import { matchTags, getTagMatchSummary, getTagMatchBadgeVariant, TagMatchResult } from '@/lib/tag-matcher'

describe('matchTags', () => {
  describe('perfect matches', () => {
    it('should return perfect match when all hard tags are present', () => {
      const jobTags = [
        { name: 'electrical', hard: true },
        { name: 'certified', hard: true }
      ]
      const resourceTags = ['electrical', 'certified', 'plumbing']

      const result = matchTags(jobTags, resourceTags)

      expect(result.allHardMatched).toBe(true)
      expect(result.allSoftMatched).toBe(true)
      expect(result.matchedTags).toEqual(['electrical', 'certified'])
      expect(result.missingHardTags).toEqual([])
      expect(result.missingSoftTags).toEqual([])
      expect(result.extraTags).toEqual(['plumbing'])
      expect(result.hasRequirements).toBe(true)
    })

    it('should return perfect match when all soft tags are present', () => {
      const jobTags = [
        { name: 'electrical', hard: false },
        { name: 'certified', hard: false }
      ]
      const resourceTags = ['electrical', 'certified']

      const result = matchTags(jobTags, resourceTags)

      expect(result.allHardMatched).toBe(true)
      expect(result.allSoftMatched).toBe(true)
      expect(result.matchedTags).toEqual(['electrical', 'certified'])
      expect(result.missingHardTags).toEqual([])
      expect(result.missingSoftTags).toEqual([])
      expect(result.hasRequirements).toBe(true)
    })

    it('should return perfect match with mixed hard and soft tags all present', () => {
      const jobTags = [
        { name: 'electrical', hard: true },
        { name: 'certified', hard: false }
      ]
      const resourceTags = ['electrical', 'certified', 'hvac']

      const result = matchTags(jobTags, resourceTags)

      expect(result.allHardMatched).toBe(true)
      expect(result.allSoftMatched).toBe(true)
      expect(result.matchedTags).toEqual(['electrical', 'certified'])
      expect(result.extraTags).toEqual(['hvac'])
    })
  })

  describe('soft constraint violations', () => {
    it('should detect missing soft tags', () => {
      const jobTags = [
        { name: 'electrical', hard: true },
        { name: 'certified', hard: false }
      ]
      const resourceTags = ['electrical'] // Missing 'certified' soft tag

      const result = matchTags(jobTags, resourceTags)

      expect(result.allHardMatched).toBe(true)
      expect(result.allSoftMatched).toBe(false)
      expect(result.matchedTags).toEqual(['electrical'])
      expect(result.missingHardTags).toEqual([])
      expect(result.missingSoftTags).toEqual(['certified'])
    })

    it('should detect multiple missing soft tags', () => {
      const jobTags = [
        { name: 'electrical', hard: true },
        { name: 'certified', hard: false },
        { name: 'senior', hard: false }
      ]
      const resourceTags = ['electrical']

      const result = matchTags(jobTags, resourceTags)

      expect(result.allHardMatched).toBe(true)
      expect(result.allSoftMatched).toBe(false)
      expect(result.missingSoftTags).toEqual(['certified', 'senior'])
    })
  })

  describe('hard constraint violations', () => {
    it('should detect missing hard tags', () => {
      const jobTags = [
        { name: 'electrical', hard: true },
        { name: 'certified', hard: true }
      ]
      const resourceTags = ['electrical'] // Missing 'certified' hard tag

      const result = matchTags(jobTags, resourceTags)

      expect(result.allHardMatched).toBe(false)
      expect(result.allSoftMatched).toBe(true)
      expect(result.matchedTags).toEqual(['electrical'])
      expect(result.missingHardTags).toEqual(['certified'])
      expect(result.missingSoftTags).toEqual([])
    })

    it('should detect multiple missing hard tags', () => {
      const jobTags = [
        { name: 'electrical', hard: true },
        { name: 'certified', hard: true },
        { name: 'senior', hard: true }
      ]
      const resourceTags = ['electrical']

      const result = matchTags(jobTags, resourceTags)

      expect(result.allHardMatched).toBe(false)
      expect(result.missingHardTags).toEqual(['certified', 'senior'])
    })

    it('should detect both hard and soft missing tags', () => {
      const jobTags = [
        { name: 'electrical', hard: true },
        { name: 'certified', hard: true },
        { name: 'senior', hard: false }
      ]
      const resourceTags = ['electrical']

      const result = matchTags(jobTags, resourceTags)

      expect(result.allHardMatched).toBe(false)
      expect(result.allSoftMatched).toBe(false)
      expect(result.missingHardTags).toEqual(['certified'])
      expect(result.missingSoftTags).toEqual(['senior'])
    })
  })

  describe('edge cases', () => {
    it('should handle no job tags (no requirements)', () => {
      const jobTags: Array<{ name: string; hard?: boolean }> = []
      const resourceTags = ['electrical', 'plumbing']

      const result = matchTags(jobTags, resourceTags)

      expect(result.allHardMatched).toBe(true)
      expect(result.allSoftMatched).toBe(true)
      expect(result.matchedTags).toEqual([])
      expect(result.missingHardTags).toEqual([])
      expect(result.missingSoftTags).toEqual([])
      expect(result.extraTags).toEqual(['electrical', 'plumbing'])
      expect(result.hasRequirements).toBe(false)
    })

    it('should handle undefined job tags', () => {
      const result = matchTags(undefined, ['electrical'])

      expect(result.allHardMatched).toBe(true)
      expect(result.allSoftMatched).toBe(true)
      expect(result.hasRequirements).toBe(false)
      expect(result.extraTags).toEqual(['electrical'])
    })

    it('should handle no resource tags', () => {
      const jobTags = [{ name: 'electrical', hard: true }]
      const resourceTags: string[] = []

      const result = matchTags(jobTags, resourceTags)

      expect(result.allHardMatched).toBe(false)
      expect(result.missingHardTags).toEqual(['electrical'])
    })

    it('should handle undefined resource tags', () => {
      const jobTags = [{ name: 'electrical', hard: true }]

      const result = matchTags(jobTags, undefined)

      expect(result.allHardMatched).toBe(false)
      expect(result.missingHardTags).toEqual(['electrical'])
    })

    it('should handle both undefined', () => {
      const result = matchTags(undefined, undefined)

      expect(result.allHardMatched).toBe(true)
      expect(result.allSoftMatched).toBe(true)
      expect(result.hasRequirements).toBe(false)
    })
  })

  describe('default behavior', () => {
    it('should treat tags without hard property as hard constraints', () => {
      const jobTags = [
        { name: 'electrical' }, // No hard property specified
        { name: 'certified' }
      ]
      const resourceTags = ['electrical'] // Missing 'certified'

      const result = matchTags(jobTags, resourceTags)

      expect(result.allHardMatched).toBe(false)
      expect(result.missingHardTags).toEqual(['certified'])
      expect(result.missingSoftTags).toEqual([])
    })

    it('should treat tags with hard=undefined as hard constraints', () => {
      const jobTags = [
        { name: 'electrical', hard: undefined },
        { name: 'certified', hard: undefined }
      ]
      const resourceTags = ['electrical']

      const result = matchTags(jobTags, resourceTags)

      expect(result.allHardMatched).toBe(false)
      expect(result.missingHardTags).toEqual(['certified'])
    })
  })

  describe('extra tags tracking', () => {
    it('should track extra tags that resource has but job does not need', () => {
      const jobTags = [{ name: 'electrical', hard: true }]
      const resourceTags = ['electrical', 'plumbing', 'hvac', 'certified']

      const result = matchTags(jobTags, resourceTags)

      expect(result.extraTags).toEqual(['plumbing', 'hvac', 'certified'])
    })

    it('should not count matched tags as extras', () => {
      const jobTags = [
        { name: 'electrical', hard: true },
        { name: 'certified', hard: false }
      ]
      const resourceTags = ['electrical', 'certified', 'plumbing']

      const result = matchTags(jobTags, resourceTags)

      expect(result.extraTags).toEqual(['plumbing'])
      expect(result.extraTags).not.toContain('electrical')
      expect(result.extraTags).not.toContain('certified')
    })
  })
})

describe('getTagMatchSummary', () => {
  it('should return "No tag requirements" when no requirements', () => {
    const result: TagMatchResult = {
      allHardMatched: true,
      allSoftMatched: true,
      matchedTags: [],
      missingHardTags: [],
      missingSoftTags: [],
      extraTags: ['plumbing'],
      hasRequirements: false
    }

    expect(getTagMatchSummary(result)).toBe('No tag requirements')
  })

  it('should return "Perfect match" when all tags matched', () => {
    const result: TagMatchResult = {
      allHardMatched: true,
      allSoftMatched: true,
      matchedTags: ['electrical', 'certified'],
      missingHardTags: [],
      missingSoftTags: [],
      extraTags: [],
      hasRequirements: true
    }

    expect(getTagMatchSummary(result)).toBe('Perfect match')
  })

  it('should return "Hard constraint violation" when hard tags missing', () => {
    const result: TagMatchResult = {
      allHardMatched: false,
      allSoftMatched: true,
      matchedTags: ['electrical'],
      missingHardTags: ['certified'],
      missingSoftTags: [],
      extraTags: [],
      hasRequirements: true
    }

    expect(getTagMatchSummary(result)).toBe('Hard constraint violation')
  })

  it('should return "Soft constraint violation" when only soft tags missing', () => {
    const result: TagMatchResult = {
      allHardMatched: true,
      allSoftMatched: false,
      matchedTags: ['electrical'],
      missingHardTags: [],
      missingSoftTags: ['senior'],
      extraTags: [],
      hasRequirements: true
    }

    expect(getTagMatchSummary(result)).toBe('Soft constraint violation')
  })

  it('should prioritize hard constraint violation over soft', () => {
    const result: TagMatchResult = {
      allHardMatched: false,
      allSoftMatched: false,
      matchedTags: [],
      missingHardTags: ['electrical'],
      missingSoftTags: ['senior'],
      extraTags: [],
      hasRequirements: true
    }

    expect(getTagMatchSummary(result)).toBe('Hard constraint violation')
  })
})

describe('getTagMatchBadgeVariant', () => {
  it('should return "outline" for no requirements', () => {
    const result: TagMatchResult = {
      allHardMatched: true,
      allSoftMatched: true,
      matchedTags: [],
      missingHardTags: [],
      missingSoftTags: [],
      extraTags: [],
      hasRequirements: false
    }

    expect(getTagMatchBadgeVariant(result)).toBe('outline')
  })

  it('should return "secondary" for perfect match', () => {
    const result: TagMatchResult = {
      allHardMatched: true,
      allSoftMatched: true,
      matchedTags: ['electrical'],
      missingHardTags: [],
      missingSoftTags: [],
      extraTags: [],
      hasRequirements: true
    }

    expect(getTagMatchBadgeVariant(result)).toBe('secondary')
  })

  it('should return "destructive" for hard constraint violation', () => {
    const result: TagMatchResult = {
      allHardMatched: false,
      allSoftMatched: true,
      matchedTags: [],
      missingHardTags: ['electrical'],
      missingSoftTags: [],
      extraTags: [],
      hasRequirements: true
    }

    expect(getTagMatchBadgeVariant(result)).toBe('destructive')
  })

  it('should return "default" for soft constraint violation', () => {
    const result: TagMatchResult = {
      allHardMatched: true,
      allSoftMatched: false,
      matchedTags: ['electrical'],
      missingHardTags: [],
      missingSoftTags: ['senior'],
      extraTags: [],
      hasRequirements: true
    }

    expect(getTagMatchBadgeVariant(result)).toBe('default')
  })

  it('should prioritize hard constraint over soft for badge variant', () => {
    const result: TagMatchResult = {
      allHardMatched: false,
      allSoftMatched: false,
      matchedTags: [],
      missingHardTags: ['electrical'],
      missingSoftTags: ['senior'],
      extraTags: [],
      hasRequirements: true
    }

    expect(getTagMatchBadgeVariant(result)).toBe('destructive')
  })
})
