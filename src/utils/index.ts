import { GB_APP_ORIGIN } from "./consts";
import { Experiment } from "./types";

// Initialize const once to avoid unnecessary searching of locale db
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "numeric",
});

export function formatDate(timestamp: string) {
  const d = new Date(timestamp);
  return dateTimeFormatter.format(d);
}

export function getGbLink(path?: string) {
  return new URL(path || "", GB_APP_ORIGIN).toString();
}

export function getWinningVariant(experiment: Experiment): string | undefined {
  const winningVariantId = experiment.resultSummary?.winner;
  const winningVariant = experiment.variations.find(
    (variation) => variation.variationId === winningVariantId
  );
  return winningVariant?.name;
}

interface AdfMark {
  type: string;
  attrs?: Record<string, any>;
}

interface AdfNode {
  type?: string;
  text?: string;
  marks?: AdfMark[];
  attrs?: Record<string, any>;
  content?: AdfNode[];
}

function applyMarks(text: string, marks?: AdfMark[]): string {
  if (!marks || marks.length === 0) return text;
  let out = text;
  for (const m of marks) {
    switch (m.type) {
      case "strong":
        out = `**${out}**`;
        break;
      case "em":
        out = `*${out}*`;
        break;
      case "code":
        out = `\`${out}\``;
        break;
      case "strike":
        out = `~~${out}~~`;
        break;
      case "underline":
        out = `<u>${out}</u>`;
        break;
      case "link": {
        const href = m.attrs?.href || "";
        out = href ? `[${out}](${href})` : out;
        break;
      }
    }
  }
  return out;
}

function renderChildren(content: AdfNode[] | undefined, sep = ""): string {
  if (!Array.isArray(content)) return "";
  return content.map((c) => adfNodeToMarkdown(c)).join(sep);
}

function renderList(
  node: AdfNode,
  marker: (index: number) => string
): string {
  if (!Array.isArray(node.content)) return "";
  return (
    node.content
      .map((item, i) => {
        const body = renderChildren(item.content).trimEnd();
        const lines = body.split("\n");
        const first = `${marker(i)} ${lines[0] || ""}`;
        const rest = lines
          .slice(1)
          .map((l) => (l ? "  " + l : l))
          .join("\n");
        return rest ? `${first}\n${rest}` : first;
      })
      .join("\n") + "\n"
  );
}

function adfNodeToMarkdown(node: AdfNode | string | null | undefined): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node !== "object") return "";

  if (typeof node.text === "string") {
    return applyMarks(node.text, node.marks);
  }

  switch (node.type) {
    case "doc":
      return renderChildren(node.content);
    case "paragraph":
      return renderChildren(node.content) + "\n\n";
    case "heading": {
      const level = Math.max(1, Math.min(6, node.attrs?.level || 1));
      return `${"#".repeat(level)} ${renderChildren(node.content)}\n\n`;
    }
    case "hardBreak":
      return "  \n";
    case "rule":
      return "\n---\n\n";
    case "blockquote": {
      const inner = renderChildren(node.content).trimEnd();
      return (
        inner
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n") + "\n\n"
      );
    }
    case "codeBlock": {
      const lang = node.attrs?.language || "";
      const inner = (node.content || [])
        .map((c) => c.text || "")
        .join("");
      return `\`\`\`${lang}\n${inner}\n\`\`\`\n\n`;
    }
    case "bulletList":
      return renderList(node, () => "-");
    case "orderedList":
      return renderList(node, (i) => `${i + 1}.`);
    case "inlineCard":
    case "blockCard": {
      const url = node.attrs?.url || "";
      return url ? `<${url}>` : "";
    }
    case "mention":
      return `@${node.attrs?.text || node.attrs?.id || ""}`;
    case "emoji":
      return node.attrs?.shortName || node.attrs?.text || "";
    default:
      return renderChildren(node.content);
  }
}

export function adfToMarkdown(node: unknown): string {
  return adfNodeToMarkdown(node as AdfNode).replace(/\n{3,}/g, "\n\n").trim();
}

export function jiraFieldToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return value
      .map(jiraFieldToString)
      .filter((s) => s.length > 0)
      .join(", ");
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (typeof v.content !== "undefined") {
      const md = adfToMarkdown(v);
      if (md) return md;
    }
    if (typeof v.displayName === "string") return v.displayName;
    if (typeof v.name === "string") return v.name;
    if (typeof v.value === "string") return v.value;
    if (typeof v.key === "string") return v.key;
    if (typeof v.id === "string") return v.id;
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
}
