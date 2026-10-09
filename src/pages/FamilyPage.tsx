import { useState } from 'react'
import { AppLink } from '../components/AppLink'
import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNowStrict } from 'date-fns'
import { Share } from '@capacitor/share'
import { vi } from 'date-fns/locale'
import { TopBar } from '../components/TopBar'
import { ChildAvatar } from '../components/ChildAvatar'
import { ConfirmSheet, Sheet } from '../components/Sheet'
import { Icon } from '../components/Icon'
import { ErrorBox, Loading } from '../components/States'
import { useChildren, useInvites, useMembers } from '../data/queries'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import { inviteLink } from '../lib/invite'
import { isNative } from '../lib/native'
import { ROLE_LABEL, type Invite, type Member, type Role } from '../lib/types'
import { useUserId } from '../state/auth'
import { useHousehold } from '../state/household'
import { useToast } from '../state/toast'

export function FamilyPage() {
  const { householdName, displayName, isOwner, canEdit, role } = useHousehold()
  const [editingNames, setEditingNames] = useState(false)

  return (
    <>
      <TopBar title="Gia đình" />
      <main className="mx-auto max-w-md space-y-6 px-4 py-4">
        <section className="card flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold">{householdName}</div>
            <div className="text-sm text-slate-500">
              Bạn là <b>{displayName}</b> · {ROLE_LABEL[role]}
            </div>
          </div>
          <button className="btn-secondary px-3 py-1.5 text-sm" onClick={() => setEditingNames(true)}>
            Sửa tên
          </button>
        </section>

        <ChildrenSection canEdit={canEdit} />
        <MembersSection />
        {isOwner && <InvitesSection />}

        <section className="space-y-2 pb-4">
          <button className="btn-secondary w-full" onClick={() => supabase.auth.signOut()}>
            Đăng xuất
          </button>
          <p className="text-center text-xs text-slate-400">Quên mật khẩu? Hãy nhờ quản trị viên đặt lại.</p>
        </section>
      </main>
      {editingNames && <NamesSheet onClose={() => setEditingNames(false)} />}
    </>
  )
}

function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="font-semibold text-slate-500 dark:text-slate-400">{title}</h2>
      {action}
    </div>
  )
}

function ChildrenSection({ canEdit }: { canEdit: boolean }) {
  const { data: children, isPending, error } = useChildren()
  return (
    <section>
      <SectionTitle
        title="Các con"
        action={
          canEdit && (
            <AppLink to="/con/moi" className="text-sm font-medium text-sky-600">
              + Thêm bé
            </AppLink>
          )
        }
      />
      {error && <ErrorBox error={error} />}
      {isPending ? (
        <Loading />
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {children?.length === 0 && <p className="p-4 text-sm text-slate-500">Chưa có bé nào.</p>}
          {children?.map((c) => (
            <AppLink key={c.id} to={`/con/${c.id}`} className="flex items-center gap-3 p-3">
              <ChildAvatar child={c} size="size-10" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{c.name}</div>
                {(c.school || c.class_name) && (
                  <div className="truncate text-sm text-slate-500">{[c.class_name, c.school].filter(Boolean).join(' · ')}</div>
                )}
              </div>
              <Icon name="next" className="size-4 text-slate-400" />
            </AppLink>
          ))}
        </div>
      )}
    </section>
  )
}

function MembersSection() {
  const userId = useUserId()
  const { isOwner } = useHousehold()
  const { data: members, isPending, error } = useMembers()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [removing, setRemoving] = useState<Member | null>(null)
  const [busy, setBusy] = useState(false)

  async function remove() {
    setBusy(true)
    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('household_id', removing!.household_id)
      .eq('user_id', removing!.user_id)
    setBusy(false)
    if (error) return toast(errorMessage(error), 'error')
    setRemoving(null)
    queryClient.invalidateQueries({ queryKey: ['members'] })
  }

  return (
    <section>
      <SectionTitle title="Thành viên" />
      {error && <ErrorBox error={error} />}
      {isPending ? (
        <Loading />
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {members?.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {m.display_name}
                  {m.user_id === userId && <span className="font-normal text-slate-400"> (bạn)</span>}
                </div>
                <div className="text-sm text-slate-500">{ROLE_LABEL[m.role]}</div>
              </div>
              {isOwner && m.user_id !== userId && (
                <button className="rounded-full p-2 text-rose-500" onClick={() => setRemoving(m)} aria-label={`Xoá ${m.display_name}`}>
                  <Icon name="trash" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {removing && (
        <ConfirmSheet
          title="Xoá thành viên?"
          message={`${removing.display_name} sẽ không xem được lịch của gia đình nữa. Muốn vào lại cần mã mời mới.`}
          confirmLabel="Xoá khỏi gia đình"
          danger
          busy={busy}
          onConfirm={remove}
          onClose={() => setRemoving(null)}
        />
      )}
    </section>
  )
}

function InvitesSection() {
  const { data: invites, isPending, error } = useInvites(true)
  const queryClient = useQueryClient()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function create(role: Role) {
    setBusy(true)
    const { error } = await supabase.rpc('create_invite', { p_role: role })
    setBusy(false)
    if (error) return toast(errorMessage(error), 'error')
    queryClient.invalidateQueries({ queryKey: ['invites'] })
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

  return (
    <section>
      <SectionTitle title="Mời người thân" />
      <p className="mb-3 text-sm text-slate-500">
        Mã mời dùng được <b>1 lần</b>, hết hạn sau <b>7 ngày</b>. Người nhận đăng ký tài khoản rồi nhập mã.
      </p>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button className="btn-primary text-sm" disabled={busy} onClick={() => create('editor')}>
          Mã mời: được sửa
        </button>
        <button className="btn-secondary text-sm" disabled={busy} onClick={() => create('viewer')}>
          Mã mời: chỉ xem
        </button>
      </div>
      {error && <ErrorBox error={error} />}
      {isPending ? (
        <Loading />
      ) : (
        <div className="space-y-2">
          {invites?.map((inv) => (
            <div key={inv.id} className="card flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-2xl font-bold tracking-[0.25em]">{inv.code}</div>
                <div className="text-sm text-slate-500">
                  {ROLE_LABEL[inv.role]} · hết hạn sau {formatDistanceToNowStrict(new Date(inv.expires_at), { locale: vi })}
                </div>
              </div>
              <button className="rounded-full p-2 text-sky-600" onClick={() => share(inv)} aria-label="Chia sẻ mã mời">
                <Icon name="share" />
              </button>
              <button className="rounded-full p-2 text-rose-500" onClick={() => revoke(inv)} aria-label="Huỷ mã mời">
                <Icon name="trash" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function NamesSheet({ onClose }: { onClose: () => void }) {
  const userId = useUserId()
  const { householdId, householdName, displayName, isOwner } = useHousehold()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState(displayName)
  const [family, setFamily] = useState(householdName)
  const [busy, setBusy] = useState(false)

  async function save(close: () => void) {
    if (!name.trim() || !family.trim()) return
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
      close()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Sửa tên" onClose={onClose}>
      {(close) => (
      <div className="space-y-4">
        <label className="block">
          <span className="label">Tên của bạn</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        {isOwner && (
          <label className="block">
            <span className="label">Tên gia đình</span>
            <input className="input" value={family} onChange={(e) => setFamily(e.target.value)} />
          </label>
        )}
        <button className="btn-primary w-full" disabled={busy} onClick={() => save(close)}>
          {busy ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
      )}
    </Sheet>
  )
}
