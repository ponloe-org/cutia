import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";
import { generateUUID } from "@/utils/id";
import { EditorCore } from "@/core";

export class SplitElementsCommand extends Command {
	private savedState: TimelineTrack[] | null = null;
	private rightSideElements: { trackId: string; elementId: string }[] = [];
	private previousSelection: { trackId: string; elementId: string }[] = [];

	constructor(
		private elements: { trackId: string; elementId: string }[],
		private splitTime: number,
		private retainSide: "both" | "left" | "right" = "both",
		private ripple: boolean = false,
	) {
		super();
	}

	getRightSideElements(): { trackId: string; elementId: string }[] {
		return this.rightSideElements;
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();
		this.previousSelection = editor.selection.getSelectedElements();
		this.rightSideElements = [];

		const updatedTracks = this.savedState.map((track) => {
			const elementsToSplit = this.elements.filter(
				(el) => el.trackId === track.id,
			);

			if (elementsToSplit.length === 0) {
				return track;
			}

			// First, perform the split/trim on matching elements
			let trackShift = 0;
			const newElements: any[] = [];

			for (const element of track.elements) {
				const shouldSplit = elementsToSplit.some(
					(el) => el.elementId === element.id,
				);

				if (!shouldSplit) {
					newElements.push({
						...element,
						startTime: Math.max(0, element.startTime - trackShift),
					} as typeof element);
					continue;
				}

				const effectiveStart = element.startTime;
				const effectiveEnd = element.startTime + element.duration;

				if (
					this.splitTime <= effectiveStart ||
					this.splitTime >= effectiveEnd
				) {
					newElements.push({
						...element,
						startTime: Math.max(0, element.startTime - trackShift),
					} as typeof element);
					continue;
				}

				const relativeTime = this.splitTime - element.startTime;
				const leftVisibleDuration = relativeTime;
				const rightVisibleDuration = element.duration - relativeTime;

				const rate =
					"playbackRate" in element && typeof element.playbackRate === "number"
						? element.playbackRate
						: 1;
				const isReversed =
					"reversed" in element && typeof element.reversed === "boolean"
						? element.reversed
						: false;

				const leftTrimStart = isReversed
					? element.trimStart + rightVisibleDuration * rate
					: element.trimStart;
				const leftTrimEnd = isReversed
					? element.trimEnd
					: element.trimEnd + rightVisibleDuration * rate;

				const rightTrimStart = isReversed
					? element.trimStart
					: element.trimStart + leftVisibleDuration * rate;
				const rightTrimEnd = isReversed
					? element.trimEnd + leftVisibleDuration * rate
					: element.trimEnd;

				if (this.retainSide === "left") {
					newElements.push({
						...element,
						startTime: Math.max(0, element.startTime - trackShift),
						duration: leftVisibleDuration,
						trimStart: leftTrimStart,
						trimEnd: leftTrimEnd,
						name: `${element.name} (left)`,
					} as typeof element);

					if (this.ripple) {
						trackShift += rightVisibleDuration;
					}
					continue;
				}

				if (this.retainSide === "right") {
					const newId = generateUUID();
					this.rightSideElements.push({
						trackId: track.id,
						elementId: newId,
					});

					const effectiveNewStart = this.ripple
						? element.startTime - trackShift
						: this.splitTime - trackShift;

					newElements.push({
						...element,
						id: newId,
						startTime: Math.max(0, effectiveNewStart),
						duration: rightVisibleDuration,
						trimStart: rightTrimStart,
						trimEnd: rightTrimEnd,
						name: `${element.name} (right)`,
					} as typeof element);

					if (this.ripple) {
						trackShift += leftVisibleDuration;
					}
					continue;
				}

				// "both" - split into two pieces
				const secondElementId = generateUUID();
				this.rightSideElements.push({
					trackId: track.id,
					elementId: secondElementId,
				});

				newElements.push(
					{
						...element,
						startTime: Math.max(0, element.startTime - trackShift),
						duration: leftVisibleDuration,
						trimStart: leftTrimStart,
						trimEnd: leftTrimEnd,
						name: `${element.name} (left)`,
					} as typeof element,
					{
						...element,
						id: secondElementId,
						startTime: Math.max(0, this.splitTime - trackShift),
						duration: rightVisibleDuration,
						trimStart: rightTrimStart,
						trimEnd: rightTrimEnd,
						name: `${element.name} (right)`,
					} as typeof element,
				);
			}

			return {
				...track,
				elements: newElements,
			} as typeof track;
		});

		editor.timeline.updateTracks(updatedTracks);

		if (this.rightSideElements.length > 0) {
			editor.selection.setSelectedElements({ elements: this.rightSideElements });
		}
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
			editor.selection.setSelectedElements({ elements: this.previousSelection });
		}
	}
}
