import { notFound } from "next/navigation";
import { getResolvedAppSettings } from "@/server/admin/settings";

type Props = {
  params: Promise<{ type: string }>;
};

export default async function LegalPage({ params }: Props) {
  const { type } = await params;
  const settings = await getResolvedAppSettings();

  let title = "";
  let content = "";

  switch (type) {
    case "privacy":
      title = "개인정보처리방침";
      content = settings.privacyPolicy;
      break;
    case "tos":
      title = "서비스 이용약관";
      content = settings.termsOfService;
      break;
    case "data-deletion":
      title = "사용자 데이터 삭제 안내";
      content = settings.userDataDeletion;
      break;
    default:
      notFound();
  }

  return (
    <article>
      <h1
        style={{
          fontSize: "var(--text-2xl)",
          fontWeight: "var(--weight-bold)",
          marginBottom: "var(--space-6)",
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h1>
      <div
        style={{
          whiteSpace: "pre-wrap",
          fontSize: "var(--text-sm)",
          color: "var(--text-secondary)",
          lineHeight: 1.8,
        }}
      >
        {content}
      </div>
    </article>
  );
}
