/**
 * Version tag for the grocery-list send area, stored as meta.variant on cta_tap / list_cta_seen events so tap and
 * send rates can be compared before and after a change (Sarah, Nov 25 2026). Event ids stay the same.
 *   send_feel_v1: "Save my list to Instacart", the "check prices before you pay" line, smaller dollar estimate,
 *                 "Text me this list" as a full option, Walmart on top for Walmart families, store warning folded.
 * Events with no meta.variant come from the version before.
 */
export const SEND_VARIANT = 'send_feel_v1'
