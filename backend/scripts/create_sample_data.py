from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
from auth import get_password_hash
from datetime import datetime, timedelta
from typing import List

def create_sample_data() -> None:
    """Create sample data for testing."""
    db: Session = SessionLocal()
    
    try:
        # Create sample users
        created_users: List[models.User] = []
        users_data = [
            {
                "email": "john.doe@email.com",
                "password": "password123",
                "first_name": "John",
                "last_name": "Doe",
                "role": models.UserRole.PATIENT,
                "phone": "555-0101"
            },
            {
                "email": "dr.smith@serenity.com",
                "password": "doctor123",
                "first_name": "Sarah",
                "last_name": "Smith",
                "role": models.UserRole.DOCTOR,
                "phone": "555-0201"
            },
            {
                "email": "nurse.johnson@serenity.com",
                "password": "nurse123",
                "first_name": "Mike",
                "last_name": "Johnson",
                "role": models.UserRole.NURSE,
                "phone": "555-0301"
            },
            {
                "email": "counselor.brown@serenity.com",
                "password": "counselor123",
                "first_name": "Lisa",
                "last_name": "Brown",
                "role": models.UserRole.COUNSELOR,
                "phone": "555-0401"
            }
        ]
        
        for user_data in users_data:
            # Check if user already exists
            existing_user = db.query(models.User).filter(models.User.email == user_data["email"]).first()
            if existing_user:
                created_users.append(existing_user)
                continue
                
            db_user = models.User(
                email=user_data["email"],
                hashed_password=get_password_hash(user_data["password"]),
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                phone=user_data["phone"],
                role=user_data["role"]
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            created_users.append(db_user)
            
            # Create patient or staff profile
            user_role: models.UserRole = db_user.role  # type: ignore
            if user_role == models.UserRole.PATIENT:
                patient_id = f"PAT{db_user.id:06d}"
                db_patient = models.Patient(
                    user_id=db_user.id,
                    patient_id=patient_id,
                    admission_date=datetime.now() - timedelta(days=30)
                )
                db.add(db_patient)
            else:
                staff_id = f"STF{db_user.id:06d}"
                db_staff = models.Staff(
                    user_id=db_user.id,
                    staff_id=staff_id,
                    department="Rehabilitation",
                    specialization=db_user.role.value.title()
                )
                db.add(db_staff)
        
        db.commit()
        
        # Create sample groups
        group_data = [
            {
                "name": "Morning Support Group",
                "description": "Daily morning support group for patients",
                "group_type": "support_group"
            },
            {
                "name": "Therapy Group A",
                "description": "Group therapy sessions",
                "group_type": "therapy_group"
            }
        ]
        
        for group_info in group_data:
            existing_group = db.query(models.Group).filter(models.Group.name == group_info["name"]).first()
            if existing_group:
                continue
                
            db_group = models.Group(
                name=group_info["name"],
                description=group_info["description"],
                group_type=group_info["group_type"],
                created_by=created_users[1].id  # Created by doctor
            )
            db.add(db_group)
            db.commit()
            db.refresh(db_group)
            
            # Add members to group
            for user in created_users:
                user_role: models.UserRole = user.role  # type: ignore
                db_member = models.GroupMember(
                    group_id=db_group.id,
                    user_id=user.id,
                    is_moderator=(user_role in [models.UserRole.DOCTOR, models.UserRole.COUNSELOR])
                )
                db.add(db_member)
        
        db.commit()
        print("Sample data created successfully!")
        
    except Exception as e:
        print(f"Error creating sample data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_data()
