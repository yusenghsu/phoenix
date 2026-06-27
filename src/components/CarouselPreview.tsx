"use client";

import { useState } from "react";
import { CarouselOutput } from "@/types/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  data: CarouselOutput;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
      {copied ? "✅ 已複製" : `📋 ${label ?? "複製"}`}
    </Button>
  );
}

export default function CarouselPreview({ data }: Props) {
  const [activeSlide, setActiveSlide] = useState(-1); // -1 = cover

  const allSlides = [
    { pageNumber: 0, title: data.coverTitle, content: data.coverSubtitle, bulletPoints: [] },
    ...data.slides,
  ];

  const current = allSlides[activeSlide + 1];

  return (
    <div className="space-y-6">
      {/* Slide Preview */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          輪播預覽
          <Badge variant="secondary">{allSlides.length} 頁</Badge>
        </h2>

        {/* Slide Viewer */}
        <div className="relative">
          <div className="aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col items-center justify-center p-8 text-white text-center">
            {activeSlide === -1 ? (
              <>
                <div className="text-xs uppercase tracking-widest opacity-70 mb-4">封面</div>
                <h1 className="text-2xl font-bold leading-tight mb-3">{data.coverTitle}</h1>
                <p className="text-sm opacity-80">{data.coverSubtitle}</p>
              </>
            ) : (
              <>
                <div className="text-xs uppercase tracking-widest opacity-70 mb-3">
                  第 {current.pageNumber} 頁
                </div>
                <h2 className="text-xl font-bold mb-4">{current.title}</h2>
                <p className="text-sm opacity-90 mb-4">{current.content}</p>
                {current.bulletPoints && current.bulletPoints.length > 0 && (
                  <ul className="text-left space-y-1 w-full">
                    {current.bulletPoints.map((pt, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span>▸</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => setActiveSlide((p) => Math.max(p - 1, -1))}
              disabled={activeSlide === -1}
              className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-30 hover:bg-gray-100 transition"
            >
              ‹
            </button>
            <div className="flex gap-1">
              {allSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i - 1)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    activeSlide === i - 1 ? "bg-indigo-600 w-4" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => setActiveSlide((p) => Math.min(p + 1, allSlides.length - 2))}
              disabled={activeSlide === allSlides.length - 2}
              className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-30 hover:bg-gray-100 transition"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Slide List */}
      <div>
        <h2 className="text-lg font-semibold mb-3">所有頁面內容</h2>
        <div className="space-y-3">
          {data.slides.map((slide) => (
            <Card
              key={slide.pageNumber}
              className={`cursor-pointer transition-all hover:shadow-md ${
                activeSlide === slide.pageNumber - 1 ? "ring-2 ring-indigo-500" : ""
              }`}
              onClick={() => setActiveSlide(slide.pageNumber - 1)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs shrink-0">第 {slide.pageNumber} 頁</Badge>
                      <span className="font-medium text-sm truncate">{slide.title}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{slide.content}</p>
                    {slide.bulletPoints && slide.bulletPoints.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {slide.bulletPoints.map((pt, i) => (
                          <li key={i} className="text-xs text-gray-500 flex gap-1">
                            <span>•</span><span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <CopyButton
                    label="複製"
                    text={`${slide.title}\n\n${slide.content}${
                      slide.bulletPoints?.length
                        ? "\n\n" + slide.bulletPoints.map((p) => `• ${p}`).join("\n")
                        : ""
                    }`}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge className="mb-2">CTA</Badge>
              <p className="text-sm">{data.cta}</p>
            </div>
            <CopyButton text={data.cta} />
          </div>
        </CardContent>
      </Card>

      {/* Caption */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <Badge>Instagram Caption</Badge>
            <CopyButton text={data.caption} />
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line">{data.caption}</p>
        </CardContent>
      </Card>

      {/* Hashtags */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <Badge>Hashtags</Badge>
            <CopyButton text={data.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")} />
          </div>
          <div className="flex flex-wrap gap-2">
            {data.hashtags.map((tag, i) => (
              <span key={i} className="text-sm text-indigo-600 bg-indigo-50 rounded-full px-3 py-1">
                {tag.startsWith("#") ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Canva Content */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <Badge variant="secondary">Canva 版型內容</Badge>
            <CopyButton text={data.canvaContent} label="全部複製" />
          </div>
          <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-4 overflow-auto max-h-64 whitespace-pre-wrap font-mono">
            {data.canvaContent}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
