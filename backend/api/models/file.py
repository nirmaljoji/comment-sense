from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class FileModel(BaseModel):
    filename: str
    mime_type: str
    size: int
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    file_id: str