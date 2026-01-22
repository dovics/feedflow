import { prisma } from "./prisma";
import { getOpenAIConfig } from "./openai-categorizer";

interface SummaryItem {
  id: string;
  title: string;
  link?: string;
  description?: string;
  pubDate: Date;
  feedTitle: string;
  tags: string[];
}

interface GroupedItems {
  [tag: string]: SummaryItem[];
}

export interface SummaryResult {
  success: boolean;
  content?: string;
  error?: string;
  itemCount?: number;
  articleMap?: { [key: number]: string }; // Maps article index to article link
}

export async function generateDailySummary(userId: string, language: string = "zh"): Promise<SummaryResult> {
  const config = await getOpenAIConfig();

  if (!config) {
    console.log("OpenAI configuration not set, cannot generate summary");
    return {
      success: false,
      error: language === "zh"
        ? "未配置 OpenAI API，请在管理员设置中配置"
        : "OpenAI API not configured, please configure in admin settings"
    };
  }

  try {
    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Fetch all unread items from the last 24 hours
    const items = await prisma.item.findMany({
      where: {
        read: false,
        pubDate: {
          gte: twentyFourHoursAgo
        },
        feed: {
          userId: userId
        }
      },
      include: {
        feed: {
          select: {
            title: true,
            tags: true
          }
        }
      },
      orderBy: {
        pubDate: "desc"
      },
      take: 100 // Limit to 100 items for token efficiency
    });

    if (items.length === 0) {
      return {
        success: false,
        error: language === "zh"
          ? "过去24小时内没有未读文章"
          : "No unread articles in the last 24 hours",
        itemCount: 0,
        articleMap: {}
      };
    }

    // Group items by tags
    const grouped: GroupedItems = {};
    const untagged: SummaryItem[] = [];

    items.forEach((item) => {
      const summaryItem: SummaryItem = {
        id: item.id,
        title: item.title,
        link: item.link || undefined,
        description: item.description ? (item.description.length > 200 ? item.description.substring(0, 200) + "..." : item.description) : undefined,
        pubDate: item.pubDate || new Date(),
        feedTitle: item.feed.title || "Untitled Feed",
        tags: item.feed.tags
      };

      const tags = item.feed.tags || [];
      if (tags.length > 0) {
        tags.forEach((tag) => {
          if (!grouped[tag]) {
            grouped[tag] = [];
          }
          grouped[tag].push(summaryItem);
        });
      } else {
        untagged.push(summaryItem);
      }
    });

    // Format grouped items for the prompt
    let groupedText = "";
    const sortedTags = Object.keys(grouped).sort();

    // Create a map to track article indices globally
    const articleIndexMap = new Map<string, number>();
    const articleLinkMap: { [key: number]: string } = {};
    let globalIndex = 1;

    sortedTags.forEach((tag) => {
      groupedText += `\n## ${tag}\n`;
      grouped[tag].slice(0, 5).forEach((item, index) => {
        articleIndexMap.set(item.id, globalIndex);
        if (item.link) {
          articleLinkMap[globalIndex] = item.link;
        }
        groupedText += `[${globalIndex}] ${item.title}`;
        if (item.description) {
          groupedText += `\n   ${item.description}`;
        }
        groupedText += "\n";
        globalIndex++;
      });
    });

    if (untagged.length > 0) {
      groupedText += "\n## 其他\n";
      untagged.slice(0, 5).forEach((item, index) => {
        articleIndexMap.set(item.id, globalIndex);
        if (item.link) {
          articleLinkMap[globalIndex] = item.link;
        }
        groupedText += `[${globalIndex}] ${item.title}\n`;
        globalIndex++;
      });
    }

    // Create the prompt
    const systemPrompt = language === "zh"
      ? "你是一个专业的新闻摘要助手。你的任务是分析过去24小时内的未读文章，生成简洁、有条理的每日摘要。摘要应该突出重点，帮助用户快速了解重要信息。使用markdown格式输出。"
      : "You are a professional news summarization assistant. Your task is to analyze unread articles from the last 24 hours and generate a concise, well-organized daily summary. The summary should highlight key points and help users quickly understand important information. Use markdown format.";

    const userPrompt = language === "zh"
      ? `请基于以下过去24小时的未读文章生成今日摘要：

${groupedText}

请按以下格式生成摘要：

## 今日要点
列出3-5个最重要的新闻或趋势，在提到具体文章时使用 [编号] 格式引用文章

## 分类摘要
按分类简要总结各领域的主要动态，在提到具体文章时使用 [编号] 格式引用文章

## 值得关注
推荐3-5篇特别值得阅读的文章及其理由，使用 [编号] 格式引用文章

重要：在摘要中引用文章时，必须使用文章编号的方括号格式，例如 [1]、[2]、[3] 等。这样用户可以点击查看原文链接。

保持简洁，每部分控制在2-3句话。使用markdown格式。`
      : `Please generate a daily summary based on the following unread articles from the last 24 hours:

${groupedText}

Please format the summary as follows:

## Today's Highlights
List 3-5 most important news or trends, reference specific articles using [number] format

## Category Summaries
Briefly summarize key developments in each category, reference specific articles using [number] format

## Worth Reading
Recommend 3-5 articles that are particularly worth reading with reasons, use [number] format to reference articles

Important: When referencing articles in the summary, you must use the bracketed number format like [1], [2], [3], etc. This allows users to click and view the original article links.

Keep it concise, limit each section to 2-3 sentences. Use markdown format.`;

    // Call OpenAI API
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
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: 0.5,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      console.error("No summary returned from OpenAI");
      return {
        success: false,
        error: language === "zh"
          ? "未收到有效的摘要内容"
          : "No valid summary content received"
      };
    }

    return {
      success: true,
      content: summary,
      itemCount: items.length,
      articleMap: articleLinkMap
    };
  } catch (error) {
    console.error("Failed to generate summary:", error);
    return {
      success: false,
      error: language === "zh"
        ? "生成摘要时发生错误"
        : "Error occurred while generating summary"
    };
  }
}

export async function getTodaySummary(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await prisma.dailySummary.findUnique({
    where: {
      userId_date: {
        userId: userId,
        date: today
      }
    }
  });
}

export async function createDailySummary(userId: string, content: string, language: string, itemCount: number, articleMap?: { [key: number]: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await prisma.dailySummary.create({
    data: {
      userId: userId,
      date: today,
      content: content,
      language: language,
      itemCount: itemCount,
      ...(articleMap ? { articleMap } : {})
    }
  });
}

export async function getUserSummaryLanguage(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { summaryLanguage: true }
  });

  return user?.summaryLanguage || "zh";
}
