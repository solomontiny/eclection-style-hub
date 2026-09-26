import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Convert an arbitrary product name into a URL-safe slug.
 *
 * Handles:
 *   - lowercase + whitespace -> dashes
 *   - punctuation / special characters stripped
 *   - diacritics stripped (NFD normalization)
 *   - leading / trailing dashes removed
 *   - empty / invalid input -> "product"
 */
export function slugify(input: string): string {
  const cleaned = (input ?? "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritical marks
    .replace(/[^\w\s-]/g, "") // drop everything that is not a word char / space / dash
    .replace(/[\s_-]+/g, "-") // collapse whitespace + underscores into a single dash
    .replace(/^-+|-+$/g, ""); // trim leading / trailing dashes

  return cleaned || "product";
}

/**
 * Check whether a slug is already taken by another product row.
 *
 * When `excludeId` is supplied (edit flow) the current product is ignored so
 * that a product can keep its own slug.
 */
async function slugExists(
  supabase: SupabaseClient<Database>,
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  let query = supabase
    .from("products")
    .select("id")
    .eq("slug", slug)
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("Slug existence check failed:", error.message);
    // Conservative: assume taken so we never insert a duplicate slug.
    return true;
  }
  return !!data;
}

/**
 * Generate a unique, URL-safe slug for a product.
 *
 * Algorithm:
 *   1. slugify the requested base slug.
 *   2. If it is not taken, use it.
 *   3. Otherwise append "-2", "-3", ... until a free one is found.
 *   4. Fall back to a random suffix only if the numeric suffixes are exhausted.
 *
 * Race conditions are handled as safely as practical: the check + insert
 * happen on the same database, and Supabase's UNIQUE constraint is the
 * final guard. If a rare race wins the check but loses the insert, the
 * caller should re-run generation with the failed base slug.
 *
 * `excludeId` lets an existing product keep its own slug when editing.
 */
export async function generateUniqueSlug(
  supabase: SupabaseClient<Database>,
  baseSlug: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(baseSlug);

  if (!(await slugExists(supabase, base, excludeId))) {
    return base;
  }

  for (let n = 2; n <= 999; n++) {
    const candidate = `${base}-${n}`;
    if (!(await slugExists(supabase, candidate, excludeId))) {
      return candidate;
    }
  }

  // Exhausted numeric suffixes — fall back to a random suffix.
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}