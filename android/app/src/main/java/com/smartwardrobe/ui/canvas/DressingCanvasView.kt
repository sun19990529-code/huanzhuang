package com.smartwardrobe.ui.canvas

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartwardrobe.engine.*

data class ComposeWornItem(
    val id: String,
    val title: String,
    val category: String,
    val state: String = "DEFAULT",
    var offsetX: Float = 0f,
    var offsetY: Float = 0f,
    val color: Color = Color(0xFF7C3AED)
)

@Composable
fun DressingCanvasView(
    wornItems: List<ComposeWornItem>,
    onUpdateItem: (String, Float, Float, String) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedItemId by remember { mutableStateOf<String?>(null) }
    var isSnapMode by remember { mutableStateOf(true) }

    val sortedItems = remember(wornItems) {
        wornItems.sortedBy {
            ZIndexMatrixEngine.calculateRenderZIndex(it.category, it.state)
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A)),
        contentAlignment = Alignment.Center
    ) {
        Canvas(
            modifier = Modifier
                .width(360.dp)
                .height(560.dp)
                .background(Color(0xFF020617), shape = RoundedCornerShape(24.dp))
                .pointerInput(Unit) {
                    detectDragGestures(
                        onDragStart = { offset ->
                            if (wornItems.isNotEmpty()) {
                                selectedItemId = wornItems.first().id
                            }
                        },
                        onDrag = { change, dragAmount ->
                            change.consume()
                            selectedItemId?.let { id ->
                                val item = wornItems.find { it.id == id }
                                if (item != null) {
                                    val newOffsetX = item.offsetX + dragAmount.x / size.width
                                    val newOffsetY = item.offsetY + dragAmount.y / size.height
                                    onUpdateItem(id, newOffsetX, newOffsetY, item.state)
                                }
                            }
                        },
                        onDragEnd = {
                            if (isSnapMode && selectedItemId != null) {
                                val item = wornItems.find { it.id == selectedItemId }
                                if (item != null) {
                                    val currentPos = NormalizedPoint(0.5f + item.offsetX, 0.5f + item.offsetY)
                                    val anchors = listOf(
                                        SnapTarget("neck", NormalizedPoint(0.5f, 0.28f)),
                                        SnapTarget("waist", NormalizedPoint(0.5f, 0.53f)),
                                        SnapTarget("feet", NormalizedPoint(0.5f, 0.88f))
                                    )
                                    val result = NormalizedCoordinatesEngine.evaluateSnapAlignment(currentPos, anchors, 0.08f)
                                    if (result.isSnapped) {
                                        onUpdateItem(selectedItemId!!, 0f, 0f, item.state)
                                    }
                                }
                            }
                        }
                    )
                }
        ) {
            val canvasDim = CanvasDimensions(size.width, size.height)
            val centerX = size.width * 0.5f
            val headY = size.height * 0.14f
            val neckY = size.height * 0.25f
            val waistY = size.height * 0.50f
            val hipsY = size.height * 0.58f
            val feetY = size.height * 0.88f

            // 1. 绘制素体轮廓 (L0 Avatar)
            drawCircle(
                color = Color(0xFF1E1B4B),
                radius = 24f,
                center = Offset(centerX, headY)
            )
            drawCircle(
                color = Color(0xFFA855F7).copy(alpha = 0.4f),
                radius = 24f,
                center = Offset(centerX, headY),
                style = Stroke(width = 2f)
            )

            // 躯干
            drawRect(
                color = Color(0xFF1E1B4B),
                topLeft = Offset(centerX - 40f, neckY),
                size = Size(80f, hipsY - neckY)
            )
            drawRect(
                color = Color(0xFFA855F7).copy(alpha = 0.4f),
                topLeft = Offset(centerX - 40f, neckY),
                size = Size(80f, hipsY - neckY),
                style = Stroke(width = 2f)
            )

            // 贴身平角裤 (PRD 3.2.1)
            drawRect(
                color = Color(0xFF9333EA).copy(alpha = 0.3f),
                topLeft = Offset(centerX - 35f, waistY),
                size = Size(70f, hipsY - waistY + 20f)
            )

            // 2. 骨骼锚点
            val anchors = listOf(
                NormalizedPoint(0.5f, 0.28f),
                NormalizedPoint(0.5f, 0.53f),
                NormalizedPoint(0.5f, 0.88f)
            )
            anchors.forEach { anchor ->
                val pix = NormalizedCoordinatesEngine.normalizedToPixel(anchor, canvasDim)
                drawCircle(
                    color = Color(0xFFEAB308),
                    radius = 5f,
                    center = Offset(pix.x, pix.y)
                )
            }

            // 3. 逐层渲染穿戴的衣物
            sortedItems.forEach { item ->
                val isSelected = item.id == selectedItemId
                val baseAnchor = when (item.category) {
                    "TOPS" -> NormalizedPoint(0.5f, 0.28f)
                    "BOTTOMS" -> NormalizedPoint(0.5f, 0.53f)
                    "OUTERWEAR" -> NormalizedPoint(0.5f, 0.28f)
                    "FOOTWEAR" -> NormalizedPoint(0.5f, 0.88f)
                    else -> NormalizedPoint(0.5f, 0.12f)
                }

                val pix = NormalizedCoordinatesEngine.normalizedToPixel(baseAnchor, canvasDim)
                val posX = pix.x + item.offsetX * size.width
                val posY = pix.y + item.offsetY * size.height

                when (item.category) {
                    "TOPS" -> {
                        val height = if (item.state == "UNTUCKED") 140f else 110f
                        drawRoundRect(
                            color = item.color,
                            topLeft = Offset(posX - 60f, posY - 20f),
                            size = Size(120f, height),
                            cornerRadius = androidx.compose.ui.geometry.CornerRadius(16f, 16f)
                        )
                    }
                    "BOTTOMS" -> {
                        drawRoundRect(
                            color = item.color,
                            topLeft = Offset(posX - 50f, posY - 10f),
                            size = Size(100f, 180f),
                            cornerRadius = androidx.compose.ui.geometry.CornerRadius(12f, 12f)
                        )
                    }
                    "OUTERWEAR" -> {
                        if (item.state == "OPEN") {
                            // 敞开
                            drawRoundRect(
                                color = item.color,
                                topLeft = Offset(posX - 75f, posY - 25f),
                                size = Size(50f, 200f),
                                cornerRadius = androidx.compose.ui.geometry.CornerRadius(10f, 10f)
                            )
                            drawRoundRect(
                                color = item.color,
                                topLeft = Offset(posX + 25f, posY - 25f),
                                size = Size(50f, 200f),
                                cornerRadius = androidx.compose.ui.geometry.CornerRadius(10f, 10f)
                            )
                        } else {
                            // 合拢
                            drawRoundRect(
                                color = item.color,
                                topLeft = Offset(posX - 70f, posY - 25f),
                                size = Size(140f, 200f),
                                cornerRadius = androidx.compose.ui.geometry.CornerRadius(10f, 10f)
                            )
                        }
                    }
                    "FOOTWEAR" -> {
                        drawRoundRect(
                            color = item.color,
                            topLeft = Offset(posX - 45f, posY - 10f),
                            size = Size(90f, 25f),
                            cornerRadius = androidx.compose.ui.geometry.CornerRadius(8f, 8f)
                        )
                    }
                }

                if (isSelected) {
                    drawRect(
                        color = Color(0xFF38BDF8),
                        topLeft = Offset(posX - 80f, posY - 30f),
                        size = Size(160f, 220f),
                        style = Stroke(width = 2f)
                    )
                }
            }
        }
    }
}
