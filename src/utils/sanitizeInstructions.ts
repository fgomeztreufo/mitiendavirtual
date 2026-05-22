export function sanitizeInstructions(input: string | null | undefined): string {
  if (!input) return ''
  let s = String(input)

  // Remove fenced code blocks ```...```
  s = s.replace(/```[\s\S]*?```/g, '')

  // Remove inline code `...`
  s = s.replace(/`[^`]*`/g, '')

  // Remove script tags
  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')

  // Remove any remaining HTML tags
  s = s.replace(/<[^>]+>/g, '')

  // Replace dangerous command keywords with placeholder
  const forbidden = /\b(?:curl|wget|eval|exec|import\b|require\b|os\.|subprocess|ssh|scp|rm\s+-rf|sudo|nc|netcat|bash\b|sh\b|python\b)\b/gi
  s = s.replace(forbidden, '[removed]')

  // Collapse excessive whitespace and trim
  s = s.replace(/\s{2,}/g, ' ').trim()

  // Limit length to avoid overly long prompts
  const MAX = 2000
  if (s.length > MAX) s = s.slice(0, MAX)

  return s
}

export function looksMalicious(input: string | null | undefined): boolean {
  if (!input) return false
  const suspect = /\b(?:eval\(|exec\(|system\(|curl\s+http|wget\s+http|base64\s+-d|rm\s+-rf|ssh\s+|python\s+-c)\b/gi
  return suspect.test(String(input))
}
