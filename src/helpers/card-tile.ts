import { BoxRenderable, TextRenderable, TextAttributes, type CliRenderer } from "@opentui/core";
import { TextNodeRenderable } from "@opentui/core";
import type { FizzyCard } from "../types";
import { Theme, getFizzyColor, getFizzyColorDimmed } from "../theme";

export interface CardTileOptions {
  card: FizzyCard;
  selected?: boolean;
  width?: number | `${number}%` | "auto";
  onSelect?: () => void;
}

// Create a styled card tile
export function createCardTile(
  renderer: CliRenderer,
  options: CardTileOptions
): BoxRenderable {
  const { card, selected = false, width = "100%" } = options;

  // Get the column color from the card's column data
  const columnColorVar = card.column?.color?.value;
  const borderColor = selected 
    ? getFizzyColor(columnColorVar)
    : getFizzyColorDimmed(columnColorVar);
  
  // Use column color for the number badge and column name
  const columnColor = getFizzyColor(columnColorVar);

  // Main card container with border
  const tile = new BoxRenderable(renderer, {
    width,
    flexDirection: "column",
    border: true,
    borderColor,
    borderStyle: "rounded",
    backgroundColor: Theme.backgroundSubtle,
    marginBottom: 0,
    paddingLeft: 1,
    paddingRight: 1,
    paddingTop: 0,
    paddingBottom: 0,
  });

  // Top row: Number | Board/Column | Tags | Steps
  const topRow = new BoxRenderable(renderer, {
    width: "100%",
    flexDirection: "row",
    marginBottom: 0,
  });

  // Card number with column color
  const numberText = new TextRenderable(renderer, {
    content: ` ${card.number} `,
    fg: Theme.isLight ? Theme.background : Theme.text,
    bg: columnColor,
    attributes: TextAttributes.BOLD,
  });
  topRow.add(numberText);

  // Separator
  topRow.add(new TextRenderable(renderer, { content: " " }));

  // Column/board name with column color
  if (card.column_title || card.column?.name || card.board?.name) {
    const locationText = card.column_title || card.column?.name || card.board?.name || "";
    topRow.add(
      new TextRenderable(renderer, {
        content: locationText.toUpperCase(),
        fg: columnColor,
        attributes: TextAttributes.BOLD,
      })
    );
  }

  // Tags (if any) - show first 2 tags
  if (card.tags && card.tags.length > 0) {
    topRow.add(new TextRenderable(renderer, { content: "  " }));
    const tagsToShow = card.tags.slice(0, 2);
    const tagsText = tagsToShow.map(t => t.toUpperCase()).join(", ");
    topRow.add(
      new TextRenderable(renderer, {
        content: `\u2022 ${tagsText}`,
        fg: Theme.muted,
      })
    );
  }

  tile.add(topRow);

  // Spacer between metadata and title
  tile.add(new TextRenderable(renderer, { content: "" }));

  // Title row
  const titleRow = new BoxRenderable(renderer, {
    width: "100%",
    flexDirection: "row",
  });

  // Create title with TextNodeRenderable for bold styling
  const titleRenderable = new TextRenderable(renderer, {
    fg: Theme.text,
    wrapMode: "word",
  });
  const titleNode = TextNodeRenderable.fromString(card.title, {
    fg: Theme.text,
    attributes: TextAttributes.BOLD,
  });
  titleRenderable.add(titleNode);
  titleRow.add(titleRenderable);

  tile.add(titleRow);

  // Bottom row: Steps progress (if any)
  if (card.steps && card.steps.length > 0) {
    const completed = card.steps.filter(s => s.completed).length;
    const total = card.steps.length;
    
    const stepsRow = new BoxRenderable(renderer, {
      width: "100%",
      flexDirection: "row",
      justifyContent: "flex-end",
    });

    // Checkmark icon and count
    const allDone = completed === total;
    const stepsText = new TextRenderable(renderer, {
      content: `${allDone ? "\u2714" : "\u25cb"} ${completed}/${total}`,
      fg: allDone ? Theme.success : Theme.muted,
    });
    stepsRow.add(stepsText);

    tile.add(stepsRow);
  }

  return tile;
}

// Format a relative time string
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "YESTERDAY";
  if (diffDays < 7) return `${diffDays} DAYS AGO`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} WEEKS AGO`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} MONTHS AGO`;
  return `${Math.floor(diffDays / 365)} YEARS AGO`;
}
