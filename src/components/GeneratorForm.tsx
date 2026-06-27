"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GenerateRequest, GenerateResponse, CarouselOutput } from "@/types/carousel";

const EXAMPLE_TOPICS = [
  "保險業務怎麼開發",
  "DISC人格",
  "退休規劃",
  "增員技巧",
  "財富管理入門",
  "保險觀念破解",
];

const STYLE_OPTIONS = [
  { value: "professional", label: "專業商業" },
  { value: "casual", label: "輕鬆親切" },
  { value: "educational", label: "教育知識" },
] as const;

interface Props {
  onResult: (data: CarouselOutput) => void;
  onLoading: (loading: boolean) => void;
  isLoading: boolean;
}

export default function GeneratorForm({ onResult, onLoading, isLoading }: Props) {
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState<GenerateRequest["style"]>("professional");
  const [slideCount, setSlideCount] = useState(9);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) {
      setError("請輸入主題");
      return;
    }
    setError("");
    onLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, style, slideCount }),
      });
      const json: GenerateResponse = await res.json();
      if (json.success && json.data) {
        onResult(json.data);
      } else {
        setError(json.error ?? "產生失敗，請稍後再試");
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      onLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              輸入主題
            </label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：保險業務怎麼開發"
              className="text-base"
              disabled={isLoading}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              快速選擇主題
            </label>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_TOPICS.map((t) => (
                <Badge
                  key={t}
                  variant={topic === t ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => setTopic(t)}
                >
                  {t}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                貼文風格
              </label>
              <div className="flex flex-col gap-2">
                {STYLE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="style"
                      value={opt.value}
                      checked={style === opt.value}
                      onChange={() => setStyle(opt.value)}
                      disabled={isLoading}
                      className="accent-primary"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                頁數（{slideCount} 頁）
              </label>
              <input
                type="range"
                min={6}
                max={10}
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value))}
                disabled={isLoading}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>6頁</span>
                <span>10頁</span>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading} size="lg">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                AI 產生中...
              </span>
            ) : (
              "✨ 產生輪播內容"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
