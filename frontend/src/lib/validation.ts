
export type ValidationResult = {
  valid: boolean
  errors: Record<string, string>
}

export function validateRequired(payload: Record<string, any>, fields: string[]): ValidationResult {
  const errors: Record<string, string> = {}
  fields.forEach((field) => {
    const value = payload[field]
    if (value === undefined || value === null || String(value).trim() === '') errors[field] = 'Pflichtfeld'
  })
  return { valid: Object.keys(errors).length === 0, errors }
}

export function requireOrAlert(payload: Record<string, any>, fields: string[]) {
  const result = validateRequired(payload, fields)
  if (!result.valid) {
    alert(`Bitte ausfüllen: ${Object.keys(result.errors).join(', ')}`)
    return false
  }
  return true
}
