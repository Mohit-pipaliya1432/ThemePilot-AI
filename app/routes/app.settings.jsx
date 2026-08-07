import {
  Link,
  useFetcher,
  useLoaderData,
} from "react-router";

import {
  useEffect,
  useState,
} from "react";

import { authenticate } from "../shopify.server";

import {
  getAppSettings,
  resetAppSettings,
  saveAppSettings,
} from "../services/settings/app-settings.server.js";

const DEFAULT_APP_SETTINGS = {
  autoScan: false,
  scanFrequency: "weekly",
  aiTone: "professional",
  seoTitleMaxLength: 60,
  seoDescriptionMaxLength: 155,
  autoGenerateAltText: true,
  historyRetention: "90",
  emailNotifications: false,
};

import "../styles/dashboard.css";

/* =========================================
   LOADER
========================================= */

export const loader = async ({ request }) => {
  const { session } =
    await authenticate.admin(request);

  const settings =
    await getAppSettings(
      session.shop,
    );

  return {
    settings,
  };
};

/* =========================================
   ACTION
========================================= */

export const action = async ({ request }) => {
  const { session } =
    await authenticate.admin(request);

  const formData =
    await request.formData();

  const intent =
    formData.get("intent");

  try {
    if (
      intent ===
      "save-settings"
    ) {
      const settingsValue =
        formData.get("settings");

      if (
        !settingsValue ||
        typeof settingsValue !==
          "string"
      ) {
        return {
          success: false,
          type: "settings",
          message:
            "Settings data is missing.",
        };
      }

      const settings =
        JSON.parse(
          settingsValue,
        );

      const savedSettings =
        await saveAppSettings(
          session.shop,
          settings,
        );

      return {
        success: true,
        type: "settings",
        action: "save",
        message:
          "Settings saved successfully.",
        settings:
          savedSettings,
      };
    }

    if (
      intent ===
      "reset-settings"
    ) {
      const resetSettings =
        await resetAppSettings(
          session.shop,
        );

      return {
        success: true,
        type: "settings",
        action: "reset",
        message:
          "Settings reset to defaults.",
        settings:
          resetSettings,
      };
    }

    return {
      success: false,
      type: "settings",
      message:
        "Invalid settings request.",
    };
  } catch (error) {
    console.error(
      "ThemePilot Settings error:",
      error,
    );

    return {
      success: false,
      type: "settings",
      message:
        "The settings request could not be completed.",
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    };
  }
};

/* =========================================
   PAGE
========================================= */

export default function SettingsPage() {
  const loaderData =
    useLoaderData();

  const settingsFetcher =
    useFetcher();

  const [
    settings,
    setSettings,
  ] = useState(
    loaderData?.settings ||
      DEFAULT_APP_SETTINGS,
  );

  const [
    message,
    setMessage,
  ] = useState(null);

  const isSaving =
    settingsFetcher.state !==
    "idle";

  const updateSetting = (
    key,
    value,
  ) => {
    setSettings(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );

    setMessage(null);
  };

  /* =========================================
     SAVE
  ========================================= */

  const handleSave = () => {
    if (isSaving) {
      return;
    }

    setMessage(null);

    const formData =
      new FormData();

    formData.append(
      "intent",
      "save-settings",
    );

    formData.append(
      "settings",
      JSON.stringify(
        settings,
      ),
    );

    settingsFetcher.submit(
      formData,
      {
        method: "post",
      },
    );
  };

  /* =========================================
     RESET
  ========================================= */

  const handleReset = () => {
    if (isSaving) {
      return;
    }

    setMessage(null);

    const formData =
      new FormData();

    formData.append(
      "intent",
      "reset-settings",
    );

    settingsFetcher.submit(
      formData,
      {
        method: "post",
      },
    );
  };

  /* =========================================
     FETCHER RESPONSE
  ========================================= */

  useEffect(() => {
    if (
      !settingsFetcher.data
    ) {
      return;
    }

    const result =
      settingsFetcher.data;

    if (
      result.success &&
      result.settings
    ) {
      setSettings(
        result.settings,
      );
    }

    setMessage({
      success:
        Boolean(
          result.success,
        ),

      text:
        result.message ||
        result.error ||
        "Unknown response.",
    });
  }, [
    settingsFetcher.data,
  ]);

  return (
    <main className="tp-dashboard tp-settings-page">
      {/* =====================================
          HEADER
      ====================================== */}

      <section className="tp-all-products-header">
        <div>
          <p className="tp-eyebrow">
            THEMEPILOT AI
          </p>

          <h1 className="tp-main-heading">
            Settings
          </h1>

          <p className="tp-section-subtitle">
            Manage scanning, AI content
            preferences and ThemePilot
            workspace behavior.
          </p>
        </div>

        <Link
          to="/app"
          className="tp-button tp-button--secondary"
        >
          Back to dashboard
        </Link>
      </section>

      {/* =====================================
          MESSAGE
      ====================================== */}

      {message && (
        <div
          className={
            message.success
              ? "tp-message tp-message--success"
              : "tp-message tp-message--error"
          }
        >
          {message.text}
        </div>
      )}

      {/* =====================================
          LAYOUT
      ====================================== */}

      <section className="tp-settings-layout">
        <div className="tp-settings-main">
          {/* =================================
              SCANNING
          ================================== */}

          <SettingsSection
            eyebrow="SCANNING"
            title="Store scan settings"
            description="Control how ThemePilot should scan your Shopify store."
          >
            <SettingRow
              title="Automatic store scans"
              description="Allow ThemePilot to run store scans automatically."
            >
              <Toggle
                checked={
                  settings.autoScan
                }
                disabled={
                  isSaving
                }
                onChange={(
                  checked,
                ) =>
                  updateSetting(
                    "autoScan",
                    checked,
                  )
                }
              />
            </SettingRow>

            <SettingRow
              title="Scan frequency"
              description="Choose how often automatic scans should run."
            >
              <select
                value={
                  settings.scanFrequency
                }
                disabled={
                  !settings.autoScan ||
                  isSaving
                }
                onChange={(
                  event,
                ) =>
                  updateSetting(
                    "scanFrequency",
                    event.target
                      .value,
                  )
                }
                className="tp-settings-select"
              >
                <option value="daily">
                  Daily
                </option>

                <option value="weekly">
                  Weekly
                </option>

                <option value="monthly">
                  Monthly
                </option>
              </select>
            </SettingRow>
          </SettingsSection>

          {/* =================================
              AI CONTENT
          ================================== */}

          <SettingsSection
            eyebrow="THEMEPILOT AI"
            title="AI content preferences"
            description="Control how ThemePilot generates product and SEO content."
          >
            <SettingRow
              title="AI writing tone"
              description="Choose the default tone for generated product content."
            >
              <select
                value={
                  settings.aiTone
                }
                disabled={
                  isSaving
                }
                onChange={(
                  event,
                ) =>
                  updateSetting(
                    "aiTone",
                    event.target
                      .value,
                  )
                }
                className="tp-settings-select"
              >
                <option value="professional">
                  Professional
                </option>

                <option value="friendly">
                  Friendly
                </option>

                <option value="concise">
                  Concise
                </option>
              </select>
            </SettingRow>

            <SettingRow
              title="SEO title maximum length"
              description="Maximum character length for AI-generated SEO titles."
            >
              <NumberInput
                value={
                  settings.seoTitleMaxLength
                }
                disabled={
                  isSaving
                }
                min={30}
                max={70}
                onChange={(
                  value,
                ) =>
                  updateSetting(
                    "seoTitleMaxLength",
                    value,
                  )
                }
              />
            </SettingRow>

            <SettingRow
              title="SEO description maximum length"
              description="Maximum character length for AI-generated SEO descriptions."
            >
              <NumberInput
                value={
                  settings.seoDescriptionMaxLength
                }
                disabled={
                  isSaving
                }
                min={100}
                max={180}
                onChange={(
                  value,
                ) =>
                  updateSetting(
                    "seoDescriptionMaxLength",
                    value,
                  )
                }
              />
            </SettingRow>

            <SettingRow
              title="Generate image alt text"
              description="Include image alt-text improvements when generating AI content."
            >
              <Toggle
                checked={
                  settings.autoGenerateAltText
                }
                disabled={
                  isSaving
                }
                onChange={(
                  checked,
                ) =>
                  updateSetting(
                    "autoGenerateAltText",
                    checked,
                  )
                }
              />
            </SettingRow>
          </SettingsSection>

          {/* =================================
              DATA
          ================================== */}

          <SettingsSection
            eyebrow="DATA"
            title="History and notifications"
            description="Manage saved scan history and notification preferences."
          >
            <SettingRow
              title="Scan history retention"
              description="Choose how long ThemePilot should keep scan records."
            >
              <select
                value={
                  settings.historyRetention
                }
                disabled={
                  isSaving
                }
                onChange={(
                  event,
                ) =>
                  updateSetting(
                    "historyRetention",
                    event.target
                      .value,
                  )
                }
                className="tp-settings-select"
              >
                <option value="30">
                  30 days
                </option>

                <option value="90">
                  90 days
                </option>

                <option value="180">
                  180 days
                </option>

                <option value="365">
                  1 year
                </option>

                <option value="forever">
                  Keep forever
                </option>
              </select>
            </SettingRow>

            <SettingRow
              title="Email notifications"
              description="Receive notifications about scans and store health changes."
            >
              <Toggle
                checked={
                  settings.emailNotifications
                }
                disabled={
                  isSaving
                }
                onChange={(
                  checked,
                ) =>
                  updateSetting(
                    "emailNotifications",
                    checked,
                  )
                }
              />
            </SettingRow>
          </SettingsSection>
        </div>

        {/* ===================================
            SIDEBAR
        ==================================== */}

        <aside className="tp-settings-sidebar">
          <div className="tp-settings-save-card">
            <p className="tp-analytics__eyebrow">
              WORKSPACE
            </p>

            <h2 className="tp-section-heading tp-section-heading--compact">
              Save settings
            </h2>

            <p className="tp-section-subtitle">
              Apply these preferences
              to your ThemePilot
              workspace.
            </p>

            <div className="tp-settings-summary">
              <SummaryItem
                label="Auto scan"
                value={
                  settings.autoScan
                    ? "Enabled"
                    : "Disabled"
                }
              />

              <SummaryItem
                label="Frequency"
                value={
                  capitalize(
                    settings.scanFrequency,
                  )
                }
              />

              <SummaryItem
                label="AI tone"
                value={
                  capitalize(
                    settings.aiTone,
                  )
                }
              />

              <SummaryItem
                label="SEO title"
                value={`${settings.seoTitleMaxLength} chars`}
              />

              <SummaryItem
                label="SEO description"
                value={`${settings.seoDescriptionMaxLength} chars`}
              />

              <SummaryItem
                label="History"
                value={
                  settings.historyRetention ===
                  "forever"
                    ? "Forever"
                    : `${settings.historyRetention} days`
                }
              />
            </div>

            <button
              type="button"
              disabled={
                isSaving
              }
              onClick={
                handleSave
              }
              className="tp-button tp-button--ai tp-settings-save-button"
            >
              {isSaving
                ? "Saving..."
                : "Save Settings"}
            </button>

            <button
              type="button"
              disabled={
                isSaving
              }
              onClick={
                handleReset
              }
              className="tp-button tp-button--secondary tp-settings-reset-button"
            >
              Reset to Defaults
            </button>

            <p className="tp-bulk-note">
              Settings are saved
              separately for this Shopify
              store.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

/* =========================================
   SECTION
========================================= */

function SettingsSection({
  eyebrow,
  title,
  description,
  children,
}) {
  return (
    <section className="tp-settings-section">
      <div className="tp-settings-section__header">
        <p className="tp-analytics__eyebrow">
          {eyebrow}
        </p>

        <h2 className="tp-section-heading tp-section-heading--compact">
          {title}
        </h2>

        <p className="tp-section-subtitle">
          {description}
        </p>
      </div>

      <div className="tp-settings-list">
        {children}
      </div>
    </section>
  );
}

/* =========================================
   ROW
========================================= */

function SettingRow({
  title,
  description,
  children,
}) {
  return (
    <div className="tp-settings-row">
      <div className="tp-settings-row__content">
        <strong>
          {title}
        </strong>

        <p>
          {description}
        </p>
      </div>

      <div className="tp-settings-row__control">
        {children}
      </div>
    </div>
  );
}

/* =========================================
   TOGGLE
========================================= */

function Toggle({
  checked,
  disabled,
  onChange,
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={
        checked
      }
      disabled={
        disabled
      }
      onClick={() =>
        onChange(
          !checked,
        )
      }
      className={
        checked
          ? "tp-settings-toggle tp-settings-toggle--active"
          : "tp-settings-toggle"
      }
    >
      <span />
    </button>
  );
}

/* =========================================
   NUMBER INPUT
========================================= */

function NumberInput({
  value,
  min,
  max,
  disabled,
  onChange,
}) {
  return (
    <div className="tp-settings-number">
      <input
        type="number"
        value={
          value
        }
        disabled={
          disabled
        }
        min={min}
        max={max}
        onChange={(
          event,
        ) => {
          const nextValue =
            Number(
              event.target
                .value,
            );

          if (
            Number.isNaN(
              nextValue,
            )
          ) {
            return;
          }

          onChange(
            Math.min(
              max,
              Math.max(
                min,
                nextValue,
              ),
            ),
          );
        }}
      />

      <span>
        characters
      </span>
    </div>
  );
}

/* =========================================
   SUMMARY
========================================= */

function SummaryItem({
  label,
  value,
}) {
  return (
    <div className="tp-settings-summary__item">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

/* =========================================
   HELPERS
========================================= */

function capitalize(
  value,
) {
  const text =
    String(
      value || "",
    );

  if (!text) {
    return "";
  }

  return (
    text
      .charAt(0)
      .toUpperCase() +
    text.slice(1)
  );
}