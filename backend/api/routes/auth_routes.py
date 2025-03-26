from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from ..models.user import UserCreate, UserResponse, TokenResponse, UserInDB
from ..database.mongodb import MongoDB
from datetime import datetime, timedelta
from bson import ObjectId
from ..utils.logger import logger
from ..services.auth_service import AuthService
from ..services.document_service import DocumentService
from ..utils.deps import get_current_user
from jose import jwt
from ..services.file_service import FileService
router = APIRouter()
auth_service = AuthService()

# Create a separate OAuth2 scheme for refresh tokens
refresh_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/refresh", auto_error=True)

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate):
    db = MongoDB.get_db()
    
    # Check if user already exists
    existing_user = db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash the password
    hashed_password = auth_service.get_password_hash(user_data.password)

    print("enable_logging: ", user_data.enable_logging)
    
    # Create new user
    new_user = {
        "email": user_data.email,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow(),
        "requests_used": 0,
        "requests_limit": 100,
        "enable_logging": user_data.enable_logging
    }
    
    result = db.users.insert_one(new_user)
    
    # Get the created user
    created_user = db.users.find_one({"_id": result.inserted_id})
    
    # Format response
    return {
        "id": str(created_user["_id"]),
        "email": created_user["email"],
        "created_at": created_user["created_at"]
    }

@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = auth_service.authenticate_user(form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access and refresh tokens using user ID instead of email
    access_token = auth_service.create_access_token(data={"sub": str(user.id)})
    refresh_token = auth_service.create_access_token(data={"sub": str(user.id)}, expires_delta=timedelta(days=7))
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(token: str = Depends(refresh_scheme)):
    try:
        # Verify the refresh token
        payload = jwt.decode(token, auth_service.SECRET_KEY, algorithms=[auth_service.ALGORITHM])
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Verify that the user still exists
        db = MongoDB.get_db()
        user = db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Create new access and refresh tokens
        access_token = auth_service.create_access_token(data={"sub": user_id})
        new_refresh_token = auth_service.create_access_token(data={"sub": user_id}, expires_delta=timedelta(days=7))
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
        
    except Exception as e:
        logger.error(f"Error refreshing token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.get("/me", response_model=UserResponse)
async def get_user_me(current_user: UserInDB = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "created_at": current_user.created_at,
        "active_chat_id": current_user.active_chat_id,
        "requests_used": current_user.requests_used,
        "requests_limit": current_user.requests_limit,
        "enable_logging": current_user.enable_logging
    }

@router.post("/logout")
async def logout():
    # JWT is stateless, so we don't need to do anything server-side
    # The client should remove both access and refresh tokens from storage
    return {"message": "Successfully logged out"}

@router.post("/set-chat-id")
async def set_chat_id(current_user: UserInDB = Depends(get_current_user)):
    """
    Sets a new chat ID for the current user. Called when dashboard loads or refreshes.
    Also deletes any existing vectors associated with the old chat ID.
    """
    db = MongoDB.get_db()
    document_service = DocumentService()
    file_service = FileService()
    
    # Get the user's current chat_id
    user = db.users.find_one({"_id": ObjectId(current_user.id)})
    old_chat_id = user.get("active_chat_id")
    
    # Delete vectors associated with the old chat_id if it exists
    if old_chat_id:
        try:
            deleted_count = await document_service.delete_vectors_by_chat_id(old_chat_id)
            deleted_files = await file_service.delete_files_by_chat_id(old_chat_id)
            logger.info(f"Deleted {deleted_count} vectors for old chat ID: {old_chat_id}")
            logger.info(f"Deleted {deleted_files} files for old chat ID: {old_chat_id}")
        except Exception as e:
            logger.error(f"Error deleting vectors and files for old chat ID {old_chat_id}: {e}")
            # Continue with the process even if deletion fails
    
    # Generate a simple chat ID using timestamp for uniqueness
    new_chat_id = str(int(datetime.utcnow().timestamp()))
    
    # Update the user's active_chat_id
    db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": {"active_chat_id": new_chat_id}}
    )
    
    return {"active_chat_id": new_chat_id} 