export interface ReadingSettings {
  fontSize: number; // 字体大小 (12-32px)
  lineHeight: number; // 行高 (1.2-2.5)
  fontFamily: string; // 字体 family
  fontFamilyName: string; // 字体显示名称
  backgroundColor: string; // 背景颜色 (hex)
  textColor: string; // 文本颜色 (hex)
}

export const FONT_FAMILIES = [
  {
    value: "'Inter', system-ui, -apple-system, sans-serif",
    label: "Inter"
  },
  {
    value: "'Georgia', 'Times New Roman', serif",
    label: "Georgia"
  },
  {
    value: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
    label: "Helvetica"
  },
  {
    value: "'Menlo', 'Monaco', 'Courier New', monospace",
    label: "Monospace"
  },
  {
    value: "'Verdana', sans-serif",
    label: "Verdana"
  },
  {
    value: "'Segoe UI', 'Roboto', sans-serif",
    label: "Segoe UI"
  },
  {
    value: "'Palatino', 'Palatino Linotype', serif",
    label: "Palatino"
  },
  {
    value: "'Comic Sans MS', 'Chalkboard SE', sans-serif",
    label: "Comic Sans"
  }
];

export const COLOR_PRESETS = [
  {
    name: "经典白色",
    description: "明亮清晰，适合白天阅读",
    backgroundColor: "#ffffff",
    textColor: "#000000"
  },
  {
    name: "护眼米色",
    description: "温暖柔和，减少眼部疲劳",
    backgroundColor: "#f5f5dc",
    textColor: "#2c3e50"
  },
  {
    name: "冷色调",
    description: "清爽舒适，适合长时间阅读",
    backgroundColor: "#e8f4f8",
    textColor: "#1a365d"
  },
  {
    name: "浅绿护眼",
    description: "自然放松，缓解视觉压力",
    backgroundColor: "#e8f5e9",
    textColor: "#1b5e20"
  },
  {
    name: "羊皮纸",
    description: "复古质感，阅读体验温馨",
    backgroundColor: "#fdf6e3",
    textColor: "#4a3c31"
  },
  {
    name: "夜间阅读",
    description: "深蓝背景，保护夜间视力",
    backgroundColor: "#1e3a5f",
    textColor: "#e8f4f8"
  },
  {
    name: "深色模式",
    description: "高对比深色，适合暗光环境",
    backgroundColor: "#1a1a2e",
    textColor: "#eee8d5"
  },
  {
    name: "暖色调",
    description: "温馨舒适，营造阅读氛围",
    backgroundColor: "#fff5eb",
    textColor: "#4a3728"
  },
  {
    name: "高对比度",
    description: "黑白分明，文字清晰醒目",
    backgroundColor: "#000000",
    textColor: "#ffffff"
  },
  {
    name: "淡雅灰",
    description: "简洁优雅，现代简约风格",
    backgroundColor: "#f8f9fa",
    textColor: "#212529"
  }
];

export const DEFAULT_READING_SETTINGS: ReadingSettings = {
  fontSize: 16,
  lineHeight: 1.6,
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  fontFamilyName: "Inter",
  backgroundColor: "#ffffff",
  textColor: "#000000"
};
