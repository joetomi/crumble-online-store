"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import type { Story } from "@/lib/types";

const STORY_DURATION = 6500;

type StoriesCarouselProps = {
  stories: Story[];
};

export function StoriesCarousel({ stories }: StoriesCarouselProps) {
  const enabledItems = stories.filter((story) => story.enabled !== false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener?.("change", listener);
    return () => mediaQuery.removeEventListener?.("change", listener);
  }, []);

  // Preload all enabled images on mount
  useEffect(() => {
    enabledItems.forEach((item) => {
      if (item.image) {
        const img = new Image();
        img.src = item.image;
      }
    });
  }, [enabledItems]);

  // Handle 6.5s timer advancement
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (enabledItems.length <= 1 || prefersReducedMotion) {
      return;
    }

    timerRef.current = setTimeout(() => {
      setActiveIndex((current) => (current + 1) % enabledItems.length);
    }, STORY_DURATION);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [activeIndex, enabledItems.length, prefersReducedMotion]);

  if (enabledItems.length === 0) {
    return null;
  }

  const safeIndex = activeIndex % enabledItems.length;
  const currentItem = enabledItems[safeIndex];

  const handlePrev = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveIndex((current) => (current - 1 + enabledItems.length) % enabledItems.length);
  };

  const handleNext = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveIndex((current) => (current + 1) % enabledItems.length);
  };

  const titleText = currentItem.titleAr || currentItem.title || currentItem.titleEn || "";
  const captionText = currentItem.captionAr || currentItem.caption || currentItem.captionEn || "";
  const postUrl = currentItem.postUrl || "#order";

  return (
    <section className="sc-section" aria-label="أحدث الإعلانات والمنشورات">
      {/* Section Header */}
      <div className="sc-header">
        <h2 className="sc-header-title">WHAT&apos;S NEW</h2>
        <div className="sc-header-line" aria-hidden="true" />
      </div>

      {/* Main Banner Card */}
      <div className="sc-banner-card">
        {/* Active Slide Image */}
        <div className="sc-slide" key={currentItem.id}>
          <img
            src={currentItem.image}
            alt={titleText}
            loading="eager"
            decoding="async"
            className="sc-slide-image"
          />
        </div>

        {/* Gradient Readability Overlay */}
        <div className="sc-gradient-overlay" aria-hidden="true" />

        {/* Story Progress Segments (Top) */}
        <div className="sc-progress-container" dir="ltr" aria-hidden="true">
          {enabledItems.map((item, index) => {
            const isCompleted = index < safeIndex;
            const isActive = index === safeIndex;

            return (
              <div key={item.id} className="sc-progress-track">
                <div
                  key={`${safeIndex}-${item.id}`}
                  className={`sc-progress-fill ${isCompleted ? "is-completed" : ""} ${isActive ? "is-active" : ""}`}
                  style={
                    isActive && !prefersReducedMotion
                      ? { animationDuration: `${STORY_DURATION}ms` }
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>

        {/* Invisible Left/Right Story Navigation Zones */}
        <div className="sc-nav-zones">
          {/* Physical Left Zone -> Next Story */}
          <button
            type="button"
            className="sc-nav-zone sc-nav-left"
            onClick={handleNext}
            aria-label="المنشور التالي"
          />
          {/* Physical Right Zone -> Previous Story */}
          <button
            type="button"
            className="sc-nav-zone sc-nav-right"
            onClick={handlePrev}
            aria-label="المنشور السابق"
          />
        </div>

        {/* Content Overlay (Bottom) */}
        <div className="sc-content-overlay" dir="rtl">
          <div className="sc-badge">
            <span>منشوراتنا المميزة</span>
          </div>

          <h3 className="sc-title">{titleText}</h3>
          {captionText && <p className="sc-caption">{captionText}</p>}
        </div>
      </div>
    </section>
  );
}
