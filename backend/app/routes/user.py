import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.schemas.quiz import UserAnalyticsResponse
from app.services.quiz_service import get_user_analytics
from app.routes.auth_deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.get("/me/analytics", response_model=UserAnalyticsResponse)
def read_user_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_user_analytics(db=db, user_id=current_user.id)
