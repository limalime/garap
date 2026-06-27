// Minimal markdown renderer (Notes preview). Dependency-free so it bundles on
// every platform. Supports headings, bullet/checklist items, fenced code blocks,
// and inline **bold**, *italic*, `code`.

import { Text, View } from 'react-native';

import { colors } from '@/src/utils/colors';

// Split a line into styled inline segments for **bold**, *italic*, `code`.
function renderInline(line: string, keyBase: string) {
  const tokens = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean);
  return tokens.map((tok, i) => {
    const key = `${keyBase}-${i}`;
    if (tok.startsWith('**') && tok.endsWith('**')) {
      return (
        <Text key={key} className="font-bold text-text-primary">
          {tok.slice(2, -2)}
        </Text>
      );
    }
    if (tok.startsWith('*') && tok.endsWith('*')) {
      return (
        <Text key={key} className="italic text-text-primary">
          {tok.slice(1, -1)}
        </Text>
      );
    }
    if (tok.startsWith('`') && tok.endsWith('`')) {
      return (
        <Text key={key} className="rounded bg-white/10 px-1 font-mono text-primary-light">
          {tok.slice(1, -1)}
        </Text>
      );
    }
    return (
      <Text key={key} className="text-text-primary">
        {tok}
      </Text>
    );
  });
}

export function MarkdownPreview({ source }: { source: string }) {
  const lines = source.split('\n');
  const blocks: React.ReactNode[] = [];
  let inCode = false;
  let codeBuffer: string[] = [];

  lines.forEach((raw, idx) => {
    const line = raw;

    if (line.trim().startsWith('```')) {
      if (inCode) {
        blocks.push(
          <View key={`code-${idx}`} className="my-1 rounded-card bg-black/40 p-3">
            <Text className="font-mono text-xs text-text-secondary">{codeBuffer.join('\n')}</Text>
          </View>
        );
        codeBuffer = [];
        inCode = false;
      } else {
        inCode = true;
      }
      return;
    }
    if (inCode) {
      codeBuffer.push(line);
      return;
    }

    if (line.startsWith('### ')) {
      blocks.push(
        <Text key={idx} className="mt-2 text-base font-bold text-text-primary">
          {line.slice(4)}
        </Text>
      );
    } else if (line.startsWith('## ')) {
      blocks.push(
        <Text key={idx} className="mt-2 text-lg font-bold text-text-primary">
          {line.slice(3)}
        </Text>
      );
    } else if (line.startsWith('# ')) {
      blocks.push(
        <Text key={idx} className="mt-2 text-xl font-bold text-text-primary">
          {line.slice(2)}
        </Text>
      );
    } else if (/^\s*-\s*\[[ xX]\]\s/.test(line)) {
      const checked = /\[[xX]\]/.test(line);
      const text = line.replace(/^\s*-\s*\[[ xX]\]\s/, '');
      blocks.push(
        <View key={idx} className="my-0.5 flex-row gap-2">
          <Text style={{ color: checked ? colors.status.active : colors.textSecondary }}>
            {checked ? '☑' : '☐'}
          </Text>
          <Text className="flex-1 text-text-primary">{renderInline(text, `c${idx}`)}</Text>
        </View>
      );
    } else if (/^\s*[-*]\s/.test(line)) {
      const text = line.replace(/^\s*[-*]\s/, '');
      blocks.push(
        <View key={idx} className="my-0.5 flex-row gap-2">
          <Text className="text-primary-light">•</Text>
          <Text className="flex-1 text-text-primary">{renderInline(text, `b${idx}`)}</Text>
        </View>
      );
    } else if (line.trim() === '') {
      blocks.push(<View key={idx} className="h-2" />);
    } else {
      blocks.push(
        <Text key={idx} className="leading-5 text-text-primary">
          {renderInline(line, `p${idx}`)}
        </Text>
      );
    }
  });

  // Flush an unterminated code block.
  if (inCode && codeBuffer.length) {
    blocks.push(
      <View key="code-final" className="my-1 rounded-card bg-black/40 p-3">
        <Text className="font-mono text-xs text-text-secondary">{codeBuffer.join('\n')}</Text>
      </View>
    );
  }

  return <View>{blocks}</View>;
}
