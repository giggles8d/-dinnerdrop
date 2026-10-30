import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import EditRecipeForm from './EditRecipeForm'

export const dynamic = 'force-dynamic'

/** Edit a recipe this family added (imports often need a fix). */
export default async function EditRecipePage({ params }: { params: { slug: string } }) {
  const sb = createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/recipes/${params.slug}/edit`)}`)
  const { data: r } = await sb.from('recipes').select('id, name, slug, cook_time, prep_time, servings, ingredients, steps, source, created_by').eq('slug', params.slug).maybeSingle()
  if (!r) notFound()
  if (r.source !== 'user' || r.created_by !== user.id) redirect(`/recipes/${params.slug}`)
  return <EditRecipeForm initial={r} />
}
