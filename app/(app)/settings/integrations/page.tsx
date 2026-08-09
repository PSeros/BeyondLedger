import {getTranslations} from "next-intl/server";
import {getMqttSettingsForm} from "@/features/integrations/db/mqttSettings";
import {getMqttBridgeStatus} from "@/features/integrations/mqtt/runtime";
import MqttSettingsSection from "@/features/integrations/components/MqttSettingsSection";
import {SettingsSection} from "@/features/settings/components/SettingsSection";

// Outbound integrations — currently the Home Assistant MQTT bridge (Phase 17).
export default async function Page() {
  const [t, mqttSettings] = await Promise.all([
    getTranslations("settings"),
    getMqttSettingsForm(),
  ]);

  return (
    <div className="max-w-2xl">
      <SettingsSection
        id="integrations"
        heading={t("integrationsHeading")}
        description={t("integrationsHeadingDescription")}
      >
        <MqttSettingsSection settings={mqttSettings} status={getMqttBridgeStatus()}/>
      </SettingsSection>
    </div>
  );
}
