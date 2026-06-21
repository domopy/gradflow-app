export function joinRecognizedSections(sections: string[][]): string {
  return sections
    .map((lines, index) => {
      const text = lines.map((line) => line.trim()).filter(Boolean).join('\n');
      return text ? `【图片${index + 1}】\n${text}` : '';
    })
    .filter(Boolean)
    .join('\n\n');
}
