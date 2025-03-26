from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any
from bson import ObjectId
from pymongo.errors import PyMongoError

from ..utils.deps import get_current_user
from ..database.mongodb import MongoDB
from ..models.user import UserInDB
from ..utils.logger import logger

router = APIRouter(prefix="/api", tags=["logging"])

class LoggingUpdateRequest(BaseModel):
    logging_enabled: bool


@router.get("/get_logging", response_model=Dict[str, bool])
async def get_logging_status(
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get the current logging status for the authenticated user
    """
    try:
        logger.info(f"Getting logging status for user: {current_user.email}")
        return {"logging_enabled": current_user.enable_logging}
    except Exception as e:
        logger.error(f"Failed to get logging status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get logging status: {str(e)}"
        )


@router.post("/update_logging", response_model=Dict[str, Any])
async def update_logging_status(
    request: LoggingUpdateRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Update the logging preference for the authenticated user
    """
    try:
        # Get database connection
        db = MongoDB.get_db()
        
        logger.info(f"Updating logging status for user {current_user.email} to {request.logging_enabled}")
        
        # Update the user's logging preference using synchronous methods
        result = db.users.update_one(
            {"_id": ObjectId(current_user.id)},
            {"$set": {"enable_logging": request.logging_enabled}}
        )
        
        if result.modified_count == 0:
            logger.warning(f"User not found or update failed for {current_user.email}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found or update failed"
            )
        
        logger.info(f"Successfully updated logging status for {current_user.email}")
        return {
            "success": True,
            "logging_enabled": request.logging_enabled,
            "message": f"Logging {'enabled' if request.logging_enabled else 'disabled'} successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update logging preference: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update logging preference: {str(e)}"
        ) 