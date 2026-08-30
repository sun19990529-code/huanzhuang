"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const src_1 = require("../src");
(0, node_test_1.default)('1. 归一化坐标转换与精度测试', () => {
    const canvas = { width: 800, height: 1200 };
    const normPoint = { x: 0.5, y: 0.28 };
    const pixel = (0, src_1.normalizedToPixel)(normPoint, canvas);
    strict_1.default.equal(pixel.x, 400);
    strict_1.default.equal(pixel.y, 336);
    const backToNorm = (0, src_1.pixelToNormalized)(pixel, canvas);
    strict_1.default.equal(backToNorm.x, 0.5);
    strict_1.default.equal(backToNorm.y, 0.28);
});
(0, node_test_1.default)('2. 欧几里得距离计算', () => {
    const p1 = { x: 0.5, y: 0.3 };
    const p2 = { x: 0.53, y: 0.34 };
    const dist = (0, src_1.calculateNormalizedDistance)(p1, p2);
    strict_1.default.equal(Math.round(dist * 100) / 100, 0.05);
});
(0, node_test_1.default)('3. 骨骼锚点智能吸附测试 (Snap Engine)', () => {
    const anchors = [
        { name: 'neck', anchor: { x: 0.5, y: 0.28 } },
        { name: 'waist', anchor: { x: 0.5, y: 0.55 } },
    ];
    // 距离 neck 很近 (<0.08) -> 触发吸附
    const nearNeck = { x: 0.52, y: 0.29 };
    const res1 = (0, src_1.evaluateSnapAlignment)(nearNeck, anchors, 0.08);
    strict_1.default.equal(res1.isSnapped, true);
    strict_1.default.equal(res1.targetName, 'neck');
    strict_1.default.equal(res1.snappedPosition.x, 0.5);
    strict_1.default.equal(res1.snappedPosition.y, 0.28);
    // 距离远 (>0.08) -> 不吸附
    const farAway = { x: 0.7, y: 0.8 };
    const res2 = (0, src_1.evaluateSnapAlignment)(farAway, anchors, 0.08);
    strict_1.default.equal(res2.isSnapped, false);
    strict_1.default.equal(res2.snappedPosition.x, 0.7);
    strict_1.default.equal(res2.snappedPosition.y, 0.8);
});
(0, node_test_1.default)('4. Z-Index 矩阵与状态联动计算', () => {
    // L1 T恤默认塞衣角
    const tShirtDefault = (0, src_1.calculateRenderZIndex)('TOPS', 'DEFAULT');
    strict_1.default.equal(tShirtDefault, 10);
    // L1 T恤外放 Untucked -> 25 (应高于下装 20)
    const tShirtUntucked = (0, src_1.calculateRenderZIndex)('TOPS', 'UNTUCKED');
    strict_1.default.equal(tShirtUntucked, 25);
    // L2 下装 -> 20
    const jeansZ = (0, src_1.calculateRenderZIndex)('BOTTOMS', 'DEFAULT');
    strict_1.default.equal(jeansZ, 20);
    strict_1.default.ok(tShirtUntucked > jeansZ, 'Untucked T-Shirt should be higher than Bottoms');
    strict_1.default.ok(tShirtDefault < jeansZ, 'Tucked T-Shirt should be lower than Bottoms');
    // L4 外套 Open -> 40, Closed -> 45
    strict_1.default.equal((0, src_1.calculateRenderZIndex)('OUTERWEAR', 'OPEN'), 40);
    strict_1.default.equal((0, src_1.calculateRenderZIndex)('OUTERWEAR', 'CLOSED'), 45);
});
(0, node_test_1.default)('5. 类目互斥检测', () => {
    strict_1.default.equal((0, src_1.isMutuallyExclusive)('TOPS', 'TOPS'), true);
    strict_1.default.equal((0, src_1.isMutuallyExclusive)('TOPS', 'BOTTOMS'), false);
    strict_1.default.equal((0, src_1.isMutuallyExclusive)('ONE_PIECE', 'TOPS'), true);
    strict_1.default.equal((0, src_1.isMutuallyExclusive)('ONE_PIECE', 'BOTTOMS'), true);
});
