import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Parser from "rss-parser";
import { logger } from "@/lib/logger";
import { z } from "zod";

const parser = new Parser({
  timeout: 15000,
  maxRedirects: 5,
  customFields: {
    item: []
  }
});

interface OPMLOutline {
  text?: string;
  title?: string;
  xmlUrl?: string;
  htmlUrl?: string;
  type?: string;
  '@_text'?: string;
  '@_title'?: string;
  '@_xmlUrl'?: string;
  '@_htmlUrl'?: string;
  '@_type'?: string;
  outline?: OPMLOutline[];
}

interface OPML {
  opml?: {
    body?: {
      outline?: OPMLOutline[];
    };
  };
}

async function parseOPML(xmlContent: string): Promise<Array<{ url: string; title: string; tags: string[] }>> {
  const feeds: Array<{ url: string; title: string; tags: string[] }> = [];

  try {
    // 尝试解析为标准的 OPML 格式
    const parsed = await import('fast-xml-parser').then(mod => {
      const parser = new mod.XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text'
      });
      return parser.parse(xmlContent) as OPML;
    });

    const body = parsed.opml?.body;
    if (!body) {
      throw new Error('Invalid OPML format: missing body');
    }

    const outlines = body.outline || [];
    const flatOutlines = flattenOutlines(outlines);

    for (const outline of flatOutlines) {
      const xmlUrl = outline.xmlUrl || outline['@_xmlUrl'];
      if (!xmlUrl) continue;

      const title = outline.title || outline['@_title'] || outline.text || outline['@_text'] || xmlUrl;
      const type = outline.type || outline['@_type'];

      // 如果是 RSS 类型，直接添加
      if (type === 'rss' || xmlUrl.includes('rss') || xmlUrl.includes('rdf') || xmlUrl.includes('atom')) {
        feeds.push({
          url: xmlUrl,
          title,
          tags: []
        });
      }
    }

    return feeds;
  } catch (error) {
    logger.warn('Failed to parse OPML with fast-xml-parser, trying regex fallback', {}, error as Error);

    // 回退到正则表达式解析
    const regex = /<outline[^>]*xmlUrl=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = regex.exec(xmlContent)) !== null) {
      const outlineTag = match[0];
      const url = match[1];

      let title = url;
      const titleMatch = /title=["']([^"']+)["']/i.exec(outlineTag);
      if (titleMatch) {
        title = titleMatch[1];
      } else {
        const textMatch = /text=["']([^"']+)["']/i.exec(outlineTag);
        if (textMatch) {
          title = textMatch[1];
        }
      }

      feeds.push({
        url,
        title,
        tags: []
      });
    }

    return feeds;
  }
}

function flattenOutlines(outlines: OPMLOutline[], parentTag = ''): OPMLOutline[] {
  const result: OPMLOutline[] = [];

  for (const outline of outlines) {
    // 如果有子 outline，当前 outline 是一个分类
    if (outline.outline && outline.outline.length > 0) {
      const tag = outline.title || outline['@_title'] || outline.text || outline['@_text'] || parentTag;
      const childOutlines = flattenOutlines(outline.outline, tag);

      // 为子项添加标签
      for (const child of childOutlines) {
        result.push(child);
      }
    } else {
      // 这是一个 feed outline
      result.push(outline);
    }
  }

  return result;
}

const importSchema = z.object({
  feeds: z.array(z.object({
    url: z.string().url(),
    title: z.string(),
    tags: z.array(z.string()).default([])
  })).min(1).max(100)
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.logApiRequestError('POST', '/api/feeds/opml/import', new Error('Unauthorized'), undefined, Date.now() - startTime);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = session.user.id;
    logger.logApiRequestStart('POST', '/api/feeds/opml/import', userId);

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: "请选择要导入的 OPML 文件" },
        { status: 400 }
      );
    }

    // 检查文件类型
    if (!file.name.endsWith('.opml') && !file.name.endsWith('.xml')) {
      return NextResponse.json(
        { error: "文件格式不支持，请上传 .opml 或 .xml 文件" },
        { status: 400 }
      );
    }

    // 读取文件内容
    const xmlContent = await file.text();

    // 解析 OPML
    const importedFeeds = await parseOPML(xmlContent);

    if (importedFeeds.length === 0) {
      return NextResponse.json(
        { error: "OPML 文件中没有找到有效的订阅源" },
        { status: 400 }
      );
    }

    logger.info('OPML file parsed', { userId, feedCount: importedFeeds.length });

    // 过滤掉已存在的订阅
    const existingUrls = await prisma.feed.findMany({
      where: {
        userId: session.user.id,
        url: {
          in: importedFeeds.map(f => f.url)
        }
      },
      select: {
        url: true
      }
    });

    const existingUrlSet = new Set(existingUrls.map(f => f.url));
    const newFeeds = importedFeeds.filter(f => !existingUrlSet.has(f.url));

    if (newFeeds.length === 0) {
      return NextResponse.json({
        message: "导入完成",
        imported: 0,
        skipped: importedFeeds.length,
        details: "所有订阅源都已存在"
      });
    }

    // 限制每次导入的数量
    if (newFeeds.length > 100) {
      return NextResponse.json(
        { error: `一次最多只能导入 100 个订阅源，文件中有 ${newFeeds.length} 个新订阅源` },
        { status: 400 }
      );
    }

    // 批量创建订阅源
    const results = {
      success: [] as Array<{ url: string; title: string }>,
      failed: [] as Array<{ url: string; error: string }>,
      skipped: existingUrlSet.size
    };

    for (const feed of newFeeds) {
      try {
        // 先解析 RSS 以获取详细信息
        let parsedFeed;
        try {
          parsedFeed = await parser.parseURL(feed.url);
        } catch (parseError) {
          logger.warn('Failed to parse RSS feed during import', { userId, url: feed.url }, parseError as Error);
          // 如果解析失败，仍然创建订阅源，使用 OPML 中的标题
          results.failed.push({
            url: feed.url,
            error: "RSS 解析失败"
          });
          continue;
        }

        const feedItems = parsedFeed.items.map((item) => ({
          title: item.title || "Untitled",
          link: item.link,
          description: item.contentSnippet || item.content || item.description,
          pubDate: item.pubDate ? new Date(item.pubDate) : new Date()
        }));

        const newFeed = await prisma.feed.create({
          data: {
            url: feed.url,
            title: feed.title || parsedFeed.title || feed.url,
            tags: feed.tags,
            userId: session.user.id,
            items: {
              create: feedItems
            }
          }
        });

        logger.logDatabaseOperation('create', 'Feed', { userId, feedId: newFeed.id });
        results.success.push({
          url: feed.url,
          title: feed.title
        });

      } catch (error) {
        logger.warn('Failed to import feed', { userId, url: feed.url }, error as Error);
        results.failed.push({
          url: feed.url,
          error: error instanceof Error ? error.message : "未知错误"
        });
      }
    }

    logger.logApiRequestSuccess('POST', '/api/feeds/opml/import', userId, Date.now() - startTime, {
      imported: results.success.length,
      failed: results.failed.length,
      skipped: results.skipped
    });

    return NextResponse.json({
      message: "导入完成",
      imported: results.success.length,
      failed: results.failed.length,
      skipped: results.skipped,
      details: results
    });

  } catch (error) {
    logger.logApiRequestError('POST', '/api/feeds/opml/import', error as Error, userId, Date.now() - startTime);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "无效的输入数据" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "导入失败：" + (error instanceof Error ? error.message : "未知错误") },
      { status: 500 }
    );
  }
}
