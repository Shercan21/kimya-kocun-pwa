
import { useState } from 'react'

type StudyPreferencesData = {
  dailyMinutes: number
  days: number[]
  goal: string
}

const STORAGE_KEY = 'kimya-kocun-pwa-study-preferences'

const DAYS = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
]

const DEFAULT_PREFERENCES: StudyPreferencesData = {
  dailyMinutes: 45,
  days: [0, 1, 2, 3, 4],
  goal: 'school',
}

function loadPreferences(): StudyPreferencesData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (!saved) return DEFAULT_PREFERENCES

    const parsed: unknown = JSON.parse(saved)

    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_PREFERENCES
    }

    const data = parsed as Partial<StudyPreferencesData>

    return {
      dailyMinutes:
        typeof data.dailyMinutes === 'number' &&
        [20, 30, 45, 60, 90].includes(data.dailyMinutes)
          ? data.dailyMinutes
          : 45,
      days: Array.isArray(data.days)
        ? [...new Set(data.days.filter(
            (day): day is number =>
              Number.isInteger(day) && day >= 0 && day <= 6
          ))].sort((a, b) => a - b)
        : [0, 1, 2, 3, 4],
      goal: typeof data.goal === 'string' &&
        ['school', 'exam', 'tyt', 'review'].includes(data.goal)
          ? data.goal
          : 'school',
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export default function StudyPreferences() {
  const [preferences, setPreferences] =
    useState<StudyPreferencesData>(loadPreferences)

  const [saved, setSaved] = useState(false)

  function update(
    changes: Partial<StudyPreferencesData>
  ) {
    setPreferences(previous => ({
      ...previous,
      ...changes,
    }))
    setSaved(false)
  }

  function toggleDay(day: number) {
    const days = preferences.days.includes(day)
      ? preferences.days.filter(item => item !== day)
      : [...preferences.days, day].sort((a, b) => a - b)

    update({ days })
  }

  function save() {
    if (preferences.days.length === 0) return

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(preferences)
      )
      setSaved(true)
    } catch {
      window.alert('Tercihler kaydedilemedi.')
    }
  }

  const weeklyMinutes =
    preferences.days.length * preferences.dailyMinutes

  return (
    <section
      className="dashboard-card"
      style={{ marginBottom: 24 }}
    >
      <div className="card-icon">⚙️</div>
      <h2>Akıllı Çalışma Tercihlerim</h2>

      <p>
        Kimya Koçun'un sana uygun bir çalışma programı
        hazırlayabilmesi için tercihlerini belirle.
      </p>

      <h3>⏱️ Günlük Çalışma Sürem</h3>

      <select
        value={preferences.dailyMinutes}
        onChange={event =>
          update({
            dailyMinutes: Number(event.target.value),
          })
        }
        aria-label="Günlük çalışma süresi"
        style={{
          padding: 12,
          borderRadius: 10,
          border: '1px solid #d9d2ec',
          width: '100%',
          maxWidth: 300,
        }}
      >
        {[20, 30, 45, 60, 90].map(minutes => (
          <option key={minutes} value={minutes}>
            {minutes} dakika
          </option>
        ))}
      </select>

      <h3 style={{ marginTop: 24 }}>
        📅 Çalışabileceğim Günler
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns:
          'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12,
      }}>
        {DAYS.map((day, index) => (
          <label
            key={day}
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              padding: 12,
              background: preferences.days.includes(index)
                ? '#e8f7f4'
                : '#f3f0ff',
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={preferences.days.includes(index)}
              onChange={() => toggleDay(index)}
            />
            {day}
          </label>
        ))}
      </div>

      <h3 style={{ marginTop: 24 }}>
        🎯 Çalışma Amacım
      </h3>

      <select
        value={preferences.goal}
        onChange={event =>
          update({ goal: event.target.value })
        }
        aria-label="Çalışma amacı"
        style={{
          padding: 12,
          borderRadius: 10,
          border: '1px solid #d9d2ec',
          width: '100%',
          maxWidth: 400,
        }}
      >
        <option value="school">
          Okul derslerimi takip etmek
        </option>
        <option value="exam">
          Yazılı sınavlara hazırlanmak
        </option>
        <option value="tyt">
          TYT / AYT hazırlığı
        </option>
        <option value="review">
          Eksiklerimi tamamlamak
        </option>
      </select>

      <div style={{
        background: '#f3f0ff',
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
      }}>
        <h3>📊 Haftalık Çalışma Planım</h3>

        <p>
          Haftada {preferences.days.length} gün
        </p>
        <p>
          Günlük {preferences.dailyMinutes} dakika
        </p>
        <strong>
          Toplam {Math.floor(weeklyMinutes / 60)} saat{' '}
          {weeklyMinutes % 60} dakika
        </strong>
      </div>

      <button
        type="button"
        className="primary-button"
        onClick={save}
        disabled={preferences.days.length === 0}
        style={{ marginTop: 20 }}
      >
        💾 Tercihlerimi Kaydet
      </button>

      {preferences.days.length === 0 && (
        <p style={{ color: '#b45309' }}>
          En az bir çalışma günü seçmelisin.
        </p>
      )}

      {saved && (
        <p style={{
          color: '#16877d',
          fontWeight: 700,
        }}>
          ✓ Çalışma tercihlerin kaydedildi.
        </p>
      )}
    </section>
  )
}
