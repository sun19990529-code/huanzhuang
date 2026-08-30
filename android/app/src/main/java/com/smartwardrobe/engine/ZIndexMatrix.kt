package com.smartwardrobe.engine

object ZIndexMatrixEngine {

    fun getBaseLayerWeight(category: String): Int {
        return when (category) {
            "AVATAR" -> 0
            "TOPS" -> 10
            "BOTTOMS" -> 20
            "ONE_PIECE" -> 30
            "OUTERWEAR" -> 40
            "FOOTWEAR" -> 50
            "ACCESSORIES" -> 60
            else -> 10
        }
    }

    fun getStateModifier(category: String, state: String): Int {
        if (category == "TOPS") {
            if (state == "UNTUCKED") return 15
            if (state == "TUCKED" || state == "DEFAULT") return 0
        }
        if (category == "OUTERWEAR") {
            if (state == "CLOSED") return 5
            if (state == "OPEN" || state == "DEFAULT") return 0
        }
        return 0
    }

    /**
     * Render_Z_Index = Base_Layer_Weight + Delta_State_Modifier + User_Offset
     */
    fun calculateRenderZIndex(category: String, state: String = "DEFAULT", userOffset: Int = 0): Int {
        val base = getBaseLayerWeight(category)
        val modifier = getStateModifier(category, state)
        return base + modifier + userOffset
    }
}
