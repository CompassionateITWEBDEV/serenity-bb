import { supabase } from './supabase'

export async function submitContact(form: {
  first_name: string
  last_name: string
  email: string
  phone?: string
  subject: string
  message: string
}) {
  const { error } = await supabase.from('contact_messages').insert([form])
  if (error) {
    console.error('Error submitting contact form:', error.message)
    throw error
  }
}
