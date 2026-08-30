package com.smartwardrobe.data.repository

import android.content.Context
import androidx.work.*
import com.smartwardrobe.data.local.dao.WardrobeDao
import com.smartwardrobe.data.local.entities.OutfitEntity
import com.smartwardrobe.data.local.entities.SyncStatus
import com.smartwardrobe.sync.SyncOutfitWorker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class OfflineFirstWardrobeRepository(
    private val context: Context,
    private val dao: WardrobeDao
) {

    /**
     * 离线保存搭配套装 (PRD 3.8.1)
     * 本地暂存至 Room 数据库并标记 sync_status = PENDING，后台调度 WorkManager
     */
    suspend fun saveOutfitOffline(
        profileId: String,
        creatorUserId: String,
        title: string,
        itemsJson: String,
        previewImageUrl: String? = null
    ): OutfitEntity = withContext(Dispatchers.IO) {
        val outfitId = "outfit-local-${System.currentTimeMillis()}"
        val entity = OutfitEntity(
            id = outfitId,
            profileId = profileId,
            creatorUserId = creatorUserId,
            title = title,
            previewImageUrl = previewImageUrl,
            isVtonRendered = false,
            itemsJson = itemsJson,
            syncStatus = SyncStatus.PENDING
        )

        // 1. 写入本地 Room 数据库
        dao.insertOutfit(entity)

        // 2. 调度 WorkManager 在联网时自动同步
        scheduleSyncWork()

        entity
    }

    /**
     * 触发 WorkManager 双向增量同步 (PRD 3.8.2)
     */
    private fun scheduleSyncWork() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncRequest = OneTimeWorkRequestBuilder<SyncOutfitWorker>()
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            "sync_outfits_work",
            ExistingWorkPolicy.REPLACE,
            syncRequest
        )
    }
}
