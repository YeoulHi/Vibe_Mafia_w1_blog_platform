"use client";

import { InfluencerOnboardingForm } from "@/features/influencer/components/InfluencerOnboardingForm";
import { useUpdateInfluencerProfile } from "@/features/influencer/hooks/useUpdateInfluencerProfile";

type InfluencerOnboardingPageProps = {
  params: Promise<Record<string, never>>;
};

export default function InfluencerOnboardingPage({
  params,
}: InfluencerOnboardingPageProps) {
  void params;
  const mutation = useUpdateInfluencerProfile();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">인플루언서 정보 등록</h1>
        <p className="text-slate-500">
          체험단에 지원하기 위해 SNS 채널 정보를 등록해주세요.
        </p>
      </header>

      <div className="rounded-xl border border-slate-200 p-6">
        <InfluencerOnboardingForm
          onSubmit={(data) => mutation.mutate(data)}
          isLoading={mutation.isPending}
        />
      </div>
    </div>
  );
}
