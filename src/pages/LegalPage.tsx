import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { documentTextOutline, shieldCheckmarkOutline } from 'ionicons/icons'
import { PageHeader } from '../components/Page'
import { CONTACT_EMAIL, LEGAL_INTRO, LEGAL_SECTIONS, LEGAL_TITLE, LEGAL_UPDATED, type LegalDoc } from '../lib/legal'

const ICON: Record<LegalDoc, string> = { terms: documentTextOutline, privacy: shieldCheckmarkOutline }

/** Pushed from the Gia đình tab. */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <IonPage>
      <PageHeader title="Gia đình" backTo="/tabs/gia-dinh" />
      <IonContent>
        <LegalBody doc={doc} />
      </IonContent>
    </IonPage>
  )
}

/** Full-screen sheet for the login screen, which sits outside the router. */
export function LegalModal({ doc, onClose }: { doc: LegalDoc | null; onClose: () => void }) {
  return (
    <IonModal isOpen={doc !== null} onDidDismiss={onClose}>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>{doc && LEGAL_TITLE[doc]}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} className="font-semibold">
              Xong
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>{doc && <LegalBody doc={doc} />}</IonContent>
    </IonModal>
  )
}

function LegalBody({ doc }: { doc: LegalDoc }) {
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pt-2 pb-12">
      <div className="flex items-center gap-3.5 pt-1">
        <span className="flex size-13 shrink-0 items-center justify-center rounded-full bg-(--app-track) text-[24px] text-(--ion-color-primary)">
          <IonIcon icon={ICON[doc]} />
        </span>
        <div className="min-w-0">
          <h1 className="text-[1.5rem] leading-tight font-bold">{LEGAL_TITLE[doc]}</h1>
          <p className="text-muted text-[13px]">Cập nhật ngày {LEGAL_UPDATED}</p>
        </div>
      </div>

      <p className="text-[15px] leading-relaxed">{LEGAL_INTRO[doc]}</p>

      {LEGAL_SECTIONS[doc].map((s) => (
        <section key={s.title} className="card space-y-2 px-4 py-3.5">
          <h2 className="text-[16px] font-semibold">{s.title}</h2>
          {s.bullets && (
            <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed marker:text-(--ion-color-primary)">
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          {s.paragraphs?.map((p) => (
            <p key={p} className="text-[14px] leading-relaxed">
              {p}
            </p>
          ))}
        </section>
      ))}

      <p className="text-muted px-2 text-center text-[13px] leading-relaxed">
        Mọi thắc mắc hoặc yêu cầu về dữ liệu, vui lòng liên hệ quản trị viên ứng dụng
        {CONTACT_EMAIL ? (
          <>
            {' '}
            qua{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-(--ion-color-primary)">
              {CONTACT_EMAIL}
            </a>
          </>
        ) : null}
        .
      </p>
    </div>
  )
}
