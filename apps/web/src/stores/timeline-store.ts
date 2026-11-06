/**
 * UI state for the timeline
 * For core logic, use EditorCore instead.
 */

import { create } from "zustand";
import type { ClipboardItem } from "@/types/timeline";

export type TimelineActiveTool = "select" | "blade";

interface TimelineStore {
	activeTool: TimelineActiveTool;
	setActiveTool: (tool: TimelineActiveTool) => void;
	snappingEnabled: boolean;
	toggleSnapping: () => void;
	rippleEditingEnabled: boolean;
	toggleRippleEditing: () => void;
	clipboard: {
		items: ClipboardItem[];
	} | null;
	setClipboard: (
		clipboard: {
			items: ClipboardItem[];
		} | null,
	) => void;
}

export const useTimelineStore = create<TimelineStore>((set) => ({
	activeTool: "select",
	setActiveTool: (activeTool) => set({ activeTool }),

	snappingEnabled: true,

	toggleSnapping: () => {
		set((state) => ({ snappingEnabled: !state.snappingEnabled }));
	},

	rippleEditingEnabled: false,

	toggleRippleEditing: () => {
		set((state) => ({
			rippleEditingEnabled: !state.rippleEditingEnabled,
		}));
	},

	clipboard: null,

	setClipboard: (clipboard) => {
		set({ clipboard });
	},
}));
