// Workspaces (bank accounts) pick from the same curated palette as Tags — no reason to duplicate the
// hex list. Re-exported here so workspace code imports from its own module rather than reaching into
// features/tags.
export {TAG_COLORS as WORKSPACE_COLORS, DEFAULT_TAG_COLOR as DEFAULT_WORKSPACE_COLOR, normalizeTagColor as normalizeWorkspaceColor} from "@/features/tags/colors";
