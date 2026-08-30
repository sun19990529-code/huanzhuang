package com.smartwardrobe.data.local.dao

import androidx.room.*
import com.smartwardrobe.data.local.entities.*
import kotlinx.coroutines.flow.Flow

@Dao
interface WardrobeDao {

    // 1. Profile 操作
    @Query("SELECT * FROM local_profiles WHERE userId = :userId")
    fun getProfilesFlow(userId: String): Flow<List<ProfileEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProfiles(profiles: List<ProfileEntity>)

    // 2. Garments & Assets 操作 (离线优先)
    @Query("SELECT * FROM local_garments WHERE profileId = :profileId OR (profileId IS NULL AND isPublic = 1)")
    fun getGarmentsFlow(profileId: String): Flow<List<GarmentEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertGarments(garments: List<GarmentEntity>)

    @Query("SELECT * FROM local_garment_assets WHERE garmentId = :garmentId")
    suspend fun getAssetsForGarment(garmentId: String): List<GarmentAssetEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAssets(assets: List<GarmentAssetEntity>)

    // 3. Outfits 操作 (离线暂存与待同步查询)
    @Query("SELECT * FROM local_outfits WHERE profileId = :profileId ORDER BY createdAt DESC")
    fun getOutfitsFlow(profileId: String): Flow<List<OutfitEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOutfit(outfit: OutfitEntity)

    @Query("SELECT * FROM local_outfits WHERE syncStatus = 'PENDING'")
    suspend fun getPendingSyncOutfits(): List<OutfitEntity>

    @Query("UPDATE local_outfits SET syncStatus = 'SYNCED' WHERE id = :outfitId")
    suspend fun markOutfitSynced(outfitId: String)
}
