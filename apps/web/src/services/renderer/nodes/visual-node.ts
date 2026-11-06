import type { CanvasRenderer } from "../canvas-renderer";
import { BaseNode } from "./base-node";
import { getVisualSourceTime } from "@/lib/timeline/element-utils";
import type { Transform, VideoFilterAdjustments } from "@/types/timeline";
import type { TCanvasSize } from "@/types/project";

const VISUAL_EPSILON = 1 / 1000;

export interface VisualNodeParams {
	duration: number;
	timeOffset: number;
	trimStart: number;
	trimEnd: number;
	transform: Transform;
	opacity: number;
	fitCanvasSize?: TCanvasSize;
	playbackRate?: number;
	reversed?: boolean;
	adjustments?: VideoFilterAdjustments;
}

export abstract class VisualNode<
	Params extends VisualNodeParams = VisualNodeParams,
> extends BaseNode<Params> {
	protected getLocalTime(time: number): number {
		return getVisualSourceTime({
			timelineTime: time,
			startTime: this.params.timeOffset,
			duration: this.params.duration,
			trimStart: this.params.trimStart,
			playbackRate: this.params.playbackRate,
			reversed: this.params.reversed,
		});
	}

	protected isInRange(time: number): boolean {
		const localTime = this.getLocalTime(time);
		const rate = this.params.playbackRate ?? 1;
		return (
			localTime >= this.params.trimStart - VISUAL_EPSILON &&
			localTime < this.params.trimStart + this.params.duration * rate
		);
	}

	protected renderVisual({
		renderer,
		source,
		sourceWidth,
		sourceHeight,
	}: {
		renderer: CanvasRenderer;
		source: CanvasImageSource;
		sourceWidth: number;
		sourceHeight: number;
	}): void {
		renderer.context.save();

		const { transform, opacity, fitCanvasSize, adjustments } = this.params;

		if (adjustments) {
			const filterParts: string[] = [];
			if (adjustments.brightness !== undefined && adjustments.brightness !== 100) {
				filterParts.push(`brightness(${adjustments.brightness}%)`);
			}
			if (adjustments.contrast !== undefined && adjustments.contrast !== 100) {
				filterParts.push(`contrast(${adjustments.contrast}%)`);
			}
			if (adjustments.saturation !== undefined && adjustments.saturation !== 100) {
				filterParts.push(`saturate(${adjustments.saturation}%)`);
			}
			if (adjustments.blur !== undefined && adjustments.blur > 0) {
				filterParts.push(`blur(${adjustments.blur}px)`);
			}
			if (adjustments.sepia !== undefined && adjustments.sepia > 0) {
				filterParts.push(`sepia(${adjustments.sepia}%)`);
			}
			if (adjustments.grayscale !== undefined && adjustments.grayscale > 0) {
				filterParts.push(`grayscale(${adjustments.grayscale}%)`);
			}
			if (filterParts.length > 0) {
				renderer.context.filter = filterParts.join(" ");
			}
		}
		const containScale = Math.min(
			(fitCanvasSize?.width ?? renderer.width) / sourceWidth,
			(fitCanvasSize?.height ?? renderer.height) / sourceHeight,
		);
		const scaledWidth = sourceWidth * containScale * transform.scale;
		const scaledHeight = sourceHeight * containScale * transform.scale;
		const x = renderer.width / 2 + transform.position.x - scaledWidth / 2;
		const y = renderer.height / 2 + transform.position.y - scaledHeight / 2;

		renderer.context.globalAlpha = opacity;

		const centerX = x + scaledWidth / 2;
		const centerY = y + scaledHeight / 2;

		const needsFlip = transform.flipX || transform.flipY;
		const needsRotate = transform.rotate !== 0;

		if (needsRotate || needsFlip) {
			renderer.context.translate(centerX, centerY);
			if (needsRotate) {
				renderer.context.rotate((transform.rotate * Math.PI) / 180);
			}
			if (needsFlip) {
				renderer.context.scale(
					transform.flipX ? -1 : 1,
					transform.flipY ? -1 : 1,
				);
			}
			renderer.context.translate(-centerX, -centerY);
		}

		renderer.context.drawImage(source, x, y, scaledWidth, scaledHeight);
		renderer.context.restore();
	}
}
