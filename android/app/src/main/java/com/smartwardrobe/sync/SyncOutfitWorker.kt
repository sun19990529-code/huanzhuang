package com.smartwardrobe.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.smartwardrobe.data.local.WardrobeDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SyncOutfitWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val database = WardrobeDatabase.getDatabase(applicationContext)
        val dao = database.wardrobeDao()

        try {
            // 扫描所有本地待同步的搭配 (sync_status = PENDING)
            val pendingOutfits = dao.getPendingSyncOutfits()

            for (outfit in pendingOutfits) {
                // 模拟向服务端 POST /v1/outfits 提交
                // 成功后更新本地状态为 SYNCED
                dao.markOutfitSynced(outfit.id)
            }

            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
