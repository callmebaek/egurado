"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/config";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Plus,
  Settings,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Store,
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
} from "lucide-react";

interface Store {
  id: string;
  name: string;
  url: string;
  place_id?: string;
  thumbnail_url?: string;
}

interface Keyword {
  id: string;
  keyword: string;
  is_tracked: boolean;
  store_id: string;
}

interface MetricTracker {
  id: string;
  user_id: string;
  store_id: string;
  keyword_id: string;
  keyword: string;
  update_frequency: string;
  notification_enabled: boolean;
  last_collected_at: string | null;
  created_at: string;
  rank_notification_email?: boolean;
  rank_notification_sms?: boolean;
  rank_notification_kakao?: boolean;
}

interface Metric {
  id: string;
  tracker_id: string;
  rank: number | null;
  visitor_reviews: number;
  blog_reviews: number;
  collected_at: string;
}

interface StoreGroup {
  store: Store;
  trackers: MetricTracker[];
  latestMetrics: Map<string, Metric | null>;
}

const storeGradients = [
  "from-blue-500 to-purple-600",
  "from-purple-500 to-pink-600",
  "from-pink-500 to-rose-600",
  "from-green-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-cyan-500 to-blue-600",
  "from-indigo-500 to-purple-600",
  "from-teal-500 to-green-600",
];

export default function MetricsTrackerPage() {
  const { toast } = useToast();
  const { user, getToken } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [trackers, setTrackers] = useState<MetricTracker[]>([]);
  const [metrics, setMetrics] = useState<Map<string, Metric[]>>(new Map());
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [newKeyword, setNewKeyword] = useState("");
  const [updateFrequency, setUpdateFrequency] = useState("daily_once");
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTracker, setEditingTracker] = useState<MetricTracker | null>(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());

  // 순위 알림 설정 상태
  const [rankNotificationEmail, setRankNotificationEmail] = useState(false);
  const [rankNotificationSms, setRankNotificationSms] = useState(false);
  const [rankNotificationKakao, setRankNotificationKakao] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        toast({
          title: "인증 오류",
          description: "로그인이 필요합니다.",
          variant: "destructive",
        });
        return;
      }

      // 매장 목록 로드
      const storesResponse = await fetch(api.stores.list(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!storesResponse.ok) {
        throw new Error("매장 목록을 불러오는데 실패했습니다");
      }

      const storesData = await storesResponse.json();
      setStores(storesData);

      // 추적기 목록 로드
      const trackersResponse = await fetch(api.metrics.list, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!trackersResponse.ok) {
        throw new Error("추적 목록을 불러오는데 실패했습니다");
      }

      const trackersData = await trackersResponse.json();
      setTrackers(trackersData);

      // 각 추적기의 최근 지표 로드
      const metricsMap = new Map<string, Metric[]>();
      for (const tracker of trackersData) {
        try {
          const metricsResponse = await fetch(
            api.metrics.getMetrics(tracker.id),
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (metricsResponse.ok) {
            const metricsData = await metricsResponse.json();
            metricsMap.set(tracker.id, metricsData);
          }
        } catch (error) {
          console.error(
            `Failed to load metrics for tracker ${tracker.id}:`,
            error
          );
        }
      }
      setMetrics(metricsMap);

      // 모든 매장을 기본적으로 펼쳐놓기
      setExpandedStores(new Set(storesData.map((s: Store) => s.id)));
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({
        title: "데이터 로딩 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 매장별로 그룹화
  const storeGroups = useMemo((): StoreGroup[] => {
    const groups: StoreGroup[] = [];

    for (const store of stores) {
      const storeTrackers = trackers.filter((t) => t.store_id === store.id);
      const latestMetrics = new Map<string, Metric | null>();

      for (const tracker of storeTrackers) {
        const trackerMetrics = metrics.get(tracker.id) || [];
        const latest =
          trackerMetrics.length > 0
            ? trackerMetrics[trackerMetrics.length - 1]
            : null;
        latestMetrics.set(tracker.id, latest);
      }

      groups.push({
        store,
        trackers: storeTrackers,
        latestMetrics,
      });
    }

    return groups;
  }, [stores, trackers, metrics]);

  const loadKeywordsForStore = async (storeId: string) => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(
        api.naver.keywords(storeId),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setKeywords(data);
      }
    } catch (error) {
      console.error("Failed to load keywords:", error);
    }
  };

  const handleAddTracker = async () => {
    if (!selectedStore || !newKeyword.trim()) {
      toast({
        title: "입력 오류",
        description: "매장과 키워드를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        toast({
          title: "인증 오류",
          description: "로그인이 필요합니다.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(api.metrics.create, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          store_id: selectedStore,
          keyword: newKeyword.trim(),
          update_frequency: updateFrequency,
          notification_enabled: notificationEnabled,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "추적 생성에 실패했습니다");
      }

      const newTracker = await response.json();

      toast({
        title: "추적 생성 완료",
        description: `"${newKeyword}" 키워드 추적이 시작되었습니다.`,
      });

      // 추적기 목록에 추가
      setTrackers([...trackers, newTracker]);

      // 즉시 데이터 수집
      await collectMetrics(newTracker.id);

      // 입력 초기화
      setNewKeyword("");
      setSelectedStore("");
      setUpdateFrequency("daily_once");
      setNotificationEnabled(false);
      setIsAddDialogOpen(false);

      // 데이터 새로고침
      await loadData();
    } catch (error) {
      console.error("Failed to add tracker:", error);
      toast({
        title: "추적 생성 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
        variant: "destructive",
      });
    }
  };

  const collectMetrics = async (trackerId: string) => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(
        `${api.metrics.getMetrics(trackerId)}/collect`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("지표 수집에 실패했습니다");
      }

      // 수집 후 지표 다시 로드
      const metricsResponse = await fetch(api.metrics.getMetrics(trackerId), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics((prev) => {
          const newMap = new Map(prev);
          newMap.set(trackerId, metricsData);
          return newMap;
        });
      }

      toast({
        title: "지표 수집 완료",
        description: "최신 지표가 업데이트되었습니다.",
      });
    } catch (error) {
      console.error("Failed to collect metrics:", error);
      toast({
        title: "지표 수집 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTracker = async () => {
    if (!editingTracker) return;

    try {
      const token = getToken();
      if (!token) {
        toast({
          title: "인증 오류",
          description: "로그인이 필요합니다.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(api.metrics.update(editingTracker.id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          update_frequency: updateFrequency,
          notification_enabled: notificationEnabled,
          rank_notification_email: rankNotificationEmail,
          rank_notification_sms: rankNotificationSms,
          rank_notification_kakao: rankNotificationKakao,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "설정 업데이트에 실패했습니다");
      }

      toast({
        title: "설정 저장 완료",
        description: "추적 설정이 업데이트되었습니다.",
      });

      setIsSettingsDialogOpen(false);
      setEditingTracker(null);
      await loadData();
    } catch (error) {
      console.error("Failed to update tracker:", error);
      toast({
        title: "설정 저장 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTracker = async (trackerId: string) => {
    if (!confirm("정말 이 추적을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        toast({
          title: "인증 오류",
          description: "로그인이 필요합니다.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(api.metrics.delete(trackerId), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("추적 삭제에 실패했습니다");
      }

      toast({
        title: "추적 삭제 완료",
        description: "추적이 삭제되었습니다.",
      });

      await loadData();
    } catch (error) {
      console.error("Failed to delete tracker:", error);
      toast({
        title: "추적 삭제 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
        variant: "destructive",
      });
    }
  };

  const openSettings = (tracker: MetricTracker) => {
    setEditingTracker(tracker);
    setUpdateFrequency(tracker.update_frequency);
    setNotificationEnabled(tracker.notification_enabled);
    setRankNotificationEmail(tracker.rank_notification_email || false);
    setRankNotificationSms(tracker.rank_notification_sms || false);
    setRankNotificationKakao(tracker.rank_notification_kakao || false);
    setIsSettingsDialogOpen(true);
  };

  const toggleStoreExpansion = (storeId: string) => {
    setExpandedStores((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(storeId)) {
        newSet.delete(storeId);
      } else {
        newSet.add(storeId);
      }
      return newSet;
    });
  };

  const getStoreGradient = (index: number) => {
    return storeGradients[index % storeGradients.length];
  };

  const getRankChange = (trackerId: string): number => {
    const trackerMetrics = metrics.get(trackerId) || [];
    if (trackerMetrics.length < 2) return 0;

    const latest = trackerMetrics[trackerMetrics.length - 1];
    const previous = trackerMetrics[trackerMetrics.length - 2];

    if (latest.rank === null || previous.rank === null) return 0;

    return previous.rank - latest.rank;
  };

  const formatFrequency = (freq: string): string => {
    const map: Record<string, string> = {
      daily_once: "1일 1회",
      daily_twice: "1일 2회",
      hourly: "1시간마다",
    };
    return map[freq] || freq;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-gray-600 font-medium">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-4 sm:p-6 lg:p-8">
      {/* 헤더 */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                주요지표 추적
              </h1>
              <p className="mt-2 text-gray-600">매장별 키워드 순위와 리뷰를 실시간으로 추적하세요</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  onClick={() => {
                    setSelectedStore("");
                    setNewKeyword("");
                    setKeywords([]);
                  }}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  추적 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md backdrop-blur-xl bg-white/95">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    새 추적 키워드 추가
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="store" className="text-sm font-semibold text-gray-700">
                      매장 선택
                    </Label>
                    <Select
                      value={selectedStore}
                      onValueChange={(value) => {
                        setSelectedStore(value);
                        loadKeywordsForStore(value);
                      }}
                    >
                      <SelectTrigger className="border-2 hover:border-blue-400 transition-colors">
                        <SelectValue placeholder="매장을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keyword" className="text-sm font-semibold text-gray-700">
                      추적 키워드
                    </Label>
                    <Input
                      id="keyword"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="예: 강남 맛집"
                      className="border-2 hover:border-blue-400 focus:border-blue-500 transition-colors"
                    />
                    
                    {/* 조회된 키워드 목록 표시 */}
                    {keywords.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-gray-500">조회된 키워드</p>
                        <div className="flex flex-wrap gap-2">
                          {keywords.map((kw) => (
                            <Badge
                              key={kw.id}
                              variant={kw.is_tracked ? "secondary" : "outline"}
                              className={`cursor-pointer transition-all hover:scale-105 ${
                                kw.is_tracked
                                  ? "bg-green-100 text-green-700 border-green-300"
                                  : "hover:bg-blue-50 hover:border-blue-400"
                              }`}
                              onClick={() => {
                                if (!kw.is_tracked) {
                                  setNewKeyword(kw.keyword);
                                }
                              }}
                            >
                              {kw.keyword}
                              {kw.is_tracked && " ✓"}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frequency" className="text-sm font-semibold text-gray-700">
                      수집 주기
                    </Label>
                    <Select value={updateFrequency} onValueChange={setUpdateFrequency}>
                      <SelectTrigger className="border-2 hover:border-blue-400 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily_once">1일 1회</SelectItem>
                        <SelectItem value="daily_twice">1일 2회</SelectItem>
                        <SelectItem value="hourly">1시간마다</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50">
                    <input
                      type="checkbox"
                      id="notification"
                      checked={notificationEnabled}
                      onChange={(e) => setNotificationEnabled(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <Label htmlFor="notification" className="text-sm font-medium text-gray-700 cursor-pointer">
                      알림 활성화
                    </Label>
                  </div>

                  <Button
                    onClick={handleAddTracker}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    생성하기
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* 매장별 카드 */}
      <div className="max-w-7xl mx-auto space-y-6">
        {storeGroups.length === 0 ? (
          <Card className="backdrop-blur-xl bg-white/70 border-white/20 shadow-xl p-12 text-center">
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">추적 중인 키워드가 없습니다.</p>
            <p className="text-gray-400 text-sm mt-2">
              상단의 "추적 추가" 버튼을 눌러 새로운 키워드를 추가해보세요.
            </p>
          </Card>
        ) : (
          storeGroups.map((group, index) => (
            <div
              key={group.store.id}
              className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 overflow-hidden transition-all duration-500 hover:shadow-3xl"
            >
              {/* 매장 헤더 */}
              <div
                className={`bg-gradient-to-r ${getStoreGradient(index)} p-6 cursor-pointer transition-all duration-300 hover:brightness-110`}
                onClick={() => toggleStoreExpansion(group.store.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {group.store.thumbnail_url ? (
                      <img
                        src={group.store.thumbnail_url}
                        alt={group.store.name}
                        className="w-16 h-16 rounded-2xl object-cover shadow-lg border-2 border-white/50"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/50">
                        <Store className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                        {group.store.name}
                      </h2>
                      <p className="text-white/90 text-sm mt-1 drop-shadow">
                        추적 키워드 {group.trackers.length}개
                      </p>
                    </div>
                  </div>
                  <div className="text-white">
                    {expandedStores.has(group.store.id) ? "▼" : "▶"}
                  </div>
                </div>
              </div>

              {/* 키워드 카드들 */}
              {expandedStores.has(group.store.id) && (
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {group.trackers.map((tracker) => {
                    const latestMetric = group.latestMetrics.get(tracker.id);
                    const rankChange = getRankChange(tracker.id);
                    const trackerMetrics = metrics.get(tracker.id) || [];
                    const isCollecting = !latestMetric && trackerMetrics.length === 0;

                    return (
                      <div
                        key={tracker.id}
                        className="backdrop-blur-lg bg-white/80 rounded-2xl p-5 shadow-lg border border-white/40 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">
                              {tracker.keyword}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200"
                              >
                                {formatFrequency(tracker.update_frequency)}
                              </Badge>
                              {tracker.notification_enabled && (
                                <Badge
                                  variant="outline"
                                  className="bg-green-50 text-green-700 border-green-200"
                                >
                                  <Bell className="w-3 h-3 mr-1" />
                                  알림
                                </Badge>
                              )}
                              {/* 알림 방법 표시 */}
                              {tracker.rank_notification_email && (
                                <Badge
                                  variant="outline"
                                  className="bg-purple-50 text-purple-700 border-purple-200"
                                >
                                  <Mail className="w-3 h-3 mr-1" />
                                  이메일
                                </Badge>
                              )}
                              {tracker.rank_notification_sms && (
                                <Badge
                                  variant="outline"
                                  className="bg-orange-50 text-orange-700 border-orange-200"
                                >
                                  <Smartphone className="w-3 h-3 mr-1" />
                                  문자
                                </Badge>
                              )}
                              {tracker.rank_notification_kakao && (
                                <Badge
                                  variant="outline"
                                  className="bg-yellow-50 text-yellow-700 border-yellow-200"
                                >
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  카톡
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openSettings(tracker)}
                              className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteTracker(tracker.id)}
                              className="hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {isCollecting ? (
                          <div className="flex items-center justify-center py-8 text-gray-500">
                            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                            <span>데이터 수집 중...</span>
                          </div>
                        ) : latestMetric ? (
                          <div className="space-y-4">
                            {/* 주요 지표 */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 text-center">
                                <p className="text-xs text-blue-600 font-medium mb-1">순위</p>
                                <div className="flex items-center justify-center gap-1">
                                  <p className="text-2xl font-bold text-blue-700">
                                    {latestMetric.rank || "-"}
                                  </p>
                                  {rankChange !== 0 && (
                                    <span
                                      className={`text-xs flex items-center ${
                                        rankChange > 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {rankChange > 0 ? (
                                        <TrendingUp className="w-3 h-3" />
                                      ) : (
                                        <TrendingDown className="w-3 h-3" />
                                      )}
                                      {Math.abs(rankChange)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 text-center">
                                <p className="text-xs text-green-600 font-medium mb-1">
                                  방문자 리뷰
                                </p>
                                <p className="text-2xl font-bold text-green-700">
                                  {latestMetric.visitor_reviews}
                                </p>
                              </div>
                              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 text-center">
                                <p className="text-xs text-purple-600 font-medium mb-1">
                                  블로그 리뷰
                                </p>
                                <p className="text-2xl font-bold text-purple-700">
                                  {latestMetric.blog_reviews}
                                </p>
                              </div>
                            </div>

                            {/* 차트 */}
                            {trackerMetrics.length > 1 && (
                              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                                <ResponsiveContainer width="100%" height={150}>
                                  <LineChart data={trackerMetrics}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                    <XAxis
                                      dataKey="collected_at"
                                      tickFormatter={(value) =>
                                        new Date(value).toLocaleDateString("ko-KR", {
                                          month: "short",
                                          day: "numeric",
                                        })
                                      }
                                      stroke="#9ca3af"
                                      style={{ fontSize: "11px" }}
                                    />
                                    <YAxis
                                      yAxisId="left"
                                      reversed
                                      stroke="#3b82f6"
                                      style={{ fontSize: "11px" }}
                                    />
                                    <YAxis
                                      yAxisId="right"
                                      orientation="right"
                                      stroke="#10b981"
                                      style={{ fontSize: "11px" }}
                                    />
                                    <Tooltip
                                      contentStyle={{
                                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                                        border: "none",
                                        borderRadius: "12px",
                                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                                      }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                                    <Line
                                      yAxisId="left"
                                      type="monotone"
                                      dataKey="rank"
                                      stroke="#3b82f6"
                                      strokeWidth={2}
                                      dot={{ fill: "#3b82f6", r: 3 }}
                                      name="순위"
                                    />
                                    <Line
                                      yAxisId="right"
                                      type="monotone"
                                      dataKey="visitor_reviews"
                                      stroke="#10b981"
                                      strokeWidth={2}
                                      dot={{ fill: "#10b981", r: 3 }}
                                      name="방문자 리뷰"
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <p>지표 데이터가 없습니다</p>
                          </div>
                        )}

                        {/* 버튼 그룹 */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
                          <div className="text-xs text-gray-500">
                            {tracker.last_collected_at
                              ? `마지막 수집: ${new Date(
                                  tracker.last_collected_at
                                ).toLocaleString("ko-KR")}`
                              : "수집 대기 중"}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => collectMetrics(tracker.id)}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            지금 수집
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 설정 다이얼로그 */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="sm:max-w-md backdrop-blur-xl bg-white/95">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              추적 설정
            </DialogTitle>
          </DialogHeader>
          {editingTracker && (
            <div className="space-y-6 py-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">키워드</h3>
                <p className="text-gray-600">{editingTracker.keyword}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-frequency" className="text-sm font-semibold text-gray-700">
                  수집 주기
                </Label>
                <Select value={updateFrequency} onValueChange={setUpdateFrequency}>
                  <SelectTrigger className="border-2 hover:border-blue-400 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily_once">1일 1회</SelectItem>
                    <SelectItem value="daily_twice">1일 2회</SelectItem>
                    <SelectItem value="hourly">1시간마다</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50">
                  <input
                    type="checkbox"
                    id="edit-notification"
                    checked={notificationEnabled}
                    onChange={(e) => setNotificationEnabled(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <Label
                    htmlFor="edit-notification"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    알림 활성화
                  </Label>
                </div>

                {notificationEnabled && (
                  <div className="ml-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">순위 알림 받기</p>
                    
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-purple-50">
                      <input
                        type="checkbox"
                        id="rank-notif-email"
                        checked={rankNotificationEmail}
                        onChange={(e) => setRankNotificationEmail(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <Mail className="w-4 h-4 text-purple-600" />
                      <Label
                        htmlFor="rank-notif-email"
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        이메일
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-orange-50">
                      <input
                        type="checkbox"
                        id="rank-notif-sms"
                        checked={rankNotificationSms}
                        onChange={(e) => setRankNotificationSms(e.target.checked)}
                        className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                      />
                      <Smartphone className="w-4 h-4 text-orange-600" />
                      <Label
                        htmlFor="rank-notif-sms"
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        문자 (SMS)
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-yellow-50">
                      <input
                        type="checkbox"
                        id="rank-notif-kakao"
                        checked={rankNotificationKakao}
                        onChange={(e) => setRankNotificationKakao(e.target.checked)}
                        className="w-4 h-4 text-yellow-600 rounded focus:ring-2 focus:ring-yellow-500"
                      />
                      <MessageSquare className="w-4 h-4 text-yellow-600" />
                      <Label
                        htmlFor="rank-notif-kakao"
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        카카오톡
                      </Label>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleUpdateTracker}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                저장하기
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
