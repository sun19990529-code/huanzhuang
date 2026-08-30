package com.smartwardrobe.engine

import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sqrt

data class NormalizedPoint(val x: Float, val y: Float)
data class PixelPoint(val x: Float, val y: Float)
data class CanvasDimensions(val width: Float, val height: Float)

data class SnapTarget(
    val name: String,
    val anchor: NormalizedPoint,
    val presetOffset: NormalizedPoint? = null
)

data class SnapResult(
    val isSnapped: Boolean,
    val targetName: String?,
    val distance: Float,
    val snappedPosition: NormalizedPoint
)

object NormalizedCoordinatesEngine {

    const val DEFAULT_SNAP_THRESHOLD = 0.08f

    /**
     * 归一化坐标转换为实际物理画布像素坐标
     * Pixel_X = Normalized_X * W_px
     * Pixel_Y = Normalized_Y * H_px
     */
    fun normalizedToPixel(point: NormalizedPoint, canvas: CanvasDimensions): PixelPoint {
        return PixelPoint(
            x = (point.x * canvas.width * 100f).roundToInt() / 100f,
            y = (point.y * canvas.height * 100f).roundToInt() / 100f
        )
    }

    /**
     * 物理画布像素坐标转换为归一化虚拟坐标 (0.0000 ~ 1.0000)
     */
    fun pixelToNormalized(pixel: PixelPoint, canvas: CanvasDimensions): NormalizedPoint {
        if (canvas.width <= 0f || canvas.height <= 0f) {
            return NormalizedPoint(0f, 0f)
        }
        val nx = max(0f, min(1f, pixel.x / canvas.width))
        val ny = max(0f, min(1f, pixel.y / canvas.height))
        return NormalizedPoint(
            x = (nx * 10000f).roundToInt() / 10000f,
            y = (ny * 10000f).roundToInt() / 10000f
        )
    }

    /**
     * 计算两点在归一化空间中的欧几里得距离
     * Dist = sqrt((x1 - x2)^2 + (y1 - y2)^2)
     */
    fun calculateNormalizedDistance(p1: NormalizedPoint, p2: NormalizedPoint): Float {
        val dx = p1.x - p2.x
        val dy = p1.y - p2.y
        return sqrt((dx * dx + dy * dy).toDouble()).toFloat()
    }

    /**
     * 智能骨骼锚点吸附计算 (Snap Calculation - PRD 6.2)
     */
    fun evaluateSnapAlignment(
        currentPos: NormalizedPoint,
        anchors: List<SnapTarget>,
        threshold: Float = DEFAULT_SNAP_THRESHOLD
    ): SnapResult {
        var closestTarget: SnapTarget? = null
        var minDistance = Float.MAX_VALUE

        for (target in anchors) {
            val dist = calculateNormalizedDistance(currentPos, target.anchor)
            if (dist < minDistance) {
                minDistance = dist
                closestTarget = target
            }
        }

        if (closestTarget != null && minDistance < threshold) {
            val offsetX = closestTarget.presetOffset?.x ?: 0f
            val offsetY = closestTarget.presetOffset?.y ?: 0f
            return SnapResult(
                isSnapped = true,
                targetName = closestTarget.name,
                distance = (minDistance * 10000f).roundToInt() / 10000f,
                snappedPosition = NormalizedPoint(
                    x = closestTarget.anchor.x + offsetX,
                    y = closestTarget.anchor.y + offsetY
                )
            )
        }

        return SnapResult(
            isSnapped = false,
            targetName = null,
            distance = if (minDistance == Float.MAX_VALUE) 0f else (minDistance * 10000f).roundToInt() / 10000f,
            snappedPosition = currentPos
        )
    }
}
