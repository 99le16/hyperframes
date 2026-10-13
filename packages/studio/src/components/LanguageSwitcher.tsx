import { useStudioTranslation } from "../i18n/StudioI18nProvider";
import { normalizeStudioLanguage } from "../i18n/studioLanguage";
import { Select, Tooltip } from "./ui";

const OPTIONS = [
  { value: "en", label: "English" },
  { value: "zh-CN", label: "简体中文" },
];

export function LanguageSwitcher() {
  const { t, instance, language, controlled, canSwitchLanguage } = useStudioTranslation();
  if (!canSwitchLanguage) return null;
  return (
    <Tooltip label={t("language.scope")} side="bottom">
      <div className="w-24 shrink-0">
        <Select
          label={t("language.label")}
          value={language}
          options={OPTIONS}
          disabled={controlled}
          onCommit={(next) => {
            const supported = normalizeStudioLanguage(next);
            if (supported) void instance.changeLanguage(supported);
          }}
        />
      </div>
    </Tooltip>
  );
}
