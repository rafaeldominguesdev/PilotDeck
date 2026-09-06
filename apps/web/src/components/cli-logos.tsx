import { BRAND_ICON_DATA } from "./__generated__/brandIconData";

/**
 * Real brand marks for the executor CLIs. Server-safe inline SVG, offline.
 * Sources: BRAND_ICON_DATA captured from @lobehub/icons (MIT); Grok is the
 * official lobehub glyph (the Grok slash mark, not the X logo); OpenCode is
 * the official mark from opencode.ai/brand. Muse has no published mark yet.
 */

type BrandKey = keyof typeof BRAND_ICON_DATA;

function Brand({ name, variant = "color" }: { name: BrandKey; variant?: "color" | "mono" }) {
  const d = BRAND_ICON_DATA[name];
  const v = variant === "color" && d.color ? d.color : d.mono;
  return (
    <svg
      viewBox={v.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: v.inner }}
    />
  );
}

export function CliLogo({ id }: { id: string }) {
  switch (id) {
    case "claude-code":
      return <Brand name="Claude" />;
    case "gemini-cli":
      return <Brand name="Gemini" />;
    case "codex":
      return <Brand name="OpenAI" variant="mono" />;
    case "kimi":
      return <Brand name="Kimi" />;
    case "antigravity":
      return <Brand name="Antigravity" />;
    case "cursor":
      return <Brand name="Cursor" variant="mono" />;
    case "github-copilot":
      return <Brand name="Github" variant="mono" />;
    case "grok":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815" />
        </svg>
      );
    case "opencode":
      return (
        <svg viewBox="0 6 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 30H6V18H18V30Z" fill="#4B4646" />
          <path d="M18 12H6V30H18V12ZM24 36H0V6H24V36Z" fill="#F1ECEC" />
        </svg>
      );
    case "muse-code":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="#5B8DEF" strokeWidth="2.1" strokeLinecap="round">
          <path d="M12 12c-1.1-2.5-2.7-4.1-4.7-4.1-2.3 0-3.8 1.8-3.8 4.1s1.5 4.1 3.8 4.1c2 0 3.6-1.6 4.7-4.1zm0 0c1.1-2.5 2.7-4.1 4.7-4.1 2.3 0 3.8 1.8 3.8 4.1s-1.5 4.1-3.8 4.1c-2 0-3.6-1.6-4.7-4.1z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 4l7 8-7 8-7-8z" />
        </svg>
      );
  }
}
