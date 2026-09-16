import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { errMessage } from "@/src/api/client";
import {
  addCard,
  addDevice,
  addTag,
  listCards,
  listDevices,
  listIncidentDetails,
  listTags,
  listVehicles,
  reportIntruder,
  reportSimSwap,
  setTagLost,
  setVehicleLost,
  updateTag,
} from "@/src/api/endpoints";
import { Card, Device, Tag, Vehicle } from "@/src/api/types";
import { Chip } from "@/src/components/Chip";
import { EmptyState } from "@/src/components/EmptyState";
import { Field } from "@/src/components/Field";
import { GlassCard } from "@/src/components/GlassCard";
import { NeonButton } from "@/src/components/NeonButton";
import { OverlayForm } from "@/src/components/OverlayForm";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { VehicleIcon } from '@/src/components/VehicleIcon';
import { TagChips } from '@/src/components/TagChips';
import { SearchSelect } from '@/src/components/SearchSelect';
import { vehicleTags } from '@/src/utils/vehicles';
import { loadVehicleRules, optionLabel } from '@/src/api/vehicleMetadata';
import { addReceipt } from "@/src/services/receipts";
import { useToast } from "@/src/context/ToastContext";
import { colors, fonts, fontSize, radius, spacing, tint } from "@/src/theme";

type Seg = "theft" | "qr";
type QrKind = "vehicles" | "tags" | "cards";

export default function Security() {
  const [seg, setSeg] = useState<Seg>("qr");
  const [unread, setUnread] = useState(0);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const all = await listIncidentDetails();
          const needReply = all.filter((i) => !i.owner_response && !i.resolved).length;
          if (active) setUnread(needReply);
        } catch {
          /* ignore */
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const openAlerts = () => {
    router.push("/incidents-inbox");
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Security"
        subtitle="Anti-theft & Smart QR"
        accent={colors.teal}
        right={
          <View style={{ flexDirection: "row", gap: spacing.lg }}>
            <Pressable testID="security-alerts-inbox" onPress={openAlerts} hitSlop={10}>
              <Feather name="bell" size={22} color={colors.amber} />
              {unread > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable testID="security-scan-history" onPress={() => router.push("/scan-history")} hitSlop={10}>
              <Feather name="clock" size={22} color={colors.teal} />
            </Pressable>
          </View>
        }
      />
      <View style={styles.segment}>
        <Pressable testID="seg-qr" onPress={() => setSeg("qr")} style={[styles.segItem, seg === "qr" && { backgroundColor: colors.teal }]}>
          <Feather name="grid" size={15} color={seg === "qr" ? "#03030a" : colors.textDim} />
          <Text style={[styles.segText, seg === "qr" && styles.segActiveText]}>Smart QR</Text>
        </Pressable>
        <Pressable testID="seg-theft" onPress={() => setSeg("theft")} style={[styles.segItem, seg === "theft" && { backgroundColor: colors.red }]}>
          <Feather name="lock" size={15} color={seg === "theft" ? "#03030a" : colors.textDim} />
          <Text style={[styles.segText, seg === "theft" && styles.segActiveText]}>Anti-theft</Text>
        </Pressable>
      </View>
      {seg === "qr" ? <SmartQr /> : <AntiTheft />}
    </View>
  );
}

function AntiTheft() {
  const toast = useToast();
  const router = useRouter();
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");

  const load = useCallback(() => {
    listDevices().then(setDevices).catch((e) => { setDevices([]); toast(errMessage(e), "error"); });
  }, [toast]);

  useFocusEffect(useCallback(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]));

  const onAdd = async () => {
    if (!name.trim()) { toast("Enter a device name", "error"); return; }
    setBusy(true);
    try {
      await addDevice(name.trim(), "android", name.trim());
      toast("Device registered", "success");
      setShow(false); setName(""); load();
    } catch (e) {
      toast(errMessage(e, "Could not register"), "error");
    } finally { setBusy(false); }
  };

  const act = async (id: string, kind: "intruder" | "sim") => {
    try {
      if (kind === "intruder") await reportIntruder(id);
      else await reportSimSwap(id);
      toast(kind === "intruder" ? "Intruder event logged" : "SIM-swap reported", "success");
      load();
    } catch (e) {
      toast(errMessage(e, "Action failed"), "error");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <GlassCard borderColor={colors.borderRed} style={styles.infoBanner}>
        <Feather name="info" size={16} color={colors.red} />
        <Text style={styles.infoText}>Register your device for security reports. Remote lock and shutdown-resistant tracking require native Device Admin support.</Text>
      </GlassCard>

      {devices === null ? (
        <View style={styles.pad}><ActivityIndicator color={colors.red} /></View>
      ) : devices.length === 0 ? (
        <EmptyState icon="smartphone" color={colors.red} title="No devices" subtitle="Register a phone to protect it against theft." />
      ) : (
        devices.map((d) => (
          <GlassCard key={d.id} borderColor={colors.borderRed} style={styles.deviceCard} testID={`device-${d.id}`}>
            <View style={styles.deviceHead}>
              <View style={[styles.bubble, { backgroundColor: tint.red }]}>
                <Feather name="smartphone" size={20} color={colors.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{d.name}</Text>
                <Text style={styles.meta}>{d.platform}</Text>
              </View>
              <View style={styles.badges}>
                <Chip label={d.locked ? "Locked" : "Unlocked"} color={d.locked ? colors.red : colors.green} tintBg={d.locked ? tint.red : tint.green} icon={d.locked ? "lock" : "unlock"} />
                {d.siren_active && <Chip label="Siren" color={colors.amber} tintBg={tint.amber} icon="volume-2" />}
              </View>
            </View>
            <View style={styles.deviceActions}>
              <NeonButton label="Report intruder" variant="ghost" color={colors.red} icon="camera" onPress={() => act(d.id, "intruder")} style={{ flex: 1 }} testID={`device-intruder-${d.id}`} />
              <NeonButton label="SIM swap" variant="ghost" color={colors.amber} icon="alert-triangle" onPress={() => act(d.id, "sim")} style={{ flex: 1 }} testID={`device-sim-${d.id}`} />
            </View>
          </GlassCard>
        ))
      )}

      <NeonButton label="Register device" color={colors.red} icon="plus" onPress={() => setShow(true)} testID="device-add-button" />
      <NeonButton label="Activate fake-off decoy" variant="ghost" color={colors.amber} icon="power" onPress={() => router.push("/decoy")} testID="decoy-button" />

      <OverlayForm visible={show} title="Register device" color={colors.red} submitLabel="Register" busy={busy} onClose={() => setShow(false)} onSubmit={onAdd} testID="device-form">
        <Field label="DEVICE NAME" icon="smartphone" placeholder="e.g. My Pixel" value={name} onChangeText={setName} testID="device-name-input" />
      </OverlayForm>
    </ScrollView>
  );
}

function SmartQr() {
  const router = useRouter();
  const toast = useToast();
  const [kind, setKind] = useState<QrKind>("vehicles");
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f1, setF1] = useState("");
  const [f2, setF2] = useState("");
  const [lostBusy, setLostBusy] = useState<string | null>(null);
  const [rewardFor, setRewardFor] = useState<Tag | null>(null);
  const [rewardText, setRewardText] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [rewardUpi, setRewardUpi] = useState("");
  const [recoverFor, setRecoverFor] = useState<Tag | null>(null);
  const [recoverUpi, setRecoverUpi] = useState("");
  const [recoverAmount, setRecoverAmount] = useState("");
  const [recoverPhone, setRecoverPhone] = useState("");
  const [errors, setErrors] = useState<Partial<Record<QrKind, string>>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [tagTypes, setTagTypes] = useState<string[]>([]);
  const [typeError, setTypeError] = useState('');
  const [typeLoading, setTypeLoading] = useState(false);
  const loadGeneration = useRef(0), adding = useRef(false);
  const loadTagTypes = useCallback(async () => {
    setTypeLoading(true); setTypeError('');
    try { setTagTypes((await loadVehicleRules(true)).tagTypes); }
    catch (e) { setTypeError(errMessage(e)); }
    finally { setTypeLoading(false); }
  }, []);
  useEffect(() => { if (show && kind === 'tags') void loadTagTypes(); }, [show, kind, loadTagTypes]);

  const onRecover = (item: any) => {
    const m = String(item.reward_text || "").match(/₹\s*(\d+)/);
    setRecoverAmount(m ? m[1] : "");
    setRecoverUpi("");
    setRecoverPhone("");
    setRecoverFor(item);
  };

  const submitRecover = async () => {
    const it = recoverFor!;
    setRecoverFor(null);
    const upi = recoverUpi.trim();
    const amt = recoverAmount.trim();
    const phone = recoverPhone.trim();
    if (upi) {
      const link = `upi://pay?pa=${encodeURIComponent(upi)}&pn=NekSathi%20Finder${amt ? `&am=${amt}` : ""}&cu=INR&tn=${encodeURIComponent("NekSathi reward")}`;
      try {
        const ok = await Linking.canOpenURL(link);
        if (ok) await Linking.openURL(link);
        else toast("No UPI app found — pay the finder manually", "info");
      } catch {
        toast("Could not open a UPI app", "info");
      }
    }
    await applyLost(it, false);
    await addReceipt({ item: it.name, finderUpi: upi, amount: amt, paid: !!upi });
    // Auto thank-you to the finder.
    if (phone) {
      const body = encodeURIComponent(`Thank you for returning my ${it.name}! ${amt ? `I've sent ₹${amt} as a reward. ` : ""}— via NekSathi`);
      const sep = Platform.OS === "ios" ? "&" : "?";
      Linking.openURL(`sms:${phone}${sep}body=${body}`).catch(() => {});
    }
    toast("Recovered — receipt saved" + (phone ? " & thank-you sent" : ""), "success");
  };

  const applyLost = async (item: any, enabled: boolean, reward?: string) => {
    setLostBusy(item.id);
    try {
      if (kind === "vehicles") {
        await setVehicleLost(item.id, enabled);
      } else {
        if (enabled && reward !== undefined) {
          await updateTag(item.id, { name: item.name, tag_type: item.tag_type, reward_text: reward || null });
        }
        await setTagLost(item.id, enabled);
      }
      toast(enabled ? "Lost mode ON — scanners can now help" : "Lost mode turned off", enabled ? "success" : "info");
      load();
    } catch (e) {
      toast(errMessage(e, "Could not update lost mode"), "error");
    } finally {
      setLostBusy(null);
    }
  };

  const onToggleLost = (item: any) => {
    if (item.lost_mode) {
      applyLost(item, false);
      return;
    }
    if (kind === "tags") {
      setRewardText("");
      setRewardAmount("");
      setRewardUpi("");
      setRewardFor(item);
    } else {
      applyLost(item, true);
    }
  };

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setRefreshing(true);
    const results = await Promise.allSettled([listVehicles(), listTags(), listCards()]);
    if (generation !== loadGeneration.current) return;
    const nextErrors: Partial<Record<QrKind, string>> = {};
    const [v, t, c] = results;
    if (v.status === 'fulfilled') setVehicles(v.value); else nextErrors.vehicles = errMessage(v.reason);
    if (t.status === 'fulfilled') setTags(t.value); else nextErrors.tags = errMessage(t.reason);
    if (c.status === 'fulfilled') setCards(c.value); else nextErrors.cards = errMessage(c.reason);
    setErrors(nextErrors); setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
    const resume = AppState.addEventListener('change', s => { if (s === 'active') void load(); });
    return () => { loadGeneration.current++; resume.remove(); };
  }, [load]));

  const openQr = (qrId: string, title: string, subtitle: string, color: string) =>
    router.push({ pathname: "/qr-detail", params: { qrId, title, subtitle, color } });

  const onAdd = async () => {
    if (adding.current) return;
    if (!f1.trim()) { toast("Please fill the required field", "error"); return; }
    if (kind === 'tags' && !tagTypes.includes(f2)) { setTypeError('Select a tag type from the server list.'); return; }
    adding.current = true;
    setBusy(true);
    try {
      if (kind === "tags") await addTag(f1.trim(), f2);
      else await addCard(f1.trim(), f2.trim() || undefined);
      toast("Created with a Smart QR", "success");
      setShow(false); setF1(""); setF2(""); load();
    } catch (e) {
      toast(errMessage(e, "Could not create"), "error");
    } finally { adding.current = false; setBusy(false); }
  };

  const list = kind === "vehicles" ? vehicles : kind === "tags" ? tags : cards;

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.teal} />}>
      <View style={styles.chipRow}>
        <Chip label="Vehicles" icon="truck" color={colors.teal} tintBg={tint.teal} active={kind === "vehicles"} onPress={() => setKind("vehicles")} testID="qrkind-vehicles" />
        <Chip label="Tags" icon="tag" color={colors.teal} tintBg={tint.teal} active={kind === "tags"} onPress={() => setKind("tags")} testID="qrkind-tags" />
        <Chip label="ICE Cards" icon="credit-card" color={colors.teal} tintBg={tint.teal} active={kind === "cards"} onPress={() => setKind("cards")} testID="qrkind-cards" />
      </View>

      <View style={styles.listActions}>
        <NeonButton testID="security-refresh-items" label="Refresh" icon="refresh-cw" variant="ghost" color={colors.teal} onPress={load} loading={refreshing} style={{ flex: 1 }} />
        <NeonButton testID="security-scan-qr" label="Scan QR" icon="camera" variant="ghost" color={colors.teal} onPress={() => router.push('/scan')} style={{ flex: 1 }} />
      </View>
      {!!errors[kind] && <GlassCard style={{ gap: spacing.md }}><Text testID={`qr-${kind}-load-error`} style={styles.errorText}>{errors[kind]}</Text><Text testID={`qr-${kind}-stale`} style={styles.meta}>Refresh to load the latest website data.</Text></GlassCard>}
      {list === null && errors[kind] ? null : list === null ? (
        <View style={styles.pad}><ActivityIndicator color={colors.teal} /></View>
      ) : list.length === 0 ? (
        <EmptyState icon="grid" color={colors.teal} title={`No ${kind}`} subtitle="Create one to generate a private, scannable Smart QR." />
      ) : (
        list.map((item: any) => {
          const title = kind === "vehicles" ? item.number_plate : kind === "tags" ? item.name : item.display_name;
          const subtitle = kind === "vehicles" ? item.vehicle_type : kind === "tags" ? item.tag_type : (item.title || "ICE card");
          const canLost = kind === "vehicles" || kind === "tags";
          const isLost = !!item.lost_mode;
          return (
            <GlassCard key={item.id} borderColor={isLost ? colors.borderRed : colors.borderTeal} style={styles.qrCard} testID={`qr-item-${item.id}`}>
              <Pressable style={styles.qrRow} onPress={() => kind === 'vehicles' ? router.push({ pathname: '/vehicle-detail', params: { id: item.id } }) : openQr(item.qr_id, title, subtitle, isLost ? colors.red : colors.teal)} testID={`qr-open-${item.id}`}>
                <View style={[styles.qrThumb, isLost && { backgroundColor: tint.red }]}>
                  {kind === 'vehicles' ? <VehicleIcon vehicle={item} testID={`vehicle-type-icon-${item.id}`} color={isLost ? colors.red : colors.teal} /> : <Feather name={kind === 'tags' ? 'tag' : 'credit-card'} size={20} color={isLost ? colors.red : colors.teal} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text testID={`qr-title-${item.id}`} style={styles.name}>{title}</Text>
                  <Text testID={`qr-subtitle-${item.id}`} style={styles.meta}>{subtitle}</Text>
                </View>
                {isLost && <Chip label="LOST" color={colors.red} tintBg={tint.red} icon="alert-circle" />}
                <Feather name="chevron-right" size={20} color={colors.textDim} />
              </Pressable>
              {kind === 'vehicles' && <>
                <Text testID={`vehicle-info-${item.id}`} style={styles.meta}>{[item.make_model, item.color, item.speed_limit_kmh !== null ? `${item.speed_limit_kmh} km/h` : ''].filter(Boolean).join(' · ') || 'Vehicle details not provided'}</Text>
                <TagChips testID={`vehicle-tags-${item.id}`} tags={vehicleTags(item, tags ?? [])} />
              </>}
              {kind === 'tags' && <TagChips testID={`guardian-tag-${item.id}`} tags={[item]} />}
              {isLost && item.reward_text ? (
                <Text style={styles.reward} testID={`qr-reward-${item.id}`}>🎁 {item.reward_text}</Text>
              ) : null}
              {canLost && (
                <Pressable style={styles.lostToggle} onPress={() => onToggleLost(item)} disabled={lostBusy === item.id} testID={`lost-toggle-${item.id}`}>
                  <Feather name="flag" size={15} color={isLost ? colors.red : colors.textDim} />
                  <Text style={[styles.lostText, { color: isLost ? colors.red : colors.textMuted }]}>
                    {lostBusy === item.id ? "Updating…" : isLost ? "Turn off Lost Mode" : "Mark as lost"}
                  </Text>
                </Pressable>
              )}
              {isLost && kind === "tags" && (
                <Pressable style={styles.recoverBtn} onPress={() => onRecover(item)} testID={`recover-${item.id}`}>
                  <Feather name="check-circle" size={15} color={colors.green} />
                  <Text style={[styles.lostText, { color: colors.green }]}>Recovered — pay the finder</Text>
                </Pressable>
              )}
              {kind === "vehicles" && (
                <Pressable
                  style={styles.familyBtn}
                  onPress={() => router.push({ pathname: "/vehicle-contacts", params: { vehicleId: item.id, plate: item.number_plate } })}
                  testID={`vehicle-family-${item.id}`}
                >
                  <Feather name="users" size={15} color={colors.purple} />
                  <Text style={[styles.lostText, { color: colors.purple }]}>Family members</Text>
                </Pressable>
              )}
            </GlassCard>
          );
        })
      )}

      <NeonButton label={`Add ${kind === "cards" ? "ICE card" : kind.slice(0, -1)}`} color={colors.teal} icon="plus" onPress={() => { if (kind === 'vehicles') router.push('/vehicle-form'); else { setF1(''); setF2(''); setShow(true); } }} testID="qr-add-button" />

      <OverlayForm visible={show} title={`New ${kind === "cards" ? "ICE card" : kind.slice(0, -1)}`} color={colors.teal} submitLabel="Create" busy={busy} onClose={() => setShow(false)} onSubmit={onAdd} testID="qr-form">
        {kind === "tags" && (
          <>
            <Field label="TAG NAME" icon="tag" placeholder="e.g. School Bag" value={f1} onChangeText={setF1} testID="qr-f1-input" />
            <SearchSelect testID="tag-type-select" label="Tag type" value={f2} onChange={setF2} options={tagTypes.map(t => ({ id: t, label: optionLabel(t) }))} loading={typeLoading} disabled={busy} inline />
            {!!typeError && <><Text testID="tag-type-error" style={styles.errorText}>{typeError}</Text><NeonButton testID="tag-type-retry" label="Reload tag types" onPress={loadTagTypes} variant="ghost" /></>}
          </>
        )}
        {kind === "cards" && (
          <>
            <Field label="DISPLAY NAME" icon="user" placeholder="e.g. Ravi Kumar" value={f1} onChangeText={setF1} testID="qr-f1-input" />
            <Field label="TITLE (optional)" icon="briefcase" placeholder="e.g. Emergency contact" value={f2} onChangeText={setF2} testID="qr-f2-input" />
          </>
        )}
      </OverlayForm>

      <OverlayForm
        visible={!!rewardFor}
        title="Mark as lost"
        color={colors.red}
        submitLabel="Activate Lost Mode"
        busy={lostBusy === rewardFor?.id}
        onClose={() => setRewardFor(null)}
        onSubmit={() => {
          const it = rewardFor!;
          setRewardFor(null);
          const parts: string[] = [];
          if (rewardAmount.trim()) parts.push(`₹${rewardAmount.trim()} reward on safe return`);
          if (rewardUpi.trim()) parts.push(`Pay via UPI: ${rewardUpi.trim()}`);
          if (rewardText.trim()) parts.push(rewardText.trim());
          applyLost(it, true, parts.join(" · "));
        }}
        testID="reward-form"
      >
        <Text style={styles.rewardHelp}>Promise a reward to whoever returns your item. The finder sees your offer and UPI when they scan — your phone number stays private.</Text>
        <Field label="REWARD AMOUNT (₹)" icon="gift" placeholder="e.g. 500" keyboardType="number-pad" value={rewardAmount} onChangeText={setRewardAmount} testID="reward-amount-input" />
        <Field label="YOUR UPI ID (optional)" icon="credit-card" placeholder="e.g. name@upi" autoCapitalize="none" value={rewardUpi} onChangeText={setRewardUpi} testID="reward-upi-input" />
        <Field label="NOTE (optional)" icon="edit-2" placeholder="e.g. Please call, kids' school bag" value={rewardText} onChangeText={setRewardText} testID="reward-input" />
      </OverlayForm>

      <OverlayForm
        visible={!!recoverFor}
        title="Item recovered 🎉"
        color={colors.green}
        submitLabel={recoverUpi.trim() ? "Pay reward & close" : "Turn off lost mode"}
        busy={lostBusy === recoverFor?.id}
        onClose={() => setRecoverFor(null)}
        onSubmit={submitRecover}
        testID="recover-form"
      >
        <Text style={styles.rewardHelp}>Enter the finder&apos;s UPI ID to open your UPI app and send the promised reward. Leave blank to just turn off lost mode.</Text>
        <Field label="FINDER'S UPI ID" icon="credit-card" placeholder="e.g. finder@upi" autoCapitalize="none" value={recoverUpi} onChangeText={setRecoverUpi} testID="recover-upi-input" />
        <Field label="AMOUNT (₹)" icon="gift" placeholder="e.g. 500" keyboardType="number-pad" value={recoverAmount} onChangeText={setRecoverAmount} testID="recover-amount-input" />
        <Field label="FINDER'S PHONE (optional)" icon="phone" placeholder="Send an auto thank-you SMS" keyboardType="phone-pad" value={recoverPhone} onChangeText={setRecoverPhone} testID="recover-phone-input" />
      </OverlayForm>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  listActions: { flexDirection: 'row', gap: spacing.sm },
  errorText: { color: colors.red, fontSize: 15, lineHeight: 22 },
  root: { flex: 1, backgroundColor: colors.bg },
  badge: { position: "absolute", top: -6, right: -8, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, backgroundColor: colors.red, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontFamily: fonts.displaySemi, fontSize: 10 },
  segment: { flexDirection: "row", marginHorizontal: spacing.lg, marginTop: spacing.md, backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, padding: 4 },
  segItem: { flex: 1, flexDirection: "row", gap: 6, paddingVertical: spacing.sm, alignItems: "center", justifyContent: "center", borderRadius: radius.pill },
  segText: { color: colors.textDim, fontFamily: fonts.displaySemi, fontSize: fontSize.base },
  segActiveText: { color: "#03030a" },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  chipRow: { flexDirection: "row", gap: spacing.sm },
  pad: { paddingVertical: spacing.xxl, alignItems: "center" },
  infoBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  infoText: { flex: 1, color: colors.textMuted, fontFamily: fonts.body, fontSize: fontSize.sm, lineHeight: 18 },
  deviceCard: { gap: spacing.md },
  deviceHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  bubble: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badges: { alignItems: "flex-end", gap: 6 },
  deviceActions: { flexDirection: "row", gap: spacing.md },
  name: { color: colors.text, fontFamily: fonts.displaySemi, fontSize: fontSize.base },
  meta: { color: colors.textDim, fontFamily: fonts.body, fontSize: fontSize.sm, marginTop: 2 },
  qrRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  qrCard: { gap: spacing.sm },
  qrThumb: { width: 42, height: 42, borderRadius: 10, backgroundColor: tint.teal, alignItems: "center", justifyContent: "center" },
  lostToggle: { flexDirection: "row", alignItems: "center", gap: spacing.sm, alignSelf: "flex-start", paddingTop: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, width: "100%" },
  recoverBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, alignSelf: "flex-start" },
  familyBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, alignSelf: "flex-start", paddingTop: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, width: "100%" },
  lostText: { fontFamily: fonts.displaySemi, fontSize: fontSize.sm },
  reward: { color: colors.textMuted, fontFamily: fonts.body, fontSize: fontSize.sm },
  rewardHelp: { color: colors.textDim, fontFamily: fonts.body, fontSize: fontSize.sm, lineHeight: 18 },
});
