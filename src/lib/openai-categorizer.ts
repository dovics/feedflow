import { prisma } from "./prisma";

interface FeedInfo {
  url: string;
  title?: string;
  description?: string;
  items?: Array<{
    title?: string;
    description?: string;
  }>;
}

interface OpenAIConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

export async function getOpenAIConfig(): Promise<OpenAIConfig | null> {
  try {
    const baseURL = await prisma.systemConfig.findUnique({
      where: { key: "OPENAI_BASE_URL" }
    });

    const apiKey = await prisma.systemConfig.findUnique({
      where: { key: "OPENAI_API_KEY" }
    });

    const model = await prisma.systemConfig.findUnique({
      where: { key: "OPENAI_MODEL" }
    });

    if (!baseURL || !apiKey || !model) {
      return null;
    }

    if (!apiKey.value) {
      return null;
    }

    return {
      baseURL: baseURL.value,
      apiKey: apiKey.value,
      model: model.value
    };
  } catch (error) {
    console.error("Failed to fetch OpenAI config:", error);
    return null;
  }
}

export async function categorizeFeed(feedInfo: FeedInfo): Promise<string[] | null> {
  const config = await getOpenAIConfig();

  if (!config) {
    console.log("OpenAI configuration not set, skipping categorization");
    return null;
  }

    try {
    const feedTitle = feedInfo.title || feedInfo.url;
    const feedDescription = feedInfo.description || "No description available";

    const sampleItems = (feedInfo.items || []).slice(0, 5);
    const itemsText = sampleItems
      .map((item, index) => `${index + 1}. ${item.title || "Untitled"}: ${item.description || ""}`)
      .join("\n");

    const prompt = `你是一个RSS订阅源分类助手。请根据以下信息，为这个RSS订阅源分配一个合适的分类。

RSS源信息：
- 标题: ${feedTitle}
- 描述: ${feedDescription}
- 链接: ${feedInfo.url}

最近的文章内容（前5篇）：
${itemsText || "暂无文章内容"}

请从以下常见分类中选择最合适的一个（如果都不合适，可以建议一个新的分类）：
- 技术
- 新闻
- 财经
- 娱乐
- 体育
- 游戏
- 教育
- 健康
- 生活
- 旅游
- 美食
- 摄影
- 设计
- 开发
- 科学
- 文化
- 艺术
- 政治
- 其他

请只返回分类名称，不要包含任何其他文字或解释。`;

    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content: "你是一个专业的RSS订阅源分类助手。你的任务是分析RSS源的内容，并为其分配最合适的分类。只返回分类名称，不要包含任何解释。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 20
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const category = data.choices?.[0]?.message?.content?.trim();

    if (!category) {
      console.error("No category returned from OpenAI");
      return null;
    }

    console.log(`Feed "${feedTitle}" categorized as: ${category}`);
    return [category];
  } catch (error) {
    console.error("Failed to categorize feed:", error);
    return null;
  }
}

export async function categorizeFeedById(feedId: string): Promise<string[] | null> {
  try {
    const feed = await prisma.feed.findUnique({
      where: { id: feedId },
      include: {
        items: {
          take: 5,
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!feed) {
      console.error(`Feed not found: ${feedId}`);
      return null;
    }

    const tags = await categorizeFeed({
      url: feed.url,
      title: feed.title || undefined,
      items: feed.items.map(item => ({
        title: item.title || undefined,
        description: item.description || undefined
      }))
    });

    if (tags) {
      await prisma.feed.update({
        where: { id: feedId },
        data: { tags }
      });
    }

    return tags;
  } catch (error) {
    console.error("Failed to categorize feed by ID:", error);
    return null;
  }
}
