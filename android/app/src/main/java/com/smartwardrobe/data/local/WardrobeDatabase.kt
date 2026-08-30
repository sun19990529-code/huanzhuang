package com.smartwardrobe.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.smartwardrobe.data.local.dao.WardrobeDao
import com.smartwardrobe.data.local.entities.*

@Database(
    entities = [
        ProfileEntity::class,
        GarmentEntity::class,
        GarmentAssetEntity::class,
        OutfitEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class WardrobeDatabase : RoomDatabase() {
    abstract fun wardrobeDao(): WardrobeDao

    companion object {
        @Volatile
        private var INSTANCE: WardrobeDatabase? = null

        fun getDatabase(context: Context): WardrobeDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    WardrobeDatabase::class.java,
                    "smart_wardrobe_offline.db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
