// Scroll-spy maths for the landing page's section dot nav.
//
// The landing sections have very different heights (the bento "inside" block
// is ~1,600px, the stats band ~285px), so the active dot is read from where
// the sections actually are, not from overall scroll progress.

/** A section's position in document coordinates (px from the page top). */
export interface SectionBox {
  top: number;
  height: number;
}

const BOTTOM_TOLERANCE_PX = 2;

function maxScroll(viewportHeight: number, documentHeight: number) {
  return Math.max(0, documentHeight - viewportHeight);
}

/**
 * Index of the section under the middle of the screen. Once the page cannot
 * scroll any further the last section wins, even if it is too short to reach
 * the middle.
 */
export function activeSectionIndex(
  sections: readonly SectionBox[],
  scrollY: number,
  viewportHeight: number,
  documentHeight: number,
): number {
  if (sections.length === 0) return 0;
  if (scrollY >= maxScroll(viewportHeight, documentHeight) - BOTTOM_TOLERANCE_PX) {
    return sections.length - 1;
  }

  const probe = scrollY + viewportHeight / 2;
  let active = 0;
  sections.forEach((section, index) => {
    if (section.top <= probe) active = index;
  });
  return active;
}

/**
 * Where to scroll when a dot is clicked. Sections taller than half the screen
 * start at the top edge; shorter ones are centred, so the section the visitor
 * picked is the one under the middle of the screen (and its dot lights up).
 */
export function sectionScrollTop(
  section: SectionBox,
  viewportHeight: number,
  documentHeight: number,
): number {
  const target =
    section.height > viewportHeight / 2
      ? section.top
      : section.top + section.height / 2 - viewportHeight / 2;
  return Math.min(Math.max(0, target), maxScroll(viewportHeight, documentHeight));
}
