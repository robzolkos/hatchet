import { BoxRenderable, TextRenderable, type CliRenderer } from "@opentui/core";
import { Theme } from "../theme";

// Image info extracted from HTML
export interface ImageInfo {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

// Create a placeholder box for when images can't be displayed
export function createImagePlaceholder(
  renderer: CliRenderer,
  options: {
    width: number;
    height: number;
    altText?: string;
  }
): BoxRenderable {
  const { width, height, altText = "Image" } = options;
  
  const box = new BoxRenderable(renderer, {
    width,
    height,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    border: true,
    borderColor: Theme.muted,
    borderStyle: "rounded",
    backgroundColor: Theme.backgroundSubtle,
  });
  
  // Image icon
  box.add(new TextRenderable(renderer, {
    content: "\uf03e", // nf-fa-image
    fg: Theme.muted,
  }));
  
  // Alt text (truncated)
  const truncatedAlt = altText.length > width - 4 
    ? altText.slice(0, width - 7) + "..." 
    : altText;
  box.add(new TextRenderable(renderer, {
    content: truncatedAlt,
    fg: Theme.muted,
  }));
  
  return box;
}

// Extract image URLs from HTML content (including action-text-attachment)
export function extractImageUrls(html: string): ImageInfo[] {
  const images: ImageInfo[] = [];
  
  // Match action-text-attachment with image content-type
  const attachmentRegex = /<action-text-attachment[^>]+content-type=["']image\/[^"']+["'][^>]*>/gi;
  let match;
  
  while ((match = attachmentRegex.exec(html)) !== null) {
    const tag = match[0];
    const urlMatch = tag.match(/url=["']([^"']+)["']/);
    const filenameMatch = tag.match(/filename=["']([^"']+)["']/);
    const widthMatch = tag.match(/width=["'](\d+)["']/);
    const heightMatch = tag.match(/height=["'](\d+)["']/);
    
    if (urlMatch) {
      let url = urlMatch[1];
      // Make relative URLs absolute
      if (url.startsWith("/")) {
        url = `https://app.fizzy.do${url}`;
      }
      images.push({
        url,
        alt: filenameMatch ? filenameMatch[1] : "image",
        width: widthMatch ? parseInt(widthMatch[1]) : undefined,
        height: heightMatch ? parseInt(heightMatch[1]) : undefined,
      });
    }
  }
  
  // Also match regular img tags
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  
  while ((match = imgRegex.exec(html)) !== null) {
    const tag = match[0];
    const src = match[1];
    const altMatch = tag.match(/alt=["']([^"']+)["']/);
    const widthMatch = tag.match(/width=["'](\d+)["']/);
    const heightMatch = tag.match(/height=["'](\d+)["']/);
    
    // Skip if this is a relative URL that's already covered by action-text-attachment
    // (action-text-attachment has full URLs, img inside has relative)
    if (!src.startsWith("/") || !images.some(img => img.url.includes(src.slice(1)))) {
      let url = src;
      if (url.startsWith("/")) {
        url = `https://app.fizzy.do${url}`;
      }
      images.push({
        url,
        alt: altMatch ? altMatch[1] : "image",
        width: widthMatch ? parseInt(widthMatch[1]) : undefined,
        height: heightMatch ? parseInt(heightMatch[1]) : undefined,
      });
    }
  }
  
  return images;
}
