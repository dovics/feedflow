"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";

interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

export default function AdminPanel() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations();
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feeds, setFeeds] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [promotingUser, setPromotingUser] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      if (!["ADMIN", "SUPER_ADMIN"].includes(session?.user?.role || "")) {
        router.push("/");
      } else {
        fetchConfigs();
        fetchFeeds();
        fetchUsers();
      }
    }
  }, [status, session, router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchFeeds = async () => {
    try {
      const res = await fetch("/api/admin/feeds");
      const data = await res.json();
      if (res.ok) {
        setFeeds(data.feeds || []);
      }
    } catch (error) {
      console.error("Failed to fetch feeds:", error);
    }
  };

  const promoteUser = async (userId: string, newRole: string) => {
    try {
      setPromotingUser(userId);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole })
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "用户权限更新失败");
        return;
      }

      await fetchUsers();
      setError("");
    } catch (error) {
      setError("用户权限更新失败：网络错误");
    } finally {
      setPromotingUser(null);
    }
  };

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/config");
      const data = await res.json();
      if (res.ok) {
        const dbConfigs = data.configs || [];
        const defaultConfigs = [
          {
            id: "REGISTRATION_ENABLED",
            key: "REGISTRATION_ENABLED",
            value: "true",
            description: "是否允许新用户注册"
          },
          {
            id: "OPENAI_BASE_URL",
            key: "OPENAI_BASE_URL",
            value: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
            description: "OpenAI API 基础 URL"
          },
          {
            id: "OPENAI_API_KEY",
            key: "OPENAI_API_KEY",
            value: "",
            description: "OpenAI API 密钥"
          },
          {
            id: "OPENAI_MODEL",
            key: "OPENAI_MODEL",
            value: process.env.OPENAI_MODEL || "gpt-4o-mini",
            description: "用于 RSS 分类的大模型名称"
          }
        ];

        const mergedConfigs = defaultConfigs.map(defaultConfig => {
          const dbConfig = dbConfigs.find((c: SystemConfig) => c.key === defaultConfig.key);
          return {
            ...defaultConfig,
            id: dbConfig?.id || defaultConfig.id,
            value: dbConfig?.value || defaultConfig.value,
            description: dbConfig?.description || defaultConfig.description
          };
        });

        setConfigs(mergedConfigs);
        setPendingChanges({});
      } else {
        setError(data.error || "Failed to fetch configs");
      }
    } catch (error) {
      setError("Failed to fetch configs");
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (key: string, value: string) => {
    try {
      setSaving(true);
      setError("");

      for (const configKey of Object.keys(pendingChanges)) {
        const res = await fetch(`/api/admin/config/${configKey}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: pendingChanges[configKey] })
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || `Failed to update ${configKey}`);
          return;
        }
      }

      await fetchConfigs();
      setPendingChanges({});
    } catch (error) {
      setError("Failed to update configs");
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (key: string, value: string) => {
    setPendingChanges(prev => ({ ...prev, [key]: value }));
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/signin" });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user?.role || "")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tAdmin('title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tAdmin('subtitle')}</p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            >
              {tAdmin('backToHome')}
            </a>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {session.user.email}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              {tAdmin('logout')}
            </button>
          </div>
        </div>
      </nav>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {tAdmin('systemConfig')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {tAdmin('systemConfigDesc')}
            </p>
          </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm font-medium text-red-900 dark:text-red-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-gray-600 dark:text-gray-400">{tCommon('loading')}</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 配置项 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              {configs.map((config) => {
                let title = config.key;
                let isToggle = false;
                let isText = false;
                let isPassword = false;

                switch (config.key) {
                  case "REGISTRATION_ENABLED":
                    title = "允许用户注册";
                    isToggle = true;
                    break;
                  case "OPENAI_BASE_URL":
                    title = "OpenAI API 基础 URL";
                    isText = true;
                    break;
                  case "OPENAI_API_KEY":
                    title = "OpenAI API 密钥";
                    isText = true;
                    isPassword = true;
                    break;
                  case "OPENAI_MODEL":
                    title = "OpenAI 模型名称";
                    isText = true;
                    break;
                  default:
                    break;
                }

                return (
                  <div
                    key={config.key}
                    className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {title}
                        </h3>
                        {config.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {config.description}
                          </p>
                        )}
                      </div>

                      {isToggle ? (
                        <div className="ml-4 flex gap-2">
                          <button
                            onClick={() => handleConfigChange(config.key, "true")}
                            disabled={saving}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              (pendingChanges[config.key] ?? config.value) === "true"
                                ? "bg-green-600 text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                            } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            启用
                          </button>
                          <button
                            onClick={() => handleConfigChange(config.key, "false")}
                            disabled={saving}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              (pendingChanges[config.key] ?? config.value) === "false"
                                ? "bg-red-600 text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                            } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            禁用
                          </button>
                        </div>
                      ) : null}

                      {isText && (
                        <div className="ml-4 flex items-center gap-2">
                          <input
                            type={isPassword ? "password" : "text"}
                            defaultValue={config.value}
                            id={`config-${config.key}`}
                            placeholder={isPassword ? "输入 API 密钥" : "输入配置值"}
                            onChange={(e) => handleConfigChange(config.key, e.target.value)}
                            disabled={saving}
                            className="w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  );
               })}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center gap-3">
                {Object.keys(pendingChanges).length > 0 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {Object.keys(pendingChanges).length} 项配置已修改
                  </span>
                )}
                <button
                  onClick={() => updateConfig("", "")}
                  disabled={saving || Object.keys(pendingChanges).length === 0}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "保存中..." : "保存所有配置"}
                </button>
              </div>
            </div>

            {session?.user?.role === "SUPER_ADMIN" && (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-3">
                  👥 用户管理
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  管理平台用户及权限
                </p>

                {users.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    暂无用户
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {user.name || "未命名"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            user.role === "SUPER_ADMIN"
                              ? "bg-purple-600 text-white"
                              : user.role === "ADMIN"
                              ? "bg-green-600 text-white"
                              : "bg-gray-600 text-white"
                          }`}>
                            {user.role === "SUPER_ADMIN" && "👑 "}
                            {user.role === "ADMIN" && "👤 "}
                            {user.role === "USER" && "👥 "}
                            {user.role}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {user._count.feeds} 个订阅
                          </span>
                          {user.id !== session.user.id && (
                            <select
                              value={user.role}
                              onChange={(e) => promoteUser(user.id, e.target.value)}
                              disabled={promotingUser === user.id}
                              className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="USER">普通用户</option>
                              <option value="ADMIN">管理员</option>
                              <option value="SUPER_ADMIN">平台管理员</option>
                            </select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
