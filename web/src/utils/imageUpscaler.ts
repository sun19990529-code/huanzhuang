// ====================================================================
// SmartWardrobe 原生高保真大片下载引擎 (方案 A: 100% 原始画质直出)
// 保持模型生成的原始高保真数据，0 插值损失、0 锐化噪点、0 画质劣化
// ====================================================================

import { showToast } from '../components/Toast';

/**
 * 直接下载原始 AI 生成大片，100% 忠实于原图，无任何重采样与算法噪点
 * @param imageUrl 原图 URL 或 Data URL
 * @param taskId 任务 ID
 */
export async function downloadOriginalImage(
  imageUrl: string,
  taskId: string = 'vton'
): Promise<void> {
  if (!imageUrl) {
    showToast('成片图像尚未就绪，无法下载', 'error');
    return;
  }

  const filename = `${taskId}.png`;

  try {
    if (imageUrl.startsWith('data:image')) {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('📥 高清试穿大片已成功保存！', 'success');
      return;
    }

    // 跨域或 CDN 图片：fetch 二进制 Blob 并触发下载，防止被浏览器直接跳转打开
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`下载失败，状态码: ${response.status}`);
    }
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);

    showToast('📥 高清试穿大片已成功保存！', 'success');
  } catch (err: any) {
    console.error('[Download] 成片下载失败:', err);
    // 降级兜底直接打开
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('已在新窗口中打开大片原图', 'info');
  }
}

// 兼容旧调用别名
export const downloadAs4KImage = downloadOriginalImage;
