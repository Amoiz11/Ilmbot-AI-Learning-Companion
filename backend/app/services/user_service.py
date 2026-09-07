import uuid
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import GoogleAuthRequest

def sync_user(db: Session, user_data: GoogleAuthRequest) -> User:
    # Look up user by google_id OR email
    existing_user = db.query(User).filter(
        or_(User.google_id == user_data.google_id, User.email == user_data.email)
    ).first()
    
    if existing_user:
        # Update last_login
        existing_user.last_login = func.now()
        
        # Update name or profile picture if updated from Google
        if user_data.name and existing_user.name != user_data.name:
            existing_user.name = user_data.name
        picture = user_data.picture
        if picture and existing_user.profile_picture != picture:
            existing_user.profile_picture = picture
            
        db.commit()
        db.refresh(existing_user)
        return existing_user

    # Create new user
    new_user = User(
        id=uuid.uuid4(),
        google_id=user_data.google_id,
        name=user_data.name,
        email=user_data.email,
        profile_picture=user_data.picture,
        last_login=func.now()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
