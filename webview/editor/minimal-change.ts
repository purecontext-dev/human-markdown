export function minimalChange(
  oldStr: string,
  newStr: string,
): { from: number; to: number; insert: string } | null {
  if (oldStr === newStr) return null
  let pre = 0
  const min = Math.min(oldStr.length, newStr.length)
  while (pre < min && oldStr[pre] === newStr[pre]) pre++
  let suf = 0
  while (suf < min - pre && oldStr[oldStr.length - 1 - suf] === newStr[newStr.length - 1 - suf])
    suf++
  return { from: pre, to: oldStr.length - suf, insert: newStr.slice(pre, newStr.length - suf) }
}
