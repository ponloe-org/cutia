import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";
import { EditorCore } from "@/core";

export class DeleteAllGapsCommand extends Command {
	private savedState: TimelineTrack[] | null = null;

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const updatedTracks = this.savedState.map((track) => {
			if (track.elements.length <= 1) {
				return track;
			}

			const sorted = [...track.elements].sort((a, b) => a.startTime - b.startTime);
			let currentStart = sorted[0].startTime;

			const compactedElements = sorted.map((element, idx) => {
				if (idx === 0) {
					currentStart = element.startTime + element.duration;
					return element;
				}

				const updatedElement = {
					...element,
					startTime: currentStart,
				};
				currentStart += element.duration;
				return updatedElement;
			});

			return {
				...track,
				elements: compactedElements,
			} as typeof track;
		});

		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}
