import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, OperationalError

from app.database.connection import get_db
from app.schemas.user import GoogleAuthRequest, UserResponse
from app.services.user_service import sync_user

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/google", response_model=UserResponse)
def google_auth_endpoint(user_data: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        user = sync_user(db, user_data)
        return UserResponse.model_validate(user)
    except (OperationalError, SQLAlchemyError) as db_err:
        logger.error("Database connection error during Google auth: %s", db_err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to connect to server. Please try again."
        )
    except Exception as err:
        logger.error("Unexpected error during Google auth: %s", err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Account setup failed. Please try again."
        )
