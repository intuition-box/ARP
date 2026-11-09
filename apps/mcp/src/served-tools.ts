/**
 * The tools a mode lists, and so the only names it accepts: one set, so `tools/list` and a call can never
 * disagree. They did: Desktop and `init --sponsored` listed `arp_find_tools` and `arp_find_agents`, and
 * refused both as unknown (review of task 74, 2026-11-09).
 */
import { DESKTOP_TOOL_NAMES, DESKTOP_TOOLS, PLUGIN_TOOL_NAMES, READ_TOOL_NAMES, TOOLS } from './tools.js';

type Tool = (typeof TOOLS)[number] | (typeof DESKTOP_TOOLS)[number];

export function servedTools(mode: { desktop: boolean; readOnly: boolean }): readonly Tool[] {
  if (mode.desktop) {
    return [...TOOLS.filter((t) => READ_TOOL_NAMES.has(t.name) && !DESKTOP_TOOL_NAMES.has(t.name)), ...DESKTOP_TOOLS];
  }
  return mode.readOnly ? TOOLS.filter((t) => PLUGIN_TOOL_NAMES.has(t.name)) : TOOLS;
}
