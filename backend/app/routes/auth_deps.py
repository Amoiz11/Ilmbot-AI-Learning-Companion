import os
import logging
from fastapi import Depends, HTTPException, Header, status
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "564885369367-v9kp8rp2go4gt5tarp3jsul37j3aurk4.apps.googleusercontent.com")

def verify_token_get_google_id(token: str) -> str:
    try:
        id_info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
        google_id = id_info.get("sub")
        if google_id:
            return google_id
    except Exception as err:
        logger.warning("Google ID token verification failed: %s", err)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired Google authentication token."
    )

def get_current_user(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db)
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header."
        )
    
    token = authorization.split("Bearer ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty bearer token."
        )

    google_id = verify_token_get_google_id(token)

    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User record not found in database."
        )
    return user
