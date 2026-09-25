/**
 * Content id = raw relative path without extension ("Mi Post/en.md" -> "Mi Post/en").
 * Astro's default slugifies ids (and honors a `slug:` frontmatter key), which would silently
 * publish a misnamed folder under a different URL instead of letting validatePosts reject it.
 */
export function postId({ entry }: { entry: string }): string {
  return entry.replace(/\.md$/, '');
}
