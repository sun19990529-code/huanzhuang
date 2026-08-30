package com.smartwardrobe.data.local.entities

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

enum class SyncStatus {
    PENDING,
    SYNCED,
    FAILED
}

@Entity(tableName = "local_profiles")
data class ProfileEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val name: String,
    val gender: String,
    val isDefault: Boolean,
    val heightCm: Float,
    val weightKg: Float,
    val bustCm: Float,
    val waistCm: Float,
    val hipsCm: Float,
    val privacyLevel: String,
    val syncStatus: SyncStatus = SyncStatus.SYNCED
)

@Entity(
    tableName = "local_garments",
    indices = [Index(value = ["profileId"]), Index(value = ["primaryCategory"])]
)
data class GarmentEntity(
    @PrimaryKey val id: String,
    val profileId: String?,
    val isPublic: Boolean,
    val clonedFromId: String?,
    val title: String,
    val primaryCategory: String, // TOPS, BOTTOMS, OUTERWEAR, FOOTWEAR, ACCESSORIES
    val subCategory: String,
    val colorsJson: String,
    val patternsJson: String,
    val material: String?,
    val brand: String?,
    val priceCents: Int?,
    val syncStatus: SyncStatus = SyncStatus.SYNCED
)

@Entity(
    tableName = "local_garment_assets",
    foreignKeys = [
        ForeignKey(
            entity = GarmentEntity::class,
            parentColumns = ["id"],
            childColumns = ["garmentId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["garmentId"])]
)
data class GarmentAssetEntity(
    @PrimaryKey val id: String,
    val garmentId: String,
    val stateType: String, // DEFAULT, OPEN, CLOSED, TUCKED, UNTUCKED
    val pngUrl: String,
    val defaultAnchorX: Float = 0.5f,
    val defaultAnchorY: Float = 0.5f,
    val baseLayerWeight: Int = 10
)

@Entity(
    tableName = "local_outfits",
    indices = [Index(value = ["profileId"])]
)
data class OutfitEntity(
    @PrimaryKey val id: String,
    val profileId: String,
    val creatorUserId: String,
    val title: String,
    val previewImageUrl: String?,
    val isVtonRendered: Boolean,
    val itemsJson: String, // 穿戴单品及几何矩阵 JSON
    val syncStatus: SyncStatus = SyncStatus.PENDING,
    val createdAt: Long = System.currentTimeMillis()
)
