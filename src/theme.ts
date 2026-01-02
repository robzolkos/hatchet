// Theme - Dynamic colors based on terminal palette
// Detects user's terminal ANSI colors for consistent theming

import type { CliRenderer } from "@opentui/core";

// Standard ANSI color indices
export const ANSI = {
  BLACK: 0,
  RED: 1,
  GREEN: 2,
  YELLOW: 3,
  BLUE: 4,
  MAGENTA: 5,
  CYAN: 6,
  WHITE: 7,
  BRIGHT_BLACK: 8,
  BRIGHT_RED: 9,
  BRIGHT_GREEN: 10,
  BRIGHT_YELLOW: 11,
  BRIGHT_BLUE: 12,
  BRIGHT_MAGENTA: 13,
  BRIGHT_CYAN: 14,
  BRIGHT_WHITE: 15,
} as const;

// Fallback colors if palette detection fails (standard ANSI-ish colors)
const FALLBACK_PALETTE = [
  "#1c1c1c", // 0: black
  "#ff5f5f", // 1: red
  "#5fd787", // 2: green
  "#ffff87", // 3: yellow
  "#5f87ff", // 4: blue
  "#ff5faf", // 5: magenta
  "#5fd7d7", // 6: cyan
  "#d0d0d0", // 7: white
  "#6c6c6c", // 8: bright black (gray)
  "#ff8787", // 9: bright red
  "#87ffaf", // 10: bright green
  "#ffffaf", // 11: bright yellow
  "#87afff", // 12: bright blue
  "#ff87d7", // 13: bright magenta
  "#87ffff", // 14: bright cyan
  "#ffffff", // 15: bright white
];

// The detected palette (populated at runtime)
let palette: string[] = [...FALLBACK_PALETTE];

// Terminal's actual default foreground and background colors (from OSC 10/11)
let defaultForeground: string = "#ffffff";
let defaultBackground: string = "#000000";

// Parse hex color to RGB components
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// Detect if theme is light or dark based on background luminance
function isLightBackground(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  // Calculate relative luminance (simplified)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// Convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
}

// Lighten a color by a percentage (0-100)
export function lighten(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const amount = percent / 100;
  return rgbToHex(
    Math.min(255, r + (255 - r) * amount),
    Math.min(255, g + (255 - g) * amount),
    Math.min(255, b + (255 - b) * amount)
  );
}

// Darken a color by a percentage (0-100)
export function darken(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const amount = 1 - percent / 100;
  return rgbToHex(r * amount, g * amount, b * amount);
}

// Mix two colors (0 = first color, 100 = second color)
export function mix(hex1: string, hex2: string, percent: number): string {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const amount = percent / 100;
  return rgbToHex(
    c1.r + (c2.r - c1.r) * amount,
    c1.g + (c2.g - c1.g) * amount,
    c1.b + (c2.b - c1.b) * amount
  );
}

// Add alpha/transparency to a color (returns rgba string, but OpenTUI uses "transparent" keyword)
// For subtle backgrounds, we'll use mix() with the background color instead

// Detect terminal palette and populate colors
export async function detectPalette(renderer: CliRenderer): Promise<void> {
  try {
    const result = await renderer.getPalette({ size: 16, timeout: 1000 });
    
    if (result) {
      // Get the 16 ANSI palette colors
      if (result.palette && result.palette.length >= 16) {
        palette = result.palette.slice(0, 16).map((c, i) => 
          (c as string | null) ?? FALLBACK_PALETTE[i]
        );
      }
      
      // Get the actual terminal default foreground/background (OSC 10/11)
      if (result.defaultForeground) {
        defaultForeground = result.defaultForeground as string;
      }
      if (result.defaultBackground) {
        defaultBackground = result.defaultBackground as string;
      }
    }
  } catch {
    // Use fallback palette
  }
}

// Get a palette color by index
export function color(index: number): string {
  return palette[index] || FALLBACK_PALETTE[index] || "#ffffff";
}

// Semantic color accessors using detected palette
export const Theme = {
  // Get the raw palette
  get palette() {
    return palette;
  },

  // Is the terminal using a light theme?
  get isLight() {
    return isLightBackground(defaultBackground);
  },

  // Terminal's actual default background/foreground (from OSC 10/11)
  get terminalBackground() {
    return defaultBackground;
  },
  get terminalForeground() {
    return defaultForeground;
  },

  // Background colors - use actual terminal background
  get background() {
    return defaultBackground;
  },
  get backgroundSubtle() {
    // Slightly different from background for containers
    return isLightBackground(defaultBackground)
      ? darken(defaultBackground, 5)
      : lighten(defaultBackground, 5);
  },
  get backgroundMuted() {
    // More noticeable difference for emphasis
    return isLightBackground(defaultBackground)
      ? darken(defaultBackground, 12)
      : lighten(defaultBackground, 12);
  },

  // Foreground colors - use actual terminal foreground
  get text() {
    return defaultForeground;
  },
  get textBright() {
    // Slightly brighter/more contrast than default
    return isLightBackground(defaultBackground)
      ? darken(defaultForeground, 10)
      : lighten(defaultForeground, 10);
  },
  get muted() {
    // Subdued text - mix foreground toward background
    return mix(defaultForeground, defaultBackground, 40);
  },

  // Accent colors from palette
  get primary() {
    return color(ANSI.MAGENTA);
  },
  get primaryBright() {
    return color(ANSI.BRIGHT_MAGENTA);
  },
  get secondary() {
    return color(ANSI.BLUE);
  },
  get secondaryBright() {
    return color(ANSI.BRIGHT_BLUE);
  },
  get accent() {
    return color(ANSI.CYAN);
  },
  get accentBright() {
    return color(ANSI.BRIGHT_CYAN);
  },

  // Status colors from palette
  get success() {
    return color(ANSI.GREEN);
  },
  get warning() {
    return color(ANSI.YELLOW);
  },
  get error() {
    return color(ANSI.RED);
  },

  // UI specific - adapt to light/dark theme
  get selected() {
    // Selection highlight - subtle shift from background
    return isLightBackground(defaultBackground)
      ? darken(defaultBackground, 15)
      : lighten(defaultBackground, 15);
  },
  get selectedText() {
    return defaultForeground;
  },
  get border() {
    return mix(defaultForeground, defaultBackground, 60);
  },
  get borderFocused() {
    return color(ANSI.MAGENTA);
  },

  // Transparent (special keyword for OpenTUI)
  transparent: "transparent" as const,
};

// Fizzy column/card colors
// These are converted from Fizzy's OKLCH CSS values for terminal use
// Each color has light and dark mode variants
const FIZZY_COLORS_LIGHT = {
  // --color-card-1: oklch(var(--lch-ink-medium)) = 66% 0.008 258
  "var(--color-card-1)": "#9a9a9f",
  // --color-card-2: oklch(var(--lch-uncolor-medium)) = 66% 0.0944 71.46
  "var(--color-card-2)": "#b59a6e",
  // --color-card-3: oklch(var(--lch-yellow-medium)) = 74% 0.184 70
  "var(--color-card-3)": "#c9a000",
  // --color-card-4: oklch(var(--lch-lime-medium)) = 68% 0.176 113.11
  "var(--color-card-4)": "#7db000",
  // --color-card-5: oklch(var(--lch-aqua-medium)) = 66% 0.152 208
  "var(--color-card-5)": "#009eb3",
  // --color-card-6: oklch(var(--lch-violet-medium)) = 66% 0.206 285.52
  "var(--color-card-6)": "#8a6ed9",
  // --color-card-7: oklch(var(--lch-purple-medium)) = 66% 0.258 308
  "var(--color-card-7)": "#b94dc9",
  // --color-card-8: oklch(var(--lch-pink-medium)) = 71.8% 0.2008 342
  "var(--color-card-8)": "#e45b9e",
  // --color-card-default: oklch(var(--lch-blue-dark)) = 57.02% 0.1895 260.46
  "var(--color-card-default)": "#2b7dde",
  // --color-card-complete: var(--color-ink-darker) = 40% 0.026 262
  "var(--color-card-complete)": "#5c5c66",
};

const FIZZY_COLORS_DARK = {
  // Dark mode uses different lightness levels - generally lighter/brighter
  // --color-card-1: oklch(var(--lch-ink-medium)) = 62% 0.0122 260
  "var(--color-card-1)": "#8f8f97",
  // --color-card-2: oklch(var(--lch-uncolor-medium)) = 62% 0.0552 70
  "var(--color-card-2)": "#a08f6e",
  // --color-card-3: oklch(var(--lch-yellow-medium)) = 62.1% 0.146 70
  "var(--color-card-3)": "#a88900",
  // --color-card-4: oklch(var(--lch-lime-medium)) = 62% 0.128 112
  "var(--color-card-4)": "#6d9600",
  // --color-card-5: oklch(var(--lch-aqua-medium)) = 62% 0.106 208
  "var(--color-card-5)": "#008fa0",
  // --color-card-6: oklch(var(--lch-violet-medium)) = 62% 0.184 286
  "var(--color-card-6)": "#7a5fd0",
  // --color-card-7: oklch(var(--lch-purple-medium)) = 62% 0.177 308
  "var(--color-card-7)": "#a446b0",
  // --color-card-8: oklch(var(--lch-pink-medium)) = 62% 0.166 342
  "var(--color-card-8)": "#c5508a",
  // --color-card-default: oklch(var(--lch-blue-dark)) = 74% 0.1293 256
  "var(--color-card-default)": "#5a9eed",
  // --color-card-complete: var(--color-ink-darker) = 86% 0.0061 260
  "var(--color-card-complete)": "#d6d6db",
};

// Default fallback is card-default (blue) for cards without column color
const FIZZY_DEFAULT_VAR = "var(--color-card-default)";

/**
 * Get the hex color for a Fizzy column color CSS variable
 * @param cssVar The CSS variable like "var(--color-card-3)"
 * @returns The hex color string
 */
export function getFizzyColor(cssVar: string | undefined): string {
  const colors = Theme.isLight ? FIZZY_COLORS_LIGHT : FIZZY_COLORS_DARK;
  
  // If no color specified, use the default blue
  if (!cssVar) {
    return colors[FIZZY_DEFAULT_VAR as keyof typeof colors];
  }
  
  // Return the matching color, or default if not found
  return colors[cssVar as keyof typeof colors] ?? 
    colors[FIZZY_DEFAULT_VAR as keyof typeof colors];
}

/**
 * Get a dimmed version of a Fizzy color for unselected state
 */
export function getFizzyColorDimmed(cssVar: string | undefined): string {
  const baseColor = getFizzyColor(cssVar);
  // Mix toward background to dim
  return mix(baseColor, Theme.background, 50);
}

export type ThemeColor = string;
