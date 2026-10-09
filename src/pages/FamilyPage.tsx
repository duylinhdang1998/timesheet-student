import { useRef, useState } from 'react'
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonModal,
  IonPage,
  IonRippleEffect,
  useIonActionSheet,
  useIonAlert,
  useIonLoading,
  useIonRouter,
} from '@ionic/react'
import {
  add,
  chevronForward,
  documentTextOutline,
  homeOutline,
  logOutOutline,
  lockClosedOutline,
  personAddOutline,
  settingsOutline,
  shareOutline,
  shieldCheckmarkOutline,
  trashOutline,
} from 'ionicons/icons'
import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNowStrict } from 'date-fns'
import { Share } from '@capacitor/share'
import { vi } from 'date-fns/locale'
import { InfoRow, LargeHeader, PoweredBy, PullToRefresh, RowsCard, SectionTitle } from '../components/Page'
import { ChildAvatar, tint } from '../components/ChildAvatar'
import { classAndSchool } from '../components/SessionSheet'
import { ErrorBox, Loading } from '../components/States'
import { useChildren, useInvites, useMembers } from '../data/queries'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import { inviteLink } from '../lib/invite'
import { LEGAL_PATH, LEGAL_TITLE } from '../lib/legal'
import { isNative } from '../lib/native'
import { ROLE_LABEL, type Invite, type Member, type Role } from '../lib/types'
import { useUserId } from '../state/auth'
import { useHousehold } from '../state/household'
import { useToast } from '../state/toast'

const PRIMARY = 'var(--ion-color-primary)'

/** "Bạn là chủ nhà" / "Bạn được sửa" / "Bạn chỉ xem" */
const ROLE_SENTENCE: Record<Role, string> = {
  owner: 'Bạn là chủ nhà',
  editor: 'Bạn được sửa lịch',
  viewer: 'Bạn chỉ xem lịch',
}

export function FamilyPage() {
  const { householdName, isOwner, canEdit, role } = useHousehold()
  const [presentActionSheet] = useIonActionSheet()
  const [editingNames, setEditingNames] = useState(false)
  const router = useIonRouter()

  const openSettings = () =>
    presentActionSheet({
      buttons: [
        { text: 'Sửa tên', handler: () => setEditingNames(true) },
        { text: 'Đăng xuất', role: 'destructive', handler: () => void supabase.auth.signOut() },
        { text: 'Huỷ', role: 'cancel' },
      ],
    })

  return (
    <IonPage>
      <LargeHeader
        title="Gia đình"
        end={
          <IonButton fill="clear" color="medium" onClick={openSettings} aria-label="Cài đặt">
            <IonIcon slot="icon-only" icon={settingsOutline} />
          </IonButton>
        }
      />
      <IonContent>
        <PullToRefresh />
        <div className="mx-auto max-w-md space-y-4 px-4 pt-1 pb-10">
          <button
            type="button"
            onClick={() => setEditingNames(true)}
            className="card ion-activatable relative flex w-full items-center gap-3.5 overflow-hidden p-4 text-left"
          >
            <IonRippleEffect />
            <span
              className="flex size-13 shrink-0 items-center justify-center rounded-full text-[22px]"
              style={{ backgroundColor: tint('#1f7a72', 16), color: PRIMARY }}
            >
              <IonIcon icon={homeOutline} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[18px] font-bold">{householdName}</span>
              <span className="text-muted block text-[14px]">{ROLE_SENTENCE[role]}</span>
            </span>
            <IonIcon icon={chevronForward} className="text-muted shrink-0 text-lg opacity-70" />
          </button>

          <ChildrenSection canEdit={canEdit} />
          <MembersSection />
          {isOwner && <InvitesSection />}

          <section className="space-y-2.5">
            <SectionTitle title="Thông tin" />
            <RowsCard>
              <InfoRow
                icon={documentTextOutline}
                label={LEGAL_TITLE.terms}
                onClick={() => router.push(LEGAL_PATH.terms)}
              />
              <InfoRow
                icon={shieldCheckmarkOutline}
                label={LEGAL_TITLE.privacy}
                onClick={() => router.push(LEGAL_PATH.privacy)}
              />
            </RowsCard>
          </section>

          <AccountSection />

          <p className="text-muted px-4 pt-2 text-center text-xs">Quên mật khẩu? Hãy nhờ quản trị viên đặt lại.</p>
          <PoweredBy />
        </div>
      </IonContent>

      {editingNames && <EditNamesSheet onClose={() => setEditingNames(false)} />}
    </IonPage>
  )
}

function ChildrenSection({ canEdit }: { canEdit: boolean }) {
  const router = useIonRouter()
  const { data: children, isPending, error } = useChildren()
  return (
    <section className="space-y-2.5">
      <SectionTitle
        title="Các con"
        end={
          canEdit && (
            <IonButton fill="clear" size="small" routerLink="/con/moi" routerDirection="forward" className="-mr-2">
              <IonIcon slot="start" icon={add} />
              Thêm bé
            </IonButton>
          )
        }
      />
      {error && <ErrorBox error={error} />}
      {isPending ? (
        <Loading />
      ) : children?.length === 0 ? (
        <p className="card text-muted px-4 py-4 text-[14px]">Chưa có bé nào.</p>
      ) : (
        <RowsCard>
          {children?.map((c) => {
            const line = classAndSchool(c)
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => router.push(`/con/${c.id}`, 'forward')}
                className="ion-activatable relative flex w-full items-center gap-3 overflow-hidden px-4 py-3 text-left"
              >
                <IonRippleEffect />
                <ChildAvatar child={c} size="size-11 text-[17px]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold">{c.name}</span>
                  <span className={`block truncate text-[13px] ${line ? 'text-muted' : 'text-(--ion-color-primary)'}`}>
                    {line || 'Thêm lớp và trường'}
                  </span>
                </span>
                <IonIcon icon={chevronForward} className="text-muted shrink-0 text-lg opacity-70" />
              </button>
            )
          })}
        </RowsCard>
      )}
    </section>
  )
}

/** Sign out, and the in-app account deletion the App Store requires (rules in the delete_account migration). */
function AccountSection() {
  const userId = useUserId()
  const { householdName, isOwner } = useHousehold()
  const { data: members = [] } = useMembers()
  const toast = useToast()
  const [presentAlert] = useIonAlert()
  const [presentLoading, dismissLoading] = useIonLoading()

  // mirrors delete_my_account(): the longest-standing editor, else the longest-standing member
  const others = members.filter((m) => m.user_id !== userId)
  const heir = others.find((m) => m.role === 'editor') ?? others[0]
  const consequence = !heir
    ? `Gia đình “${householdName}” cùng toàn bộ lịch học, ghi chú và thông tin các con sẽ bị xoá vĩnh viễn.`
    : isOwner
      ? `Quyền chủ nhà sẽ chuyển cho ${heir.display_name}. Lịch học của gia đình vẫn được giữ lại cho các thành viên khác.`
      : `Bạn sẽ rời khỏi gia đình “${householdName}”. Lịch học của gia đình vẫn được giữ lại cho các thành viên khác.`

  async function deleteAccount() {
    await presentLoading({ message: 'Đang xoá tài khoản…' })
    try {
      const { error } = await supabase.rpc('delete_my_account')
      if (error) throw error
      await supabase.auth.signOut({ scope: 'local' })
      toast('Đã xoá tài khoản')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      await dismissLoading()
    }
  }

  const confirmDelete = () =>
    presentAlert({
      header: 'Xoá tài khoản?',
      message: `Email và tên hiển thị của bạn sẽ bị xoá. ${consequence} Thao tác này không thể hoàn tác.`,
      buttons: [
        { text: 'Huỷ', role: 'cancel' },
        { text: 'Xoá vĩnh viễn', role: 'destructive', handler: () => void deleteAccount() },
      ],
    })

  return (
    <section className="space-y-2.5">
      <SectionTitle title="Tài khoản" />
      <RowsCard>
        <InfoRow icon={logOutOutline} label="Đăng xuất" onClick={() => void supabase.auth.signOut()} />
        <InfoRow
          icon={trashOutline}
          label={<span className="text-(--ion-color-danger)">Xoá tài khoản</span>}
          onClick={confirmDelete}
        />
      </RowsCard>
    </section>
  )
}

function MembersSection() {
  const userId = useUserId()
  const { isOwner } = useHousehold()
  const { data: members, isPending, error } = useMembers()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [presentActionSheet] = useIonActionSheet()

  async function remove(member: Member) {
    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('household_id', member.household_id)
      .eq('user_id', member.user_id)
    if (error) return toast(errorMessage(error), 'error')
    queryClient.invalidateQueries({ queryKey: ['members'] })
  }

  const confirmRemove = (member: Member) =>
    presentActionSheet({
      header: `Xoá ${member.display_name} khỏi gia đình?`,
      subHeader: 'Người này sẽ không xem được lịch nữa. Muốn vào lại cần mã mời mới.',
      buttons: [
        { text: 'Xoá khỏi gia đình', role: 'destructive', handler: () => void remove(member) },
        { text: 'Huỷ', role: 'cancel' },
      ],
    })

  return (
    <section className="space-y-2.5">
      <SectionTitle title="Thành viên" />
      {error && <ErrorBox error={error} />}
      {isPending ? (
        <Loading />
      ) : (
        <RowsCard>
          {members?.map((m) => {
            const me = m.user_id === userId
            const removable = isOwner && !me
            const body = (
              <>
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-[17px] font-bold"
                  style={{ backgroundColor: tint('#1f7a72', 14), color: PRIMARY }}
                >
                  {m.display_name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold">
                    {m.display_name}
                    {me && <span className="text-muted font-normal"> (Bạn)</span>}
                  </span>
                  <span className="text-muted block text-[13px]">{ROLE_LABEL[m.role]}</span>
                </span>
              </>
            )
            const cls = 'relative flex w-full items-center gap-3 px-4 py-3 text-left'
            return removable ? (
              <button
                type="button"
                key={m.user_id}
                onClick={() => confirmRemove(m)}
                className={`${cls} ion-activatable overflow-hidden`}
              >
                <IonRippleEffect />
                {body}
                <IonIcon icon={chevronForward} className="text-muted shrink-0 text-lg opacity-70" />
              </button>
            ) : (
              <div key={m.user_id} className={cls}>
                {body}
              </div>
            )
          })}
        </RowsCard>
      )}
    </section>
  )
}

function InvitesSection() {
  const { data: invites, isPending, error } = useInvites(true)
  const queryClient = useQueryClient()
  const toast = useToast()
  const [presentActionSheet] = useIonActionSheet()
  const [busy, setBusy] = useState(false)

  async function create(role: Role) {
    setBusy(true)
    const { data, error } = await supabase.rpc('create_invite', { p_role: role })
    setBusy(false)
    if (error) return toast(errorMessage(error), 'error')
    await queryClient.invalidateQueries({ queryKey: ['invites'] })
    await share(data as Invite)
  }

  async function revoke(invite: Invite) {
    const { error } = await supabase.from('invites').delete().eq('id', invite.id)
    if (error) return toast(errorMessage(error), 'error')
    queryClient.invalidateQueries({ queryKey: ['invites'] })
  }

  async function share(invite: Invite) {
    const link = inviteLink(invite.code)
    const text = `Mời bạn xem lịch học của các con trên “Mẹ và lịch học”. Mã mời: ${invite.code}${link ? `\n${link}` : ''}`
    try {
      if (isNative) await Share.share({ text })
      else if (navigator.share) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(text)
        toast('Đã sao chép lời mời')
      }
    } catch {
      // share sheet dismissed
    }
  }

  const invite = () =>
    presentActionSheet({
      header: 'Người được mời có quyền',
      buttons: [
        { text: 'Được sửa lịch', handler: () => void create('editor') },
        { text: 'Chỉ xem lịch', handler: () => void create('viewer') },
        { text: 'Huỷ', role: 'cancel' },
      ],
    })

  return (
    <>
      <div className="note-card space-y-3 px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/60 text-[22px] text-(--app-note-fg) dark:bg-black/20">
            <IonIcon icon={personAddOutline} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-semibold">Cùng chăm sóc lịch học</h3>
            <p className="text-[14px] opacity-80">Mời ông bà, bố mẹ cùng xem và cập nhật lịch của các con.</p>
          </div>
        </div>
        <IonButton expand="block" className="h-11" disabled={busy} onClick={invite}>
          {busy ? 'Đang tạo mã…' : 'Mời thành viên'}
        </IonButton>
        <p className="flex items-center justify-center gap-1.5 text-xs opacity-75">
          <IonIcon icon={lockClosedOutline} />
          Bạn chọn quyền truy cập khi mời · mã dùng 1 lần, hết hạn sau 7 ngày
        </p>
      </div>

      {error && <ErrorBox error={error} />}
      {isPending ? (
        <Loading />
      ) : (
        invites &&
        invites.length > 0 && (
          <section className="space-y-2.5">
            <SectionTitle title="Mã mời đang chờ" />
            <RowsCard>
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center gap-2 py-2.5 pr-2 pl-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-lg font-bold tracking-[0.2em]">{inv.code}</div>
                    <div className="text-muted text-[13px]">
                      {ROLE_LABEL[inv.role]} · hết hạn sau{' '}
                      {formatDistanceToNowStrict(new Date(inv.expires_at), { locale: vi })}
                    </div>
                  </div>
                  <IonButton fill="clear" onClick={() => share(inv)} aria-label="Chia sẻ mã mời">
                    <IonIcon slot="icon-only" icon={shareOutline} />
                  </IonButton>
                  <IonButton fill="clear" color="danger" onClick={() => revoke(inv)} aria-label="Huỷ mã mời">
                    <IonIcon slot="icon-only" icon={trashOutline} />
                  </IonButton>
                </div>
              ))}
            </RowsCard>
          </section>
        )
      )}
    </>
  )
}

/** Sheet to rename yourself (and the family, for the owner). */
function EditNamesSheet({ onClose }: { onClose: () => void }) {
  const modal = useRef<HTMLIonModalElement>(null)
  const userId = useUserId()
  const { householdId, householdName, displayName, isOwner } = useHousehold()
  const queryClient = useQueryClient()
  const [name, setName] = useState(displayName)
  const [family, setFamily] = useState(householdName)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!name.trim() || !family.trim()) return setError('Tên không được để trống')
    setBusy(true)
    try {
      const { error } = await supabase
        .from('household_members')
        .update({ display_name: name.trim() })
        .eq('household_id', householdId)
        .eq('user_id', userId)
      if (error) throw error
      if (isOwner && family.trim() !== householdName) {
        const { error } = await supabase.from('households').update({ name: family.trim() }).eq('id', householdId)
        if (error) throw error
      }
      await queryClient.invalidateQueries({ queryKey: ['membership'] })
      await queryClient.invalidateQueries({ queryKey: ['members'] })
      await modal.current?.dismiss()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <IonModal
      ref={modal}
      isOpen
      className="auto-sheet"
      breakpoints={[0, 1]}
      initialBreakpoint={1}
      onDidDismiss={onClose}
    >
      <div className="space-y-4 px-5 pt-6 pb-[calc(var(--ion-safe-area-bottom)+1rem)]">
        <h2 className="text-lg font-semibold">Sửa tên</h2>
        <div className="card divide-y divide-(--app-border) overflow-hidden">
          <div className="px-4 py-1">
            <IonInput
              label="Tên của bạn"
              labelPlacement="stacked"
              value={name}
              onIonInput={(e) => {
                setError(null)
                setName(e.detail.value ?? '')
              }}
            />
          </div>
          {isOwner && (
            <div className="px-4 py-1">
              <IonInput
                label="Tên gia đình"
                labelPlacement="stacked"
                value={family}
                onIonInput={(e) => {
                  setError(null)
                  setFamily(e.detail.value ?? '')
                }}
              />
            </div>
          )}
        </div>
        {error && <ErrorBox error={error} />}
        <div className="space-y-1">
          <IonButton expand="block" className="h-12" disabled={busy} onClick={save}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </IonButton>
          <IonButton expand="block" fill="clear" color="medium" onClick={() => modal.current?.dismiss()}>
            Huỷ
          </IonButton>
        </div>
      </div>
    </IonModal>
  )
}
