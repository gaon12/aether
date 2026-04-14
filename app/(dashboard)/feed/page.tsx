"use client";

import { FeedView } from "@/components/feed/FeedView";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function DashboardFeedPage() {
  return (
    <>
      <SectionHeader
        title="봇 답변 피드"
        description="Threads에서 처리된 번역 및 요약 결과를 실시간으로 확인합니다."
        live
      />
      <FeedView showHero={false} />
    </>
  );
}
