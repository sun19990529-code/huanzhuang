// ====================================================================
// SmartWardrobe 高精图像处理与两阶段 Alpha 透明通道生成工具 (ImageUtils)
// 包含：外边缘连通域阻断算法 (Boundary-Constrained Flood-Fill)
// 彻底解决传统颜色容差导致白色/浅色衣服内部被抠穿的问题
// ====================================================================

export class ImageUtils {
  /**
   * 判断服装颜色是否属于浅色/白色系，以动态决定生成时的最佳反差背景
   * 若为白色/浅米色单品，生图提示词自动采用高反差中性冷灰底 (#7F7F7F) 而非纯白底 (#FFFFFF)
   */
  public static isLightOrWhiteColor(colors: string[], title: string = ''): boolean {
    const lightColorKeywords = /白|米|乳白|银|浅灰|杏|象牙|white|ivory|cream|beige|silver/i;
    if (lightColorKeywords.test(title)) return true;

    for (const c of colors) {
      if (lightColorKeywords.test(c)) return true;
      if (c.startsWith('#')) {
        const hex = c.replace('#', '');
        if (hex.length === 6) {
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          // 亮度高于 220 判定为浅色系
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          if (brightness > 220) return true;
        }
      }
    }
    return false;
  }
}
