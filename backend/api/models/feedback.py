from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class FeedbackType(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"


class FeedbackModel(BaseModel):
    """Model for user feedback on assistant responses"""
    feedback_type: FeedbackType
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    feedback_text: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_id: Optional[str] = None
    message_id: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "feedback_type": "positive",
                "rating": 5,
                "feedback_text": "This response was very helpful!",
                "user_id": "user123",
                "message_id": "msg456"
            }
        } 