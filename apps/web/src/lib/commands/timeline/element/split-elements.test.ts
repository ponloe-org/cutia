import { describe, expect, it, beforeEach } from "bun:test";

if (typeof globalThis.window === "undefined") {
	(globalThis as unknown as Record<string, unknown>).window = globalThis;
}

import { EditorCore } from "@/core";
import { SplitElementsCommand } from "./split-elements";
import type { VideoTrack, VideoElement, TProject } from "@/types/timeline";

describe("SplitElementsCommand", () => {
	beforeEach(() => {
		const editor = EditorCore.getInstance();
		const mockProject: TProject = {
			metadata: { id: "p1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
			settings: { width: 1920, height: 1080, fps: 30 },
			scenes: [
				{
					id: "s1",
					name: "Scene 1",
					isMain: true,
					tracks: [],
					bookmarks: [],
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
			currentSceneId: "s1",
		};
		editor.project.setActiveProject({ project: mockProject });
		editor.scenes.initializeScenes({ scenes: mockProject.scenes, currentSceneId: "s1" });

		const track: VideoTrack = {
			id: "track-1",
			name: "Video Track",
			type: "video",
			isMain: true,
			muted: false,
			hidden: false,
			elements: [
				{
					id: "el-1",
					type: "video",
					name: "test.mp4",
					mediaId: "media-1",
					startTime: 0,
					duration: 10,
					trimStart: 0,
					trimEnd: 0,
					playbackRate: 2, // 2x speed
					transform: { scale: 1, position: { x: 0, y: 0 }, rotate: 0 },
					opacity: 1,
				} as VideoElement,
				{
					id: "el-2",
					type: "video",
					name: "reversed.mp4",
					mediaId: "media-2",
					startTime: 10,
					duration: 10,
					trimStart: 0,
					trimEnd: 0,
					playbackRate: 1,
					reversed: true,
					transform: { scale: 1, position: { x: 0, y: 0 }, rotate: 0 },
					opacity: 1,
				} as VideoElement,
			],
		};
		editor.timeline.updateTracks([track]);
	});

	it("correctly splits element with 2x speed", () => {
		const editor = EditorCore.getInstance();
		const command = new SplitElementsCommand(
			[{ trackId: "track-1", elementId: "el-1" }],
			4, // split at timeline time t = 4s
		);

		command.execute();

		const tracks = editor.timeline.getTracks();
		const elements = tracks[0].elements as VideoElement[];

		expect(elements.length).toBe(3); // el-1 (left), el-1 (right), el-2
		const left = elements[0];
		const right = elements[1];

		// Timeline duration: left = 4s, right = 6s
		expect(left.duration).toBe(4);
		expect(right.duration).toBe(6);

		// With 2x speed, 6s on timeline = 12s of media cut
		// Left piece trimEnd = 0 + 6 * 2 = 12
		expect(left.trimStart).toBe(0);
		expect(left.trimEnd).toBe(12);

		// Right piece trimStart = 0 + 4 * 2 = 8
		expect(right.trimStart).toBe(8);
		expect(right.trimEnd).toBe(0);
	});

	it("correctly splits reversed element", () => {
		const editor = EditorCore.getInstance();
		const command = new SplitElementsCommand(
			[{ trackId: "track-1", elementId: "el-2" }],
			14, // split at timeline time t = 14s (relative time = 4s into el-2)
		);

		command.execute();

		const tracks = editor.timeline.getTracks();
		const elements = tracks[0].elements as VideoElement[];

		// el-1, el-2 (left), el-2 (right)
		const left = elements[1];
		const right = elements[2];

		expect(left.duration).toBe(4);
		expect(right.duration).toBe(6);

		// Reversed: timeline left (first 4s) plays the end of media range (last 4s of media).
		// Right visible duration = 6s.
		// left.trimStart = 0 + 6 = 6
		expect(left.trimStart).toBe(6);
		expect(left.trimEnd).toBe(0);

		// right.trimStart = 0
		// right.trimEnd = 0 + 4 = 4
		expect(right.trimStart).toBe(0);
		expect(right.trimEnd).toBe(4);
	});

	it("correctly handles undo and redo", () => {
		const editor = EditorCore.getInstance();
		const command = new SplitElementsCommand(
			[{ trackId: "track-1", elementId: "el-1" }],
			4,
		);

		command.execute();
		expect(editor.timeline.getTracks()[0].elements.length).toBe(3);

		command.undo();
		expect(editor.timeline.getTracks()[0].elements.length).toBe(2);
		expect((editor.timeline.getTracks()[0].elements[0] as VideoElement).duration).toBe(10);
	});
});
