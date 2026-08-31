const charMap: { [key: string]: string } = {
  ą: 'ą',
  ü: 'ć',
  Ċ: 'ę',
  á: 'ł',
  Ĕ: 'ń',
  ó: 'ó',
  Ğ: 'ś',
  Ī: 'ż',
  Ĩ: 'ź',
  Ą: 'Ą',
  û: 'Ć',
  ĉ: 'Ę',
  à: 'Ł',
  ē: 'Ń',
  Ó: 'Ó',
  ĝ: 'Ś',
  ĩ: 'Ż',
  ħ: 'Ź',
}

export const correctText = (input: string): string => {
  return input
    .split('')
    .map((char) => charMap[char] || char)
    .join('')
}

export const calcWeight = (text: string, packsCount: number): number => {
  const size = text.match(/([0-9]{1,2}(?:,[0-9])?x[0-9]{2,4}x[0-9]{2,4})/i)
  const density = 700

  if (size) {
    return (
      size[0]
        .replace(/,/g, '.')
        .split('x')
        .reduce<number>((acc, item) => (acc * Number(item)) / 1000, 1) *
      packsCount *
      density
    )
  }

  return 0
}

export const combineRegex = (...regexes: RegExp[]) => regexes.map(regex => regex.source).join('');
