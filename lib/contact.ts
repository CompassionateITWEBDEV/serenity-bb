import { supabase } from "./supabase-browser";

type ContactForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

export async function submitContactForm(form: ContactForm) {
  const { error } = await supabase.from("contact_messages").insert([form]);

  if (error) {
    console.error("❌ Error submitting contact form:", error.message);
    throw new Error(error.message);
  }

  return { success: true };
}
