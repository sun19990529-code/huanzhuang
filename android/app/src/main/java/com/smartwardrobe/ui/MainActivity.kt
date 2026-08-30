package com.smartwardrobe.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.smartwardrobe.ui.canvas.ComposeWornItem
import com.smartwardrobe.ui.canvas.DressingCanvasView

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    background = Color(0xFF09090B),
                    surface = Color(0xFF0F172A),
                    primary = Color(0xFF7C3AED)
                )
            ) {
                var wornItems by remember {
                    mutableStateOf(
                        listOf(
                            ComposeWornItem(
                                id = "top-1",
                                title = "经典条纹T恤",
                                category = "TOPS",
                                state = "DEFAULT",
                                color = Color(0xFF2E7D32)
                            ),
                            ComposeWornItem(
                                id = "outer-1",
                                title = "法式廓形西装",
                                category = "OUTERWEAR",
                                state = "OPEN",
                                color = Color(0xFFD7CCC8)
                            ),
                            ComposeWornItem(
                                id = "bottom-1",
                                title = "高腰复古牛仔裤",
                                category = "BOTTOMS",
                                state = "DEFAULT",
                                color = Color(0xFF5C6BC0)
                            )
                        )
                    )
                }

                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    DressingCanvasView(
                        wornItems = wornItems,
                        onUpdateItem = { id, offsetX, offsetY, state ->
                            wornItems = wornItems.map {
                                if (it.id == id) it.copy(offsetX = offsetX, offsetY = offsetY, state = state) else it
                            }
                        }
                    )
                }
            }
        }
    }
}
