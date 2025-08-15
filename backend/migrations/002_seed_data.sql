-- Seed data for Serenity Rehabilitation Center
-- Run this after the initial schema to populate with sample data

-- Insert sample users
INSERT INTO users (email, hashed_password, full_name, role) VALUES
('john.doe@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5e', 'John Doe', 'patient'),
('jane.smith@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5e', 'Jane Smith', 'patient'),
('dr.wilson@serenity.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5e', 'Dr. Sarah Wilson', 'doctor'),
('nurse.johnson@serenity.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5e', 'Michael Johnson', 'nurse'),
('counselor.brown@serenity.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5e', 'Lisa Brown', 'counselor')
ON CONFLICT (email) DO NOTHING;

-- Insert sample patients
INSERT INTO patients (user_id, date_of_birth, phone_number, address, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, treatment_plan, medical_history, allergies) VALUES
(1, '1985-06-15', '(555) 123-4567', '123 Main St, Anytown, ST 12345', 'Jane Doe', '(555) 987-6543', 'Spouse', 'Comprehensive Recovery Program', 'Lead exposure from construction work', 'None known'),
(2, '1990-03-22', '(555) 234-5678', '456 Oak Ave, Somewhere, ST 67890', 'Robert Smith', '(555) 876-5432', 'Father', 'Intensive Therapy Program', 'Childhood lead poisoning', 'Penicillin')
ON CONFLICT DO NOTHING;

-- Insert sample staff
INSERT INTO staff (user_id, staff_type, license_number, department, specialization, phone_number) VALUES
(3, 'doctor', 'MD123456', 'Medical', 'Toxicology and Lead Poisoning Treatment', '(555) 345-6789'),
(4, 'nurse', 'RN789012', 'Nursing', 'Rehabilitation Nursing', '(555) 456-7890'),
(5, 'counselor', 'LPC345678', 'Mental Health', 'Trauma and Recovery Counseling', '(555) 567-8901')
ON CONFLICT DO NOTHING;

-- Insert sample groups
INSERT INTO groups (name, description, group_type, facilitator_id, max_members, meeting_schedule, location) VALUES
('Lead Recovery Support Group', 'Weekly support group for patients recovering from lead poisoning', 'support', 3, 10, 'Wednesdays 2:00 PM', 'Conference Room A'),
('Mindfulness and Healing', 'Meditation and mindfulness practices for recovery', 'therapy', 5, 8, 'Mondays and Fridays 10:00 AM', 'Wellness Center'),
('Family Support Circle', 'Support group for families of patients', 'support', 5, 12, 'Saturdays 1:00 PM', 'Community Room')
ON CONFLICT DO NOTHING;

-- Insert sample group memberships
INSERT INTO group_members (group_id, patient_id, joined_date, status) VALUES
(1, 1, CURRENT_DATE - INTERVAL '30 days', 'active'),
(1, 2, CURRENT_DATE - INTERVAL '15 days', 'active'),
(2, 1, CURRENT_DATE - INTERVAL '20 days', 'active'),
(3, 2, CURRENT_DATE - INTERVAL '10 days', 'active')
ON CONFLICT (group_id, patient_id) DO NOTHING;

-- Insert sample appointments
INSERT INTO appointments (patient_id, staff_id, appointment_type, appointment_date, appointment_time, duration_minutes, status, notes, location) VALUES
(1, 1, 'Medical Consultation', CURRENT_DATE + INTERVAL '1 day', '09:00:00', 60, 'scheduled', 'Follow-up lead level check', 'Medical Office 1'),
(1, 2, 'Nursing Assessment', CURRENT_DATE + INTERVAL '2 days', '14:00:00', 30, 'scheduled', 'Medication review', 'Nursing Station'),
(2, 1, 'Initial Consultation', CURRENT_DATE + INTERVAL '3 days', '10:30:00', 90, 'scheduled', 'New patient intake', 'Medical Office 1'),
(2, 3, 'Counseling Session', CURRENT_DATE + INTERVAL '1 day', '15:00:00', 50, 'scheduled', 'Individual therapy session', 'Counseling Room B')
ON CONFLICT DO NOTHING;

-- Insert sample messages
INSERT INTO messages (sender_id, recipient_id, subject, content, message_type) VALUES
(1, 3, 'Question about medication', 'Hi Dr. Wilson, I have a question about the timing of my chelation therapy. Should I take it with food?', 'general'),
(3, 1, 'Re: Question about medication', 'Hi John, yes, please take your medication with food to reduce stomach irritation. Let me know if you have any other concerns.', 'general'),
(2, 4, 'Appointment reminder', 'Hi, I wanted to confirm my appointment tomorrow at 2 PM for the nursing assessment.', 'appointment'),
(4, 2, 'Re: Appointment reminder', 'Hi Jane, yes your appointment is confirmed for tomorrow at 2 PM. Please bring your current medication list.', 'appointment')
ON CONFLICT DO NOTHING;

-- Insert sample progress tracking data
INSERT INTO progress_tracking (patient_id, metric_name, metric_value, metric_unit, recorded_date, notes) VALUES
(1, 'blood_lead_level', 25.5, 'μg/dL', CURRENT_DATE - INTERVAL '30 days', 'Initial measurement'),
(1, 'blood_lead_level', 18.2, 'μg/dL', CURRENT_DATE - INTERVAL '15 days', 'Showing improvement'),
(1, 'blood_lead_level', 12.8, 'μg/dL', CURRENT_DATE, 'Continued progress'),
(1, 'mood_score', 6.0, 'scale_1_10', CURRENT_DATE - INTERVAL '7 days', 'Feeling better'),
(1, 'mood_score', 7.5, 'scale_1_10', CURRENT_DATE, 'Much improved mood'),
(2, 'blood_lead_level', 32.1, 'μg/dL', CURRENT_DATE - INTERVAL '20 days', 'Initial measurement'),
(2, 'blood_lead_level', 28.7, 'μg/dL', CURRENT_DATE - INTERVAL '10 days', 'Slight improvement'),
(2, 'mood_score', 5.5, 'scale_1_10', CURRENT_DATE - INTERVAL '5 days', 'Moderate mood')
ON CONFLICT DO NOTHING;

-- Insert sample medication logs
INSERT INTO medication_logs (patient_id, medication_name, dosage, frequency, taken_at, notes, effectiveness_rating) VALUES
(1, 'DMSA (Succimer)', '500mg', 'Three times daily', CURRENT_TIMESTAMP - INTERVAL '2 hours', 'Taken with breakfast', 4),
(1, 'Calcium Supplement', '1000mg', 'Twice daily', CURRENT_TIMESTAMP - INTERVAL '6 hours', 'Taken with meals', 4),
(2, 'EDTA Chelation', '1g', 'Daily IV infusion', CURRENT_TIMESTAMP - INTERVAL '1 day', 'Administered at clinic', 5),
(2, 'Vitamin C', '500mg', 'Twice daily', CURRENT_TIMESTAMP - INTERVAL '3 hours', 'Supports chelation therapy', 4)
ON CONFLICT DO NOTHING;

-- Insert sample activity logs
INSERT INTO activity_logs (patient_id, activity_type, activity_name, duration_minutes, intensity_level, mood_before, mood_after, notes, completed_at) VALUES
(1, 'exercise', 'Light Walking', 30, 2, 6, 7, 'Felt energized after walk', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(1, 'therapy', 'Group Therapy Session', 60, 3, 5, 7, 'Good discussion about recovery goals', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(1, 'meditation', 'Mindfulness Practice', 20, 2, 6, 8, 'Very relaxing session', CURRENT_TIMESTAMP - INTERVAL '12 hours'),
(2, 'exercise', 'Yoga Class', 45, 3, 5, 6, 'Enjoyed the gentle movements', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(2, 'social', 'Family Visit', 120, 2, 6, 8, 'Great to see family support', CURRENT_TIMESTAMP - INTERVAL '3 days')
ON CONFLICT DO NOTHING;
