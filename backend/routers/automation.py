from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import asyncio
from ..database import get_db
from ..models import (
    Patient,
    Appointment,
    Reminder,
    ReminderSettings as ReminderSettingsModel,
)
from ..schemas import (
    ReminderCreate,
    ReminderResponse,
    ReminderSettings as ReminderSettingsSchema,
)
from ..auth import get_current_patient

router = APIRouter(prefix="/automation", tags=["automation"])


@router.post("/schedule-reminders")
async def schedule_appointment_reminders(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_patient: Patient = Depends(get_current_patient),
):
    """Schedule automated reminders for upcoming appointments"""

    # Get upcoming appointments for the patient
    upcoming_appointments = (
        db.query(Appointment)
        .filter(
            Appointment.patient_id == current_patient.id,
            Appointment.scheduled_datetime >= datetime.now(),
        )
        .all()
    )

    scheduled_count = 0

    for appointment in upcoming_appointments:
        # Get patient's reminder settings
        settings = get_reminder_settings(db, current_patient.id)

        for days_before in settings.days_before:
            reminder_date = (
                appointment.scheduled_datetime - timedelta(days=days_before)
            ).date()
            reminder_datetime = datetime.combine(
                reminder_date, datetime.strptime(settings.time_of_day, "%H:%M").time()
            )

            # Only schedule future reminders
            if reminder_datetime > datetime.now():
                # Schedule email reminder
                if settings.email_enabled:
                    background_tasks.add_task(
                        schedule_email_reminder,
                        appointment.id,
                        current_patient.email,
                        reminder_datetime,
                    )

                # Schedule SMS reminder
                if settings.sms_enabled:
                    background_tasks.add_task(
                        schedule_sms_reminder,
                        appointment.id,
                        current_patient.phone,
                        reminder_datetime,
                    )

                scheduled_count += 1

    return {"message": f"Scheduled {scheduled_count} automated reminders"}


@router.get("/reminders", response_model=List[ReminderResponse])
async def get_active_reminders(
    db: Session = Depends(get_db),
    current_patient: Patient = Depends(get_current_patient),
):
    """Get all active reminders for the current patient"""
    reminders = (
        db.query(Reminder)
        .filter(
            Reminder.patient_id == current_patient.id, Reminder.status == "scheduled"
        )
        .all()
    )

    return reminders


@router.post("/reminders/settings")
async def update_reminder_settings(
    settings: ReminderSettingsSchema,
    db: Session = Depends(get_db),
    current_patient: Patient = Depends(get_current_patient),
):
    """Update patient's reminder preferences"""

    # Update or create reminder settings
    existing_settings = (
        db.query(ReminderSettingsModel)
        .filter(ReminderSettingsModel.patient_id == current_patient.id)
        .first()
    )

    if existing_settings:
        for key, value in settings.dict().items():
            setattr(existing_settings, key, value)
    else:
        new_settings = ReminderSettingsModel(
            patient_id=current_patient.id, **settings.dict()
        )
        db.add(new_settings)

    db.commit()
    return {"message": "Reminder settings updated successfully"}


async def schedule_email_reminder(appointment_id: int, email: str, send_time: datetime):
    """Background task to send email reminder"""
    # Calculate delay until send time
    delay = (send_time - datetime.now()).total_seconds()

    if delay > 0:
        await asyncio.sleep(delay)

        # Send email reminder logic here
        print(f"Sending email reminder to {email} for appointment {appointment_id}")

        # Update reminder status in database
        # db.query(Reminder).filter(Reminder.appointment_id == appointment_id).update({"status": "sent"})


async def schedule_sms_reminder(appointment_id: int, phone: str, send_time: datetime):
    """Background task to send SMS reminder"""
    delay = (send_time - datetime.now()).total_seconds()

    if delay > 0:
        await asyncio.sleep(delay)

        # Send SMS reminder logic here
        print(f"Sending SMS reminder to {phone} for appointment {appointment_id}")


def get_reminder_settings(db: Session, patient_id: int):
    """Get patient's reminder settings with defaults"""
    settings = (
        db.query(ReminderSettingsModel)
        .filter(ReminderSettingsModel.patient_id == patient_id)
        .first()
    )

    if not settings:
        # Return default settings
        return ReminderSettingsModel(
            patient_id=patient_id,
            email_enabled=True,
            sms_enabled=True,
            push_enabled=True,
            days_before=[1, 3],
            time_of_day="09:00",
        )

    return settings
