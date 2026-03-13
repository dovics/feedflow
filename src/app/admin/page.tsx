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
    await signOut({ callbackUrl: "/auth/signin", redirect: false });
    router.push("/auth/signin");
    router.refresh();
  };

  if (status === "loading") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="text-theme-secondary">Loading...</div>
      </div>
    );
  }

  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user?.role || "")) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <nav className="bg-theme-surface-transparent backdrop-blur-sm border-b border-theme px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-theme-primary">{tAdmin('title')}</h1>
            <p className="text-sm text-theme-secondary mt-1">{tAdmin('subtitle')}</p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-sm text-accent hover:text-opacity-80 font-medium transition-colors"
            >
              {tAdmin('backToHome')}
            </a>
            <span className="text-sm text-theme-primary">
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
            <h2 className="text-2xl font-bold text-theme-primary mb-2">
              {tAdmin('systemConfig')}
            </h2>
            <p className="text-theme-secondary">
              {tAdmin('systemConfigDesc')}
            </p>
          </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-medium text-red-900">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-theme-secondary">{tCommon('loading')}</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 配置项 */}
            <div className="bg-theme-surface rounded-lg shadow-sm border border-theme">
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
                    className="px-6 py-4 border-b border-theme last:border-b-0"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-theme-primary mb-1">
                          {title}
                        </h3>
                        {config.description && (
                          <p className="text-sm text-theme-secondary">
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
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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
                            className="w-64 px-3 py-2 border border-theme rounded-md bg-theme-surface text-theme-primary focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  );
               })}
              <div className="px-6 py-4 border-t border-theme flex justify-end items-center gap-3">
                {Object.keys(pendingChanges).length > 0 && (
                  <span className="text-sm text-theme-muted">
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
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  用户管理
                </h3>
                <p className="text-sm text-theme-secondary mb-4">
                  管理平台用户及权限
                </p>

                {users.length === 0 ? (
                  <div className="text-center py-8 text-theme-muted">
                    暂无用户
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 bg-theme-subtle rounded-md"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-theme-primary truncate">
                            {user.name || "未命名"}
                          </p>
                          <p className="text-xs text-theme-muted truncate">
                            {user.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded ${
                            user.role === "SUPER_ADMIN"
                              ? "bg-purple-600 text-white"
                              : user.role === "ADMIN"
                              ? "bg-green-600 text-white"
                              : "bg-gray-600 text-white"
                          }`}>
                            {user.role === "SUPER_ADMIN" && (
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            )}
                            {user.role === "ADMIN" && (
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                            )}
                            {user.role === "USER" && (
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                              </svg>
                            )}
                            <span>{user.role}</span>
                          </div>
                          <span className="text-xs text-theme-muted">
                            {user._count.feeds} 个订阅
                          </span>
                          {user.id !== session.user.id && (
                            <select
                              value={user.role}
                              onChange={(e) => promoteUser(user.id, e.target.value)}
                              disabled={promotingUser === user.id}
                              className="px-3 py-1 text-xs border border-theme rounded bg-theme-surface text-theme-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
