// src/app/account/settings/SettingsForm.tsx
'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '@/app/providers'
import type { SubmitHandler } from 'react-hook-form'

/** Helper: convert YYYY-MM-DD -> ISO with timezone (backend-safe) */
function toISODateZ(d?: string) {
  return d && d.length ? new Date(`${d}T00:00:00Z`).toISOString() : undefined
}

const FormSchema = z.object({
  displayName: z.string().min(1).max(80),
  handle: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9_]+$/i, 'letters/numbers/_ only'),

  // multi-profession array
  professions: z.array(z.string().min(1)).max(10).default([]),

  accountType: z.enum(['PERSONAL', 'COMPANY']),
  portfolioUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined)),
  bio: z
    .string()
    .max(280)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined)),

  city: z
    .string()
    .max(80)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined)),
  region: z
    .string()
    .max(80)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined)),

  servicesEnabled: z.boolean().default(true),
  acceptsBriefs: z.boolean().default(false),
  acceptsDMs: z.boolean().default(true),
  showCityPublicly: z.boolean().default(true),
  showRatesPublicly: z.boolean().default(false),

  currentWorkCity: z
    .string()
    .max(80)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined)),

  // keep as YYYY-MM-DD in the form; convert to ISO on submit
  currentWorkUntil: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined)),
})

type FormValues = z.infer<typeof FormSchema>

export default function SettingsForm() {
  const utils = api.useUtils()
  const { data, isLoading, error } = api.profile.me.useQuery()

  const mutation = api.profile.update.useMutation({
    onSuccess: async () => {
      await utils.profile.me.invalidate()
      alert('Saved!')
    },
  })

  // local text input for professions (comma-separated)
  const [professionsText, setProfessionsText] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      professions: [],
      accountType: 'PERSONAL',
      servicesEnabled: true,
      acceptsBriefs: false,
      acceptsDMs: true,
      showCityPublicly: true,
      showRatesPublicly: false,
    },
  })

  // seed form from profile
  useEffect(() => {
    if (!data) return

    // Safely build professions array without typing “never”
    const profArray: string[] = Array.isArray((data as any).professions) && (data as any).professions.length
      ? ((data as any).professions as string[])
      : (data.profession ? [data.profession] : [])

    setProfessionsText(profArray.join(', '))

    reset({
      displayName: data.displayName ?? '',
      handle: data.handle ?? '',
      professions: profArray,
      accountType: (data.accountType ?? 'PERSONAL') as 'PERSONAL' | 'COMPANY',
      portfolioUrl: data.portfolioUrl ?? '',
      bio: data.bio ?? '',
      city: data.city ?? '',
      region: data.region ?? '',
      servicesEnabled: data.servicesEnabled,
      acceptsBriefs: data.acceptsBriefs,
      acceptsDMs: data.acceptsDMs,
      showCityPublicly: data.showCityPublicly,
      showRatesPublicly: data.showRatesPublicly,
      currentWorkCity: data.currentWorkCity ?? '',
      currentWorkUntil: data.currentWorkUntil
        ? new Date(data.currentWorkUntil).toISOString().slice(0, 10) // YYYY-MM-DD for the <input type="date">
        : '',
    })
  }, [data, reset])

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
  await mutation.mutateAsync({
    ...values,
    currentWorkUntil: toISODateZ(values.currentWorkUntil),
  })
}

  if (isLoading) return <p>Loading…</p>
  if (error) return <p className="text-red-600">Error: {String((error as any)?.message || 'failed to load')}</p>

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Display name */}
      <div>
        <label className="block text-sm font-medium">Display name</label>
        <input className="mt-1 w-full border rounded px-3 py-2" {...register('displayName')} />
        {errors.displayName && <p className="text-red-600 text-sm">{errors.displayName.message}</p>}
      </div>

      {/* Handle */}
      <div>
        <label className="block text-sm font-medium">Handle</label>
        <input className="mt-1 w-full border rounded px-3 py-2" {...register('handle')} />
        <p className="text-xs text-gray-500">Lowercase letters/numbers/underscore. Shown as @handle.</p>
        {errors.handle && <p className="text-red-600 text-sm">{errors.handle.message}</p>}
      </div>

      {/* Account type */}
      <div>
        <label className="block text-sm font-medium">Account type</label>
        <div className="mt-1 flex gap-4">
          <label className="inline-flex items-center gap-2">
            <input type="radio" value="PERSONAL" {...register('accountType')} />
            <span>Personal</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" value="COMPANY" {...register('accountType')} />
            <span>Company</span>
          </label>
        </div>
        {errors.accountType && <p className="text-red-600 text-sm">{String(errors.accountType.message)}</p>}
      </div>

      {/* Professions (comma separated) */}
      <div>
        <label className="block text-sm font-medium">Professions (comma-separated)</label>
        <input
          className="mt-1 w-full border rounded px-3 py-2"
          value={professionsText}
          onChange={(e) => {
            const text = e.currentTarget.value
            setProfessionsText(text)
            const arr = text.split(',').map((s) => s.trim()).filter(Boolean)
            // Explicit string[] to avoid “never” issues
            setValue('professions', arr as string[], { shouldValidate: true })
          }}
        />
        {errors.professions && <p className="text-red-600 text-sm">Please provide up to 10 professions.</p>}
      </div>

      {/* Short description */}
      <div>
        <label className="block text-sm font-medium">Short description</label>
        <textarea className="mt-1 w-full border rounded px-3 py-2" maxLength={280} {...register('bio')} />
      </div>

      {/* Portfolio URL */}
      <div>
        <label className="block text-sm font-medium">Portfolio URL (for “SHOWREEL” button)</label>
        <input className="mt-1 w-full border rounded px-3 py-2" type="url" placeholder="https://…" {...register('portfolioUrl')} />
        {errors.portfolioUrl && <p className="text-red-600 text-sm">Enter a valid URL.</p>}
      </div>

      {/* Location / availability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">City</label>
          <input className="mt-1 w-full border rounded px-3 py-2" {...register('city')} />
        </div>
        <div>
          <label className="block text-sm font-medium">Region / State / Province</label>
          <input className="mt-1 w-full border rounded px-3 py-2" {...register('region')} />
        </div>
        <div>
          <label className="block text-sm font-medium">Working in (city)</label>
          <input className="mt-1 w-full border rounded px-3 py-2" {...register('currentWorkCity')} />
        </div>
        <div>
          <label className="block text-sm font-medium">Until (date)</label>
          <input type="date" className="mt-1 w-full border rounded px-3 py-2" {...register('currentWorkUntil')} />
        </div>
      </div>

      {/* Flags */}
      <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('servicesEnabled')} /> Services enabled
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('acceptsBriefs')} /> Accept briefs
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('acceptsDMs')} /> Accept DMs
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('showCityPublicly')} /> Show city publicly
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('showRatesPublicly')} /> Show price ranges publicly
        </label>
      </fieldset>

      <button disabled={isSubmitting} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
        {isSubmitting ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  )
}
