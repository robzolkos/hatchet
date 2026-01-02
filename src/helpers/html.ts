import { TextRenderable, BoxRenderable, TextAttributes, TextNodeRenderable, type CliRenderer } from "@opentui/core";
import { Theme } from "../theme";

// Decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// Style state for HTML parsing
interface StyleState {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  code: boolean;
}

// List context for tracking ordered list numbers
interface ListContext {
  type: "ul" | "ol" | null;
  counter: number;
}

// Get TextAttributes from style state
function getAttributes(state: StyleState): number {
  let attrs = 0;
  if (state.bold) attrs |= TextAttributes.BOLD;
  if (state.italic) attrs |= TextAttributes.ITALIC;
  if (state.strikethrough) attrs |= TextAttributes.STRIKETHROUGH;
  return attrs;
}

// Extract href from anchor tag attributes
function extractHref(attrs: string): string | null {
  const match = attrs.match(/href=["']([^"']+)["']/);
  return match ? match[1] : null;
}

// Parse HTML content recursively and return TextNodeRenderables
function parseHtmlContent(
  html: string,
  state: StyleState,
  defaultFg: string,
  listContext: ListContext = { type: null, counter: 0 }
): TextNodeRenderable[] {
  const nodes: TextNodeRenderable[] = [];
  let remaining = html;

  while (remaining.length > 0) {
    // Find next tag
    const tagMatch = remaining.match(/^([^<]*)<(\/?)([\w-]+)([^>]*)>/);
    
    if (!tagMatch) {
      // No more tags, add remaining text
      const text = decodeHtmlEntities(remaining);
      if (text.length > 0) {
        const fg = state.code ? "#98c379" : defaultFg;
        nodes.push(TextNodeRenderable.fromString(text, { fg, attributes: getAttributes(state) }));
      }
      break;
    }

    // Add text before the tag
    // Skip whitespace that contains newlines (formatting/indentation), but keep inline spaces
    const textBefore = decodeHtmlEntities(tagMatch[1]);
    const isFormattingWhitespace = textBefore.trim() === "" && textBefore.includes("\n");
    if (textBefore.length > 0 && !isFormattingWhitespace) {
      const fg = state.code ? "#98c379" : defaultFg;
      // Collapse multiple spaces to single space for non-code content
      const text = state.code ? textBefore : textBefore.replace(/\s+/g, " ");
      nodes.push(TextNodeRenderable.fromString(text, { fg, attributes: getAttributes(state) }));
    }

    const isClosing = tagMatch[2] === "/";
    const tagName = tagMatch[3].toLowerCase();
    const tagAttrs = tagMatch[4];
    remaining = remaining.slice(tagMatch[0].length);

    // Handle self-closing and block tags
    if (tagName === "br") {
      nodes.push(TextNodeRenderable.fromString("\n", { fg: defaultFg }));
      continue;
    }
    if (tagName === "hr") {
      nodes.push(TextNodeRenderable.fromString("\n───\n", { fg: Theme.muted }));
      continue;
    }

    // Skip closing tags for inline styles (handled by content extraction)
    if (isClosing) continue;

    // Find the matching closing tag and extract content
    const closeTag = `</${tagName}>`;
    const closeIndex = findMatchingClose(remaining, tagName);
    
    if (closeIndex === -1) {
      // No closing tag found, treat rest as content
      continue;
    }

    const innerHtml = remaining.slice(0, closeIndex);
    remaining = remaining.slice(closeIndex + closeTag.length);

    // Handle different tags
    switch (tagName) {
      case "b":
      case "strong":
        nodes.push(...parseHtmlContent(innerHtml, { ...state, bold: true }, defaultFg, listContext));
        break;
      case "i":
      case "em":
        nodes.push(...parseHtmlContent(innerHtml, { ...state, italic: true }, defaultFg, listContext));
        break;
      case "s":
      case "strike":
      case "del":
        nodes.push(...parseHtmlContent(innerHtml, { ...state, strikethrough: true }, defaultFg, listContext));
        break;
      case "code":
        nodes.push(...parseHtmlContent(innerHtml, { ...state, code: true }, defaultFg, listContext));
        break;
      case "h1":
        nodes.push(TextNodeRenderable.fromString("\n", { fg: defaultFg }));
        nodes.push(...parseHtmlContent(innerHtml, { ...state, bold: true }, Theme.primary, listContext));
        nodes.push(TextNodeRenderable.fromString("\n", { fg: defaultFg }));
        break;
      case "h2":
        nodes.push(TextNodeRenderable.fromString("\n", { fg: defaultFg }));
        nodes.push(...parseHtmlContent(innerHtml, { ...state, bold: true }, Theme.secondary, listContext));
        nodes.push(TextNodeRenderable.fromString("\n", { fg: defaultFg }));
        break;
      case "h3":
        nodes.push(TextNodeRenderable.fromString("\n", { fg: defaultFg }));
        nodes.push(...parseHtmlContent(innerHtml, { ...state, bold: true }, Theme.accent, listContext));
        nodes.push(TextNodeRenderable.fromString("\n", { fg: defaultFg }));
        break;
      case "p":
        nodes.push(...parseHtmlContent(innerHtml, state, defaultFg, listContext));
        nodes.push(TextNodeRenderable.fromString("\n", { fg: defaultFg }));
        break;
      case "li": {
        // Use the list context to determine bullet style
        if (listContext.type === "ol") {
          listContext.counter++;
          nodes.push(TextNodeRenderable.fromString(`${listContext.counter}. `, { fg: Theme.accent }));
        } else {
          nodes.push(TextNodeRenderable.fromString("• ", { fg: Theme.accent }));
        }
        nodes.push(...parseHtmlContent(innerHtml, state, defaultFg, { type: null, counter: 0 }));
        nodes.push(TextNodeRenderable.fromString("\n", { fg: defaultFg }));
        break;
      }
      case "blockquote":
        nodes.push(TextNodeRenderable.fromString("│ ", { fg: Theme.muted }));
        nodes.push(...parseHtmlContent(innerHtml, { ...state, italic: true }, Theme.muted, listContext));
        nodes.push(TextNodeRenderable.fromString("\n", { fg: defaultFg }));
        break;
      case "a": {
        // Render as [link text](url)
        const href = extractHref(tagAttrs);
        const linkText = parseHtmlContent(innerHtml, state, Theme.secondary, listContext);
        nodes.push(TextNodeRenderable.fromString("[", { fg: Theme.muted }));
        nodes.push(...linkText);
        nodes.push(TextNodeRenderable.fromString("]", { fg: Theme.muted }));
        if (href) {
          nodes.push(TextNodeRenderable.fromString(`(${href})`, { fg: Theme.muted }));
        }
        break;
      }
      case "pre":
        nodes.push(TextNodeRenderable.fromString("\n", { fg: defaultFg }));
        nodes.push(...parseHtmlContent(innerHtml, { ...state, code: true }, "#98c379", listContext));
        nodes.push(TextNodeRenderable.fromString("\n", { fg: defaultFg }));
        break;
      case "ul":
        // Start unordered list context
        nodes.push(...parseHtmlContent(innerHtml, state, defaultFg, { type: "ul", counter: 0 }));
        break;
      case "ol":
        // Start ordered list context
        nodes.push(...parseHtmlContent(innerHtml, state, defaultFg, { type: "ol", counter: 0 }));
        break;
      case "div":
      case "span":
      case "figure":
      case "figcaption":
        // Container tags - just process children
        nodes.push(...parseHtmlContent(innerHtml, state, defaultFg, listContext));
        break;
      case "action-text-attachment": {
        // action-text-attachment uses url= attribute
        const urlMatch = tagAttrs.match(/url=["']([^"']+)["']/);
        const filenameMatch = tagAttrs.match(/filename=["']([^"']+)["']/);
        const captionMatch = tagAttrs.match(/caption=["']([^"']+)["']/);
        const contentTypeMatch = tagAttrs.match(/content-type=["']([^"']+)["']/);
        
        let url = urlMatch ? urlMatch[1] : null;
        const filename = filenameMatch ? filenameMatch[1] : null;
        const caption = captionMatch ? captionMatch[1] : null;
        const contentType = contentTypeMatch ? contentTypeMatch[1] : null;
        const displayName = caption || filename || "attachment";
        
        // Make relative URLs absolute
        if (url && url.startsWith("/")) {
          url = `https://app.fizzy.do${url}`;
        }
        
        if (url && contentType?.startsWith("image/")) {
          // Image attachment - skip output, handled separately via extractImageUrls
        } else if (url && contentType?.startsWith("video/")) {
          // Video attachment - show as link
          nodes.push(TextNodeRenderable.fromString("\n", { fg: defaultFg }));
          nodes.push(TextNodeRenderable.fromString("\uf03d ", { fg: Theme.accent })); // nf-fa-video icon
          nodes.push(TextNodeRenderable.fromString(`[${displayName}]`, { fg: Theme.secondary }));
          nodes.push(TextNodeRenderable.fromString("\n", { fg: defaultFg }));
        } else if (url) {
          // Other attachment
          nodes.push(TextNodeRenderable.fromString("\n", { fg: defaultFg }));
          nodes.push(TextNodeRenderable.fromString("\uf0c6 ", { fg: Theme.accent })); // nf-fa-paperclip icon
          nodes.push(TextNodeRenderable.fromString(`[${displayName}]`, { fg: Theme.secondary }));
          nodes.push(TextNodeRenderable.fromString("\n", { fg: defaultFg }));
        }
        break;
      }
      case "img":
        // Images handled separately via extractImageUrls
        break;
      default:
        // Unknown tag - process content
        nodes.push(...parseHtmlContent(innerHtml, state, defaultFg));
    }
  }

  return nodes;
}

// Find the index of the matching closing tag, accounting for nesting
function findMatchingClose(html: string, tagName: string): number {
  const openTag = new RegExp(`<${tagName}[^>]*>`, "gi");
  const closeTag = `</${tagName}>`;
  let depth = 1;
  let pos = 0;

  while (depth > 0 && pos < html.length) {
    const nextClose = html.toLowerCase().indexOf(closeTag.toLowerCase(), pos);
    if (nextClose === -1) return -1;

    // Count opens between pos and nextClose
    const segment = html.slice(pos, nextClose);
    const opens = (segment.match(openTag) || []).length;
    depth += opens - 1;

    if (depth === 0) {
      return nextClose;
    }
    pos = nextClose + closeTag.length;
  }

  return -1;
}

// Render HTML directly to TextRenderables
export function renderHtml(
  renderer: CliRenderer,
  container: BoxRenderable,
  html: string
): void {
  const textRenderable = new TextRenderable(renderer, {
    fg: Theme.text,
    wrapMode: "word",
  });

  const initialState: StyleState = {
    bold: false,
    italic: false,
    strikethrough: false,
    code: false,
  };

  const nodes = parseHtmlContent(html, initialState, Theme.text);

  if (nodes.length > 0) {
    const combinedNode = TextNodeRenderable.fromNodes(nodes);
    textRenderable.add(combinedNode);
  }

  container.add(textRenderable);
}
