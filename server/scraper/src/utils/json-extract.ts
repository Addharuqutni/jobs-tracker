export function extractNextData(html: string): unknown | null {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function extractWindowVar(html: string, varName: string): unknown | null {
  const pattern = new RegExp(`window\\.${varName}\\s*=\\s*(\\{.*?\\});\\s*\\n`, 's');
  const match = html.match(pattern);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function extractScriptData(html: string, dataAutomation: string): string | null {
  const pattern = new RegExp(`<script[^>]*data-automation="${dataAutomation}"[^>]*>(.*?)</script>`, 's');
  const match = html.match(pattern);
  return match?.[1] ?? null;
}
