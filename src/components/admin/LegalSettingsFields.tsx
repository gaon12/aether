"use client";

import { useState } from "react";
import { CopyField } from "./CopyField";

interface LegalSettingsFieldsProps {
  initialPrivacyPolicy: string;
  initialTermsOfService: string;
  initialUserDataDeletion: string;
  defaultPrivacyPolicy: string;
  defaultTermsOfService: string;
  defaultUserDataDeletion: string;
  appUrl: string;
}

export function LegalSettingsFields({
  initialPrivacyPolicy,
  initialTermsOfService,
  initialUserDataDeletion,
  defaultPrivacyPolicy,
  defaultTermsOfService,
  defaultUserDataDeletion,
  appUrl,
}: LegalSettingsFieldsProps) {
  const [privacyPolicy, setPrivacyPolicy] = useState(initialPrivacyPolicy);
  const [termsOfService, setTermsOfService] = useState(initialTermsOfService);
  const [userDataDeletion, setUserDataDeletion] = useState(initialUserDataDeletion);

  const fieldLabelStyle: React.CSSProperties = {
    fontWeight: "var(--weight-medium)",
    fontSize: "var(--text-sm)",
  };

  const fieldHintStyle: React.CSSProperties = {
    color: "var(--text-tertiary)",
    fontSize: "var(--text-xs)",
  };

  const sectionStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-4)",
    padding: "var(--space-5)",
    background: "var(--bg-raised)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border)",
  };

  const textareaStyle: React.CSSProperties = {
    minHeight: 150,
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: "var(--text-sm)",
    lineHeight: 1.6,
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "var(--space-4)",
  };

  const renderSection = (
    label: string,
    name: string,
    value: string,
    setValue: (v: string) => void,
    defaultValue: string,
    urlPath: string,
    hint: string
  ) => (
    <div style={sectionStyle}>
      <div style={headerStyle}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          <span style={fieldLabelStyle}>{label}</span>
          <span style={fieldHintStyle}>{hint}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`${label}의 내용을 기본값으로 초기화하시겠습니까?`)) {
              setValue(defaultValue);
            }
          }}
          className="admin-btn-ghost"
          style={{ padding: "var(--space-1) var(--space-2)", fontSize: "var(--text-xs)" }}
        >
          기본값으로 초기화
        </button>
      </div>

      <textarea
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="admin-field"
        style={textareaStyle}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <span style={fieldLabelStyle}>제공 URL</span>
        <CopyField value={`${appUrl}${urlPath}`} />
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {renderSection(
        "개인정보처리방침",
        "privacyPolicy",
        privacyPolicy,
        setPrivacyPolicy,
        defaultPrivacyPolicy,
        "/legal/privacy",
        "서비스 이용 시 수집하는 개인정보에 대한 안내입니다."
      )}
      {renderSection(
        "서비스 이용약관",
        "termsOfService",
        termsOfService,
        setTermsOfService,
        defaultTermsOfService,
        "/legal/tos",
        "서비스 이용 규칙 및 책임에 대한 안내입니다."
      )}
      {renderSection(
        "사용자 데이터 삭제 안내",
        "userDataDeletion",
        userDataDeletion,
        setUserDataDeletion,
        defaultUserDataDeletion,
        "/legal/data-deletion",
        "사용자가 자신의 데이터를 삭제하는 방법에 대한 안내입니다."
      )}
    </div>
  );
}
